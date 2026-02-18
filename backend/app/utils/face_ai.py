# backend/app/utils/face_ai.py

import cv2
import numpy as np
import base64
import io
from PIL import Image
from deepface import DeepFace

# กำหนดโมเดลตาม Project 1 ของคุณ
MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "mediapipe"  # MediaPipe ใช้ BlazeFace เป็นไส้ใน


def get_face_embedding(base64_string):
    """
    รับภาพ Base64 -> คืนค่า ArcFace Embedding (Vector 512 ตัว)
    โดยใช้ BlazeFace ในการหาตำแหน่งหน้า
    """
    try:
        # 1. แปลง Base64 เป็นรูปภาพ (NumPy Array)
        if "base64," in base64_string:
            base64_string = base64_string.split(",")[1]

        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        img_array = np.array(image)

        # 2. ให้ DeepFace จัดการทั้ง Detect (BlazeFace) และ Recognize (ArcFace)
        # align=True คือให้หมุนหน้าให้ตรง (ช่วยให้แม่นขึ้น)
        embedding_objs = DeepFace.represent(
            img_path=img_array,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,  # ถ้าไม่เจอหน้า ให้ return None แทน Error
            align=True,
        )

        if len(embedding_objs) > 0:
            # คืนค่า embedding ของหน้าแรกที่เจอ
            return embedding_objs[0]["embedding"]

        return None

    except Exception as e:
        print(f"AI Error: {e}")
        return None


def compare_faces(known_encoding, unknown_encoding, threshold=0.68):
    """
    เปรียบเทียบหน้า 2 หน้าด้วย Cosine Similarity
    (ArcFace แนะนำให้ใช้ Cosine Distance)
    """
    if known_encoding is None or unknown_encoding is None:
        return False, 0

    # แปลง List เป็น Numpy Array เพื่อคำนวณ
    a = np.array(known_encoding)
    b = np.array(unknown_encoding)

    # คำนวณ Cosine Distance
    # สูตร: 1 - (A . B) / (||A|| * ||B||)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    cosine_similarity = dot_product / (norm_a * norm_b)
    cosine_distance = 1 - cosine_similarity

    # ArcFace Threshold: ปกติจะอยู่ที่ 0.68 (สำหรับ DeepFace implementation)
    # distance ยิ่งน้อย = ยิ่งเหมือน
    if cosine_distance < threshold:
        # แปลงเป็น % ความมั่นใจ (แบบคร่าวๆ)
        confidence = round((1 - (cosine_distance / threshold)) * 100, 2)
        return True, confidence

    return False, 0
