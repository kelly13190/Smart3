# backend/app/api/attendance_check.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.users import User
from app.models.face import FaceEmbedding
from app.models.attendance import Attendance, ClassSession, AttendanceStatus
from app.models.course import Enrollment
from pydantic import BaseModel
from deepface import DeepFace
import numpy as np
import base64, io
from PIL import Image
from datetime import datetime

router = APIRouter()


class CheckInRequest(BaseModel):
    session_id: int
    image: str


def base64_to_image(base64_string: str) -> np.ndarray:
    if "base64," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    return np.array(image)


def cosine_similarity(v1, v2) -> float:
    v1, v2 = np.array(v1, dtype=np.float64), np.array(v2, dtype=np.float64)
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    return float(np.dot(v1, v2) / denom) if denom != 0 else 0.0

# GET /sessions/{session_id}  →  ข้อมูล session (รวม status)
@router.get("/sessions/{session_id}")
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(ClassSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ดึง course_code ถ้ามี relationship
    course_code = None
    if session.course:
        course_code = getattr(session.course, "course_code", None)

    return {
        "id": session.id,
        "course_id": session.course_id,
        "course_code": course_code,
        "week_number": session.week_number,
        "date": str(session.date),
        "start_time": str(session.start_time),
        "end_time": str(session.end_time),
        "is_active": session.is_active,
        "status": session.status,  # pending | active | completed
        "session_code": session.session_code,
    }


# ─────────────────────────────────────────────────────
# GET /sessions/{session_id}/attendance  →  รายชื่อที่เช็คแล้ว
# ─────────────────────────────────────────────────────
@router.get("/sessions/{session_id}/attendance")
async def get_session_attendance(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    ดึงรายการเช็คชื่อทั้งหมดของ session นี้
    ใช้สำหรับ:
      - โหลด existing logs เมื่อ refresh หน้า Live
      - แสดงผลในหน้าสรุปย้อนหลัง
    """
    session = await db.get(ClassSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Attendance)
        .where(Attendance.session_id == session_id)
        .order_by(Attendance.timestamp)
    )
    attendances = result.scalars().all()

    records = []
    for att in attendances:
        student = await db.get(User, att.student_id)
        if not student:
            continue

        student_id_str = getattr(student, "student_id", None) or (
            student.email.split("@")[0] if student.email else str(student.id)
        )

        records.append(
            {
                "id": att.id,
                "student_id": student_id_str,
                "student_name": student.full_name or student.email,
                "status": att.status,
                "timestamp": att.timestamp.isoformat() if att.timestamp else None,
                "confidence_score": att.confidence_score,
            }
        )

    return records


# ─────────────────────────────────────────────────────
# GET /sessions/{session_id}/summary  →  สรุปเช็คชื่อ + ขาด
# ─────────────────────────────────────────────────────
@router.get("/sessions/{session_id}/summary")
async def get_session_summary(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    สรุปผลเช็คชื่อ: present / late / absent
    ใช้แสดงในหน้า SessionSummary
    """
    session = await db.get(ClassSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ดึง enrolled students
    enroll_result = await db.execute(
        select(Enrollment).where(Enrollment.course_id == session.course_id)
    )
    enrollments = enroll_result.scalars().all()
    enrolled_ids = {e.student_id for e in enrollments}

    # ดึง attendance ของ session นี้
    att_result = await db.execute(
        select(Attendance).where(Attendance.session_id == session_id)
    )
    attendances = att_result.scalars().all()
    att_map = {a.student_id: a for a in attendances}

    records = []
    for student_id in enrolled_ids:
        student = await db.get(User, student_id)
        if not student:
            continue

        student_id_str = getattr(student, "student_id", None) or (
            student.email.split("@")[0] if student.email else str(student.id)
        )

        att = att_map.get(student_id)
        records.append(
            {
                "student_id": student_id_str,
                "student_name": student.full_name or student.email,
                "status": att.status if att else AttendanceStatus.ABSENT,
                "timestamp": att.timestamp.isoformat()
                if att and att.timestamp
                else None,
                "confidence_score": att.confidence_score if att else None,
            }
        )

    # เรียง: present → late → absent
    order = {"present": 0, "late": 1, "absent": 2}
    records.sort(key=lambda r: order.get(r["status"], 3))

    total = len(records)
    present_count = sum(1 for r in records if r["status"] == "present")
    late_count = sum(1 for r in records if r["status"] == "late")
    absent_count = sum(1 for r in records if r["status"] == "absent")

    return {
        "session_id": session_id,
        "date": str(session.date),
        "week_number": session.week_number,
        "status": session.status,
        "summary": {
            "total": total,
            "present": present_count,
            "late": late_count,
            "absent": absent_count,
        },
        "records": records,
    }


# ─────────────────────────────────────────────────────
# POST /attendance/recognize  →  สแกนหน้า + บันทึกเช็คชื่อ
# ─────────────────────────────────────────────────────
@router.post("/attendance/recognize")
async def recognize_student(req: CheckInRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. เช็ค Session
        session = await db.get(ClassSession, req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if not session.is_active:
            return {"status": "error", "message": "Session is not active"}

        # 2. แปลงภาพ → Vector ด้วย ArcFace
        input_image_np = base64_to_image(req.image)
        try:
            embedding_objs = DeepFace.represent(
                img_path=input_image_np,
                model_name="ArcFace",
                detector_backend="mtcnn",
                enforce_detection=True,
                align=True,
                anti_spoofing=False,
            )
            if not embedding_objs:
                return {"status": "retry", "message": "No face detected"}
            input_vector = embedding_objs[0]["embedding"]
        except Exception as e:
            print(f"[Recognize] DeepFace error: {e}")
            return {"status": "retry", "message": "No face detected"}

        # 3. ดึง enrolled students
        enroll_result = await db.execute(
            select(Enrollment).where(Enrollment.course_id == session.course_id)
        )
        enrollments = enroll_result.scalars().all()
        enrolled_user_ids = [e.student_id for e in enrollments]
        print(
            f"[Recognize] session_id={req.session_id} course_id={session.course_id} enrolled={enrolled_user_ids}"
        )

        # 4. ดึง Face Embeddings
        if enrolled_user_ids:
            face_result = await db.execute(
                select(FaceEmbedding).where(
                    FaceEmbedding.user_id.in_(enrolled_user_ids)
                )
            )
        else:
            print(
                "[Recognize] WARNING: No enrollments found, comparing against ALL faces in DB"
            )
            face_result = await db.execute(select(FaceEmbedding))

        all_faces = face_result.scalars().all()
        print(f"[Recognize] Face embeddings to compare: {len(all_faces)}")

        if not all_faces:
            return {"status": "error", "message": "No registered faces found"}

        # 5. คำนวณ similarity
        best_user_id = None
        best_similarity = -1.0
        THRESHOLD = 0.60

        for face in all_faces:
            sim = cosine_similarity(input_vector, face.embedding_vector)
            print(f"[Recognize] user_id={face.user_id} similarity={sim:.4f}")
            if sim > best_similarity:
                best_similarity = sim
                best_user_id = face.user_id

        print(
            f"[Recognize] RESULT: best_user_id={best_user_id} best_sim={best_similarity:.4f} threshold={THRESHOLD}"
        )

        if best_user_id is None or best_similarity < THRESHOLD:
            return {
                "status": "unknown",
                "message": f"Not recognized (best_sim={best_similarity:.3f}, threshold={THRESHOLD})",
            }

        # 6. ดึงข้อมูล Student
        student = await db.get(User, best_user_id)
        if not student:
            return {"status": "error", "message": "User not found"}

        # 7. เช็คว่าเช็คชื่อแล้วหรือยัง
        existing_att = await db.execute(
            select(Attendance).where(
                Attendance.session_id == req.session_id,
                Attendance.student_id == student.id,
            )
        )
        already_recorded = existing_att.scalars().first()

        if not already_recorded:
            now = datetime.now()
            session_start = datetime.combine(session.date, session.start_time)
            att_status = (
                AttendanceStatus.LATE
                if (now - session_start).total_seconds() > 15 * 60
                else AttendanceStatus.PRESENT
            )
            new_att = Attendance(
                student_id=student.id,
                session_id=req.session_id,
                status=att_status,
                timestamp=now,
                confidence_score=int(best_similarity * 100),
            )
            db.add(new_att)
            await db.commit()
            print(
                f"[Recognize] Recorded attendance for {student.full_name} status={att_status}"
            )

        student_id_str = getattr(student, "student_id", None) or (
            student.email.split("@")[0] if student.email else str(student.id)
        )

        return {
            "status": "detected",
            "message": "Already recorded"
            if already_recorded
            else "Recorded successfully",
            "student": {
                "id": student.id,
                "name": student.full_name or student.email,
                "student_id": student_id_str,
                "confidence": round(best_similarity * 100, 2),
            },
        }

    except Exception as e:
        print(f"[Recognize] Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
