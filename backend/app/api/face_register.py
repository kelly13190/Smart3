from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.users import User
from app.models.face import FaceEmbedding
from pydantic import BaseModel
import numpy as np
import base64
import io
from PIL import Image
import insightface
from insightface.app import FaceAnalysis

router = APIRouter()

# โหลด InsightFace model ครั้งเดียวตอน startup
_face_app = None

def get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(
            name="buffalo_sc",  # model เบา รองรับ CPU ไม่ต้องการ AVX
            providers=["CPUExecutionProvider"]
        )
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
    return _face_app


class FaceRegisterRequest(BaseModel):
    image: str  # Base64 string


def base64_to_image(base64_string: str) -> np.ndarray:
    if "base64," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    # InsightFace ต้องการ BGR
    img_array = np.array(image)
    return img_array[:, :, ::-1]


@router.post("/student/register-face")
async def register_face(
    req: FaceRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        img_bgr = base64_to_image(req.image)
        face_app = get_face_app()
        faces = face_app.get(img_bgr)

        if not faces:
            raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปภาพ")

        # เอา embedding ของหน้าแรก (512 มิติ เหมือน ArcFace เดิม)
        face_vector = faces[0].normed_embedding.tolist()

        result = await db.execute(
            select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.id)
        )
        existing_face = result.scalars().first()

        if existing_face:
            existing_face.embedding_vector = face_vector
            message = "อัปเดตข้อมูลใบหน้าเรียบร้อยแล้ว"
        else:
            new_face = FaceEmbedding(
                user_id=current_user.id,
                embedding_vector=face_vector,
                model_name="ArcFace-InsightFace",
            )
            db.add(new_face)
            message = "ลงทะเบียนใบหน้าสำเร็จ"

        await db.commit()
        return {"status": "success", "message": message}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดในการประมวลผล AI")
