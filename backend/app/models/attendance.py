# app/models/attendance.py
import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    Time,
    ForeignKey,
    DateTime,
    Enum,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"


class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    week_number = Column(Integer)
    date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    is_active = Column(Boolean, default=False)
    session_code = Column(String, nullable=True)

    # Relationship
    course = relationship("Course", back_populates="sessions")
    attendances = relationship(
        "Attendance", back_populates="session", cascade="all, delete-orphan"
    )


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default=AttendanceStatus.ABSENT)

    confidence_score = Column(Integer, nullable=True)

    # Relationship
    session = relationship("ClassSession", back_populates="attendances")
    student = relationship("User", back_populates="attendances")
