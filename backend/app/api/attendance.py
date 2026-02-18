# backend/app/api/attendance.py

import face_recognition
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.core.database import get_db
from app.models.attendance import Attendance, ClassSession, AttendanceStatus
from app.models.course import Course, Enrollment
from app.models.users import User
from app.utils.face_ai import (
    get_face_encoding_from_base64,
    base64_to_image,
)  # Import ฟังก์ชันที่เราเพิ่งสร้าง
from pydantic import BaseModel

router = APIRouter()


class RecognitionRequest(BaseModel):
    session_id: int
    image: str


@router.post("/attendance/recognize")
async def recognize_and_record(
    req: RecognitionRequest, db: AsyncSession = Depends(get_db)
):
    # 1. เช็ค Session ว่า Active ไหม
    session_result = await db.execute(
        select(ClassSession)
        .options(
            selectinload(ClassSession.course)
        )  # Load Course เพื่อเอา ID ไปหา Enrollment
        .where(ClassSession.id == req.session_id)
    )
    session = session_result.scalars().first()

    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session is not active")

    # 2. 🔥 AI Process: แปลงภาพจากกล้อง Live เป็น Encoding
    unknown_encoding = get_face_encoding_from_base64(req.image)
    if unknown_encoding is None:
        return {"status": "retry", "message": "No face detected"}

    # 3. 🧠 Optimization: ดึงเฉพาะนักเรียนที่ลงทะเบียน (Enroll) ในวิชานี้มาเทียบ
    # (อย่าเทียบกับทั้งมหาลัย มันช้าและอาจผิดพลาด)
    enrollments_query = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.student))  # Load User Data
        .where(Enrollment.course_id == session.course_id)
    )
    enrollments = enrollments_query.scalars().all()

    found_student = None
    best_match_confidence = 0.0

    # 4. วนลูปเทียบหน้า (Loop Matching)
    # *คำแนะนำ: ใน Production จริง ควร cache encoding ของนักเรียนไว้ตอนเปิด Server ไม่ควรโหลดไฟล์รูปทุกครั้งที่เทียบ*

    known_encodings = []
    known_students = []

    for enrollment in enrollments:
        student = enrollment.student
        if student.profile_image:  # สมมติว่าเก็บ path รูปไว้
            try:
                # โหลดรูปนักเรียนที่ลงทะเบียนไว้
                # (นี่เป็นแบบง่าย ในระบบจริงควรเก็บ Encoding ลง DB เลย ไม่ใช่เก็บรูป)
                student_image = face_recognition.load_image_file(student.profile_image)
                student_encoding = face_recognition.face_encodings(student_image)[0]

                known_encodings.append(student_encoding)
                known_students.append(student)
            except Exception as e:
                print(f"Error loading face for {student.username}: {e}")
                continue

    if not known_encodings:
        return {
            "status": "error",
            "message": "No enrolled students with registered faces",
        }

    # ใช้ฟังก์ชัน compare ของ library (Tolerance 0.5-0.6 ยิ่งน้อยยิ่งแม่นแต่ติดยาก)
    face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)
    best_match_index = np.argmin(face_distances)  # หาคนที่หน้าเหมือนที่สุด (distance น้อยสุด)

    # 0.6 คือค่ามาตรฐาน (ต่ำกว่า 0.6 = ใช่คนเดียวกัน)
    if face_distances[best_match_index] < 0.5:
        found_student = known_students[best_match_index]
        # แปลง distance เป็น confidence % แบบคร่าวๆ
        best_match_confidence = round((1 - face_distances[best_match_index]) * 100, 2)

    if not found_student:
        return {"status": "unknown", "message": "Face not recognized in this class"}

    # 5. เจอตัวแล้ว! บันทึกลงฐานข้อมูล (Logic เดิม)
    existing_check = await db.execute(
        select(Attendance).where(
            Attendance.session_id == req.session_id,
            Attendance.student_id == found_student.id,
        )
    )
    existing_record = existing_check.scalars().first()

    student_data = {
        "id": found_student.id,
        "student_id": found_student.username,
        "name": found_student.full_name or found_student.username,
        "confidence": best_match_confidence,
    }

    if existing_record:
        return {
            "status": "detected",
            "message": "Already recorded",
            "student": student_data,
        }

    # Insert New Attendance
    new_attendance = Attendance(
        session_id=req.session_id,
        student_id=found_student.id,
        status=AttendanceStatus.PRESENT,
        timestamp=datetime.now(),
        confidence_score=int(best_match_confidence),
    )

    db.add(new_attendance)
    await db.commit()
    await db.refresh(new_attendance)

    return {
        "status": "detected",
        "message": "Recorded successfully",
        "student": student_data,
    }
