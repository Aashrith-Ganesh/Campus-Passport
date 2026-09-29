from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.students import service
from backend.app.students.schemas import StudentSimpleResponse

router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


@router.get(
    "",
    response_model=List[StudentSimpleResponse],
    summary="List all students for teacher dashboard",
)
def list_students(
    db: Session = Depends(get_db),
):
    """Retrieve all students in the school directory."""
    return service.list_students(db=db)


@router.get(
    "/{student_id}",
    response_model=StudentSimpleResponse,
    summary="Get single student details",
)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific student."""
    try:
        return service.get_student(db=db, student_id=student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
