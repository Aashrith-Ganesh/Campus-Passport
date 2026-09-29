from typing import List
from sqlalchemy.orm import Session

from backend.app.database.models import Student


def list_students(db: Session) -> List[Student]:
    """Retrieve all students ordered by student ID."""
    return db.query(Student).order_by(Student.id.asc()).all()


def get_student(db: Session, student_id: str) -> Student:
    """Retrieve a single student by ID."""
    student = db.get(Student, student_id)
    if not student:
        raise ValueError(f"Student '{student_id}' does not exist.")
    return student
