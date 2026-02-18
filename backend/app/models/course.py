from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, index=True)
    section = Column(String)
    name = Column(String)
    semester = Column(String)
    academic_year = Column(String)
    day_of_week = Column(String)
    start_time = Column(Time)
    end_time = Column(Time)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(Date, nullable=True)

    # Relationship
    teacher = relationship("User", back_populates="courses")
    sessions = relationship(
        "ClassSession",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    enrollments = relationship(
        "Enrollment",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    student_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    course = relationship("Course", back_populates="enrollments")
    student = relationship("User", back_populates="enrollments")
