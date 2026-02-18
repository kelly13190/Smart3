from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.users import User
from app.models.face import FaceEmbedding
from app.models.attendance import Attendance, ClassSession, AttendanceStatus
from pydantic import BaseModel
from deepface import DeepFace
import numpy as np
import base64
import io
from PIL import Image
from datetime import datetime

router = APIRouter()


# Schema รับข้อมูล
class CheckInRequest(BaseModel):
    session_id: int
    image: str


def base64_to_image(base64_string):
    if "base64," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data)).convert("RGB")


def calculate_cosine_similarity(v1, v2):
    # คำนวณความเหมือน (Cosine Similarity)
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    return dot_product / (norm_v1 * norm_v2)


@router.post("/attendance/recognize")
async def recognize_student(req: CheckInRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. เช็ค Session
        session = await db.get(ClassSession, req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. แปลงรูปเป็น Vector โดยใช้ DeepFace (ArcFace)
        # หมายเหตุ: ต้องใช้ Model เดียวกับตอนลงทะเบียน
        input_image_np = np.array(base64_to_image(req.image))

        try:
            embedding_objs = DeepFace.represent(
                img_path=input_image_np,
                model_name="ArcFace",
                detector_backend="mtcnn",  # หรือ opencv ให้ตรงกับ register
                enforce_detection=False,
                align=True,
            )
            input_vector = embedding_objs[0]["embedding"]
        except:
            return {"status": "unknown", "message": "No face detected by Backend"}

        # 3. ดึง Vector ของนักเรียนทุกคนจาก DB มาเทียบ
        # (ใน Production จริงควรใช้ Vector DB เช่น pgvector แต่ตอนนี้ทำ Loop ธรรมดาไปก่อน)
        result = await db.execute(select(FaceEmbedding))
        all_faces = result.scalars().all()

        best_match_user_id = None
        highest_similarity = -1
        THRESHOLD = 0.25  # ค่าความเหมือนขั้นต่ำ (ปรับได้ 0.0 - 1.0) ยิ่งเยอะยิ่งเข้ม

        for face in all_faces:
            # แปลง Vector ใน DB กลับเป็น Numpy Array
            db_vector = np.array(face.embedding_vector)  # สมมติว่าเก็บเป็น List/Array

            # คำนวณความเหมือน
            similarity = calculate_cosine_similarity(input_vector, db_vector)

            if similarity > highest_similarity:
                highest_similarity = similarity
                best_match_user_id = face.user_id

        # 4. ตรวจสอบผลลัพธ์
        if best_match_user_id and highest_similarity > THRESHOLD:
            # เจอตัวแล้ว! ดึงข้อมูลนักเรียน
            student = await db.get(User, best_match_user_id)

            if not student:
                return {
                    "status": "error",
                    "message": "User found in Face DB but not in User DB",
                }

            # 5. บันทึกการเข้าเรียน (Attendance)
            # เช็คก่อนว่าเช็คชื่อไปหรือยัง
            existing_att = await db.execute(
                select(Attendance).where(
                    Attendance.session_id == req.session_id,
                    Attendance.user_id == student.id,
                )
            )
            if not existing_att.scalars().first():
                new_att = Attendance(
                    user_id=student.id,
                    session_id=req.session_id,
                    status=AttendanceStatus.PRESENT,
                    timestamp=datetime.now(),
                    confidence_score=float(highest_similarity * 100),
                )
                db.add(new_att)
                await db.commit()

            return {
                "status": "detected",
                "student": {
                    "id": student.id,
                    "name": student.full_name,
                    "student_id": getattr(student, "student_id", ""),
                    "confidence": round(highest_similarity * 100, 2),
                },
            }
        else:
            return {"status": "unknown", "message": "Face not recognized"}

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}
