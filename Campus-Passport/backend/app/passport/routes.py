from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.passport import service
from backend.app.passport.schemas import AchievementResponse

router = APIRouter(
    prefix="/api/student",
    tags=["Campus Passport"],
)


@router.get(
    "/{student_id}/achievements",
    response_model=List[AchievementResponse],
    summary="Get all verified achievements for a student",
)
def get_achievements(
    student_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all achievements (learning and contribution) for a student."""
    try:
        return service.get_student_achievements(db=db, student_id=student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/{student_id}/points",
    summary="Get points ledger and summary for a student",
)
def get_points(
    student_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve total points, learning vs contribution breakdown, and transaction ledger."""
    try:
        return service.get_student_points(db=db, student_id=student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/{student_id}/passport",
    summary="Get complete Campus Passport record for a student",
)
def get_passport(
    student_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Comprehensive Campus Passport profile combining:
    - Verified identity
    - Learning & Contribution achievements
    - Verified point ledger & breakdown
    - Field research issues & evidence
    - Opportunity wallet applications
    - Student pocket balance & recent transactions
    """
    try:
        return service.get_passport(db=db, student_id=student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
