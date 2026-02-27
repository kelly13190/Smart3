# backend/app/api/face_register.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.users import User

from app.core.security import get_current_user
from app.models.users import User
from app.models.face import FaceEmbedding
from pydantic import BaseModel
from deepface import DeepFace
import numpy as np
import base64
import io
from PIL import Image
import os

router = APIRouter()


# --- Schema รับรูปภาพ Base64 ---
class FaceRegisterRequest(BaseModel):
    image: str  # Base64 string


# --- Helper: แปลง Base64 เป็นรูปภาพ ---
def base64_to_image(base64_string):
    if "base64," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    # แปลงเป็น RGB และเป็น numpy array ที่ DeepFace ชอบ
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    return np.array(image)


# --- API: ลงทะเบียนใบหน้า ---
@router.post("/student/register-face")
async def register_face(
    req: FaceRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. แปลงภาพ
        img_array = base64_to_image(req.image)

        # 2. ใช้ DeepFace สร้าง Embedding (ArcFace + OpenCV)
        embedding_objs = DeepFace.represent(
            img_path=img_array,
            model_name="ArcFace",
            detector_backend="opencv", 
            enforce_detection=True,  
            align=True,
        )

        if not embedding_objs:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพ")

        # เอา Embedding ของหน้าแรกที่เจอ
        face_vector = embedding_objs[0]["embedding"]

        # 3. เช็คว่า User นี้เคยลงทะเบียนหรือยัง?
        result = await db.execute(
            select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.id)
        )
        existing_face = result.scalars().first()

        if existing_face:
            # ถ้ามีแล้ว -> อัปเดตข้อมูลใหม่ (Re-register)
            existing_face.embedding_vector = face_vector
            # existing_face.image_path = "path/to/save/image.jpg" # (Optional: ถ้าจะเซฟไฟล์รูปด้วย)
            message = "อัปเดตข้อมูลใบหน้าเรียบร้อยแล้ว"
        else:
            # ถ้ายังไม่มี -> สร้างใหม่
            new_face = FaceEmbedding(
                user_id=current_user.id,
                embedding_vector=face_vector,
                model_name="ArcFace",
            )
            db.add(new_face)
            message = "ลงทะเบียนใบหน้าสำเร็จ"

        await db.commit()
        return {"status": "success", "message": message}

    except ValueError as e:
        # DeepFace หาหน้าไม่เจอจะ throw ValueError
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้า หรือใบหน้าไม่ชัดเจน")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการประมวลผล AI")
