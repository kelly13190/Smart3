# backend/app/api/courses.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timedelta, date, time

from app.core.database import get_db
from app.models.users import User
from app.models.course import Course, Enrollment
from app.models.attendance import ClassSession, Attendance
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter()


# --- Schemas (ใช้เฉพาะในไฟล์นี้ หรือจะแยกไป folder schemas ก็ได้) ---
class CourseCreate(BaseModel):
    course_code: str
    section: str
    name: str
    semester: str
    academic_year: str
    day_of_week: str
    start_time: str
    end_time: str
    start_date: date


class CourseResponse(BaseModel):
    id: int
    course_code: str
    section: str
    name: str
    semester: str
    academic_year: str
    day_of_week: str
    start_time: time
    end_time: time
    teacher_id: int

    class Config:
        from_attributes = True


# ---------------------------------------------------------


# 1. อาจารย์สร้างวิชาใหม่
@router.post("/courses/", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. แปลงเวลา
    s_time = datetime.strptime(course_data.start_time, "%H:%M").time()
    e_time = datetime.strptime(course_data.end_time, "%H:%M").time()

    # 2. สร้าง Course (ไม่มี description ตามที่คุณต้องการ)
    new_course = Course(
        course_code=course_data.course_code,
        section=course_data.section,
        name=course_data.name,
        semester=course_data.semester,
        academic_year=course_data.academic_year,
        day_of_week=course_data.day_of_week,
        start_time=s_time,
        end_time=e_time,
        teacher_id=current_user.id,
    )
    db.add(new_course)
    await db.flush()

    # 3. สร้าง 15 Sessions อัตโนมัติโดยใช้ start_date ที่เพิ่มเข้ามา
    current_date = course_data.start_date
    for i in range(1, 16):
        new_session = ClassSession(
            course_id=new_course.id,
            week_number=i,
            date=current_date,
            start_time=s_time,
            end_time=e_time,
            is_active=False,
        )
        db.add(new_session)
        current_date = current_date + timedelta(days=7)  # บวกทีละ 1 สัปดาห์

    await db.commit()
    await db.refresh(new_course)
    return new_course


# 2. อาจารย์ดูวิชาที่ตัวเองสอน
@router.get("/courses/my-courses", response_model=List[CourseResponse])
async def get_my_courses(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Course).where(Course.teacher_id == current_user.id)
    )
    return result.scalars().all()


# 4. ดู Session ที่กำลัง Active อยู่ (สำหรับหน้า Dashboard)
@router.get("/sessions/active")
async def get_active_sessions(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # หา Session ที่ Active และเป็นวิชาของอาจารย์คนนี้
    stmt = (
        select(ClassSession)
        .join(Course)
        .where(ClassSession.is_active == True)
        .where(Course.teacher_id == current_user.id)
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions


@router.get("/courses/search/{course_code}")
async def search_course(course_code: str, db: AsyncSession = Depends(get_db)):
    # ค้นหาวิชา พร้อมข้อมูลอาจารย์ (Teacher)
    result = await db.execute(
        select(Course, User.full_name)
        .join(User, Course.teacher_id == User.id)
        .where(Course.course_code == course_code)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    course, teacher_name = row
    return {
        "id": course.id,
        "course_code": course.course_code,
        "name": course.name,
        "section": course.section,
        "day_of_week": course.day_of_week,
        "teacher_name": teacher_name,
    }


# รองรับการ Enroll เอง
@router.post("/courses/enroll")
async def enroll_course(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course_code = data.get("course_code")

    # 1. ค้นหาวิชา
    result = await db.execute(select(Course).where(Course.course_code == course_code))
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 2. เช็คการลงทะเบียนซ้ำ
    enroll_check = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course.id,
            Enrollment.student_id == current_user.id,
        )
    )
    if enroll_check.scalars().first():
        raise HTTPException(status_code=400, detail="You are already enrolled")

    # 3. สร้างข้อมูลการลงทะเบียนใหม่
    new_enroll = Enrollment(
        course_id=course.id,
        student_id=current_user.id,
    )
    db.add(new_enroll)
    await db.commit()

    return {"message": "Enrolled successfully"}


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    course_name = course.name

    await db.delete(course)
    await db.commit()

    return {
        "message": f"Course '{course_name}' and all related data deleted successfully"
    }


# API :
@router.get("/courses/{course_id}/sessions")
async def get_course_sessions(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClassSession)
        .where(ClassSession.course_id == course_id)
        .order_by(ClassSession.week_number)
    )
    sessions = result.scalars().all()

    return [
        {
            "id": s.id,
            "week_number": s.week_number,
            "date": s.date,
            "is_active": s.is_active,
        }
        for s in sessions
    ]


# API: เริ่มคลาสเรียน (Start Session)
@router.post("/sessions/{session_id}/start")
async def start_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 🔴 ดักไว้: ถ้าคลาสเรียนจบไปแล้ว ห้ามกดเปิดใหม่!
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="คลาสเรียนนี้จบไปแล้ว ไม่สามารถเปิดซ้ำได้")

    # 🔴 ดักไว้: ถ้าคลาสกำลังเปิดอยู่แล้ว
    if session.is_active or session.status == "active":
        raise HTTPException(status_code=400, detail="Session is already active")

    session.is_active = True
    session.status = "active"  # อัปเดตสถานะเป็นกำลังเรียน
    await db.commit()
    return {"message": "Session started", "status": "active"}


# API: จบคลาสเรียน (End Session)
@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = False
    session.status = "completed"  # 🔴 อัปเดตสถานะเป็น "เรียนจบแล้ว" ปิดตายคลาสนี้

    await db.commit()
    return {"message": "Session ended", "status": "finished"}


# API : ดึงรายชื่อเด็กที่ enroll
@router.get("/courses/{course_id}/students")
async def get_enrolled_students(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .join(Enrollment, User.id == Enrollment.student_id)
        .where(Enrollment.course_id == course_id)
    )
    students = result.scalars().all()

    return [
        {
            "id": s.id,
            # ถ้ามีฟิลด์ student_id ให้ใช้ ถ้าไม่มีให้เอา email ตัด @ ออกแก้ขัด
            "student_id": getattr(
                s, "student_id", s.email.split("@")[0] if "@" in s.email else s.email
            ),
            "name": s.full_name or "Unknown Student",
        }
        for s in students
    ]


# API: ดึงประวัติการเช็คชื่อย้อนหลังของ Session นั้นๆ
@router.get("/sessions/{session_id}/attendance")
async def get_session_attendance(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ดึงข้อมูลการเช็คชื่อ พร้อม Join กับตาราง User เพื่อเอาชื่อเด็ก
    result = await db.execute(
        select(Attendance, User)
        .join(User, Attendance.student_id == User.id)
        .where(Attendance.session_id == session_id)
        .order_by(Attendance.timestamp.desc())  # เรียงจากคนที่สแกนล่าสุด
    )
    records = result.all()

    # จัดรูปแบบข้อมูลส่งกลับไปให้หน้า React
    return [
        {
            "student_id": user.id,
            "student_email": user.email,
            "student_name": user.full_name,
            "status": att.status.value
            if hasattr(att.status, "value")
            else att.status,  # present, late, absent
            "timestamp": att.timestamp,
            "confidence": att.confidence_score,
        }
        for att, user in records
    ]
