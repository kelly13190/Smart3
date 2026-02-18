"""add_cascade_delete_to_course

Revision ID: f7c87557053d
Revises: 8c786bfd0f6d
Create Date: 2026-02-15 18:56:42.790618

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7c87557053d"
down_revision: Union[str, None] = "8c786bfd0f6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. จัดการเรื่องเปลี่ยนชื่อคอลัมน์ (Alembic สร้างมาให้แล้วบางส่วน)
    op.add_column("enrollments", sa.Column("student_id", sa.Integer(), nullable=True))

    # 2. ลบ Constraint เก่าที่ไม่มี Cascade ออก
    # ลบ FK เดิมของ enrollments
    op.drop_constraint("enrollments_user_id_fkey", "enrollments", type_="foreignkey")
    # ลบ FK เดิมของ class_sessions (ที่ทำให้คุณเจอปัญหาลบไม่ได้)
    op.drop_constraint(
        "class_sessions_course_id_fkey", "class_sessions", type_="foreignkey"
    )
    # ลบ FK ของ enrollments ที่ชี้ไป course_id (ถ้ามี)
    op.drop_constraint("enrollments_course_id_fkey", "enrollments", type_="foreignkey")

    # 3. สร้าง Constraint ใหม่ พร้อมใส่ ondelete='CASCADE' ✅
    # สำหรับ class_sessions (สำคัญ!)
    op.create_foreign_key(
        "class_sessions_course_id_fkey",
        "class_sessions",
        "courses",
        ["course_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # สำหรับ enrollments (ชี้ไปที่ student_id ใหม่)
    op.create_foreign_key(
        "enrollments_student_id_fkey",
        "enrollments",
        "users",
        ["student_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # สำหรับ enrollments (ชี้ไปที่ course_id)
    op.create_foreign_key(
        "enrollments_course_id_fkey",
        "enrollments",
        "courses",
        ["course_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 4. ลบคอลัมน์เก่าออก
    op.drop_column("enrollments", "user_id")


def downgrade() -> None:
    # เขียนกลับด้านกับข้างบน (ถ้าต้องการรองรับการ roll back)
    op.add_column(
        "enrollments",
        sa.Column("user_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.drop_constraint("enrollments_course_id_fkey", "enrollments", type_="foreignkey")
    op.drop_constraint("enrollments_student_id_fkey", "enrollments", type_="foreignkey")
    op.drop_constraint(
        "class_sessions_course_id_fkey", "class_sessions", type_="foreignkey"
    )

    op.create_foreign_key(
        "class_sessions_course_id_fkey",
        "class_sessions",
        "courses",
        ["course_id"],
        ["id"],
    )
    op.create_foreign_key(
        "enrollments_user_id_fkey", "enrollments", "users", ["user_id"], ["id"]
    )
    op.create_foreign_key(
        "enrollments_course_id_fkey", "enrollments", "courses", ["course_id"], ["id"]
    )

    op.drop_column("enrollments", "student_id")
