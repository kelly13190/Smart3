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


class SessionCreate(BaseModel):
    course_id: int
    start_time: datetime
    end_time: datetime
    session_code: str = None  # เผื่อใช้รหัสเข้าห้อง


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
    # ดึงเฉพาะวิชาที่ teacher_id ตรงกับคนที่ Login อยู่
    result = await db.execute(
        select(Course).where(Course.teacher_id == current_user.id)
    )
    return result.scalars().all()


# 3. เปิดคาบเรียน (Start Session) - จุดเริ่มต้นของการเช็คชื่อ!
@router.post("/sessions/start")
async def start_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # เช็คก่อนว่าเป็นเจ้าของวิชานี้ไหม
    result = await db.execute(select(Course).where(Course.id == session_data.course_id))
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You are not the teacher of this course"
        )

    # สร้าง Session
    new_session = ClassSession(
        course_id=session_data.course_id,
        start_time=session_data.start_time,
        end_time=session_data.end_time,
        session_code=session_data.session_code,
        is_active=True,  # ✅ เปิด Active ทันที แปลว่าระบบพร้อมรับสแกนหน้า
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return {
        "status": "success",
        "session_id": new_session.id,
        "message": "Class started! Ready for attendance.",
    }


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


# 5. ปิดคาบเรียน (End Session)
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

    session.is_active = False  # ปิดรับสแกน
    await db.commit()
    return {"status": "success", "message": "Class ended."}


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


@router.get("/courses/{course_id}/sessions")
async def get_course_sessions(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClassSession)
        .where(ClassSession.course_id == course_id)
        .order_by(ClassSession.id)
    )
    return result.scalars().all()


# ✅ API: เริ่มคลาสเรียน (Start Session)
@router.post("/sessions/{session_id}/start")
async def start_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. เช็คก่อนว่าอาจารย์คนนี้มี Session อื่น Active อยู่ไหม? (ป้องกันการเปิดซ้อน)
    # ต้อง Join ไปหา Course เพื่อเช็ค teacher_id
    active_check = await db.execute(
        select(ClassSession)
        .join(Course)
        .where(Course.teacher_id == current_user.id, ClassSession.is_active == True)
    )
    existing_active = active_check.scalars().first()

    if existing_active:
        # ถ้า Session ที่ Active อยู่ไม่ใช่ตัวที่เรากำลังจะเปิด แสดงว่าลืมปิดอันเก่า
        if existing_active.id != session_id:
            raise HTTPException(
                status_code=400,
                detail=f"คุณมี Session อื่น ({existing_active.id}) กำลัง Live อยู่ กรุณาปิดก่อน",
            )

    # 2. ดึงข้อมูล Session ที่ต้องการเปิด
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 3. อัปเดตสถานะ และเวลาเริ่มจริง (ถ้ามี field เก็บเวลาจริง)
    session.is_active = True
    # session.actual_start_time = datetime.now() # แนะนำให้เพิ่ม Field นี้ใน Database ในอนาคต

    await db.commit()
    return {"message": "Session started", "status": "active"}


# ✅ API: จบคลาสเรียน (End Session)
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
    # session.actual_end_time = datetime.now() # แนะนำให้เพิ่ม Field นี้ใน Database ในอนาคต

    await db.commit()
    return {"message": "Session ended", "status": "finished"}
