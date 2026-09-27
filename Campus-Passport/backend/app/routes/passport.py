from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.models import (
    Achievement,
    OpportunityApplication,
    SchoolIssue,
    Student,
)
from backend.app.database.schemas import AchievementResponse
from backend.app.services import student_pocket_service
from backend.app.services.point_service import get_student_points_summary

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
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found.",
        )

    return (
        db.query(Achievement)
        .filter(Achievement.student_id == student_id)
        .order_by(Achievement.timestamp.desc())
        .all()
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
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found.",
        )

    return get_student_points_summary(db=db, student_id=student_id)


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
    """
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found.",
        )

    achievements = (
        db.query(Achievement)
        .filter(Achievement.student_id == student_id)
        .order_by(Achievement.timestamp.desc())
        .all()
    )

    learning_achievements = [a for a in achievements if a.type == "LEARNING"]
    contribution_achievements = [
        a for a in achievements if a.type == "CONTRIBUTION"
    ]
    extracurricular_achievements = [
        a
        for a in achievements
        if getattr(a, "source", None) == "EXTRACURRICULAR"
        or getattr(a, "type", None) == "EXTRACURRICULAR"
    ]

    points_data = get_student_points_summary(db=db, student_id=student_id)

    # Student Pocket universal balance & transaction ledger
    pocket_balance = student_pocket_service.get_student_balance(db, student_id)
    recent_transactions = student_pocket_service.get_student_transactions(db, student_id)[:10]

    applications = (
        db.query(OpportunityApplication)
        .filter(OpportunityApplication.student_id == student_id)
        .order_by(OpportunityApplication.created_at.desc())
        .all()
    )

    issues = (
        db.query(SchoolIssue)
        .filter(SchoolIssue.student_id == student_id)
        .order_by(SchoolIssue.created_at.desc())
        .all()
    )

    recent_evidence = [
        a.evidence for a in achievements if a.evidence
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "class_name": student.class_name,
            "preferred_language": student.preferred_language,
            "created_at": student.created_at.isoformat() if student.created_at else None,
        },
        "points": points_data,
        "total_points": points_data["total_points"],
        "point_breakdown": points_data["breakdown"],
        "student_pocket": {
            "student_id": student.id,
            "total_balance": pocket_balance["total_balance"],
            "academic_balance": pocket_balance["academic_balance"],
            "campus_balance": pocket_balance["campus_balance"],
            "negative_balance_limit": pocket_balance["effective_negative_limit"],
            "effective_negative_limit": pocket_balance["effective_negative_limit"],
            "available_spending_balance": pocket_balance["available_campus_spending_balance"],
            "available_campus_spending_balance": pocket_balance["available_campus_spending_balance"],
        },
        "recent_transactions": [
            {
                "id": tx.id,
                "student_id": tx.student_id,
                "amount": tx.amount,
                "purpose": tx.purpose,
                "transaction_type": tx.transaction_type,
                "category": tx.category,
                "reason": tx.reason,
                "source_type": tx.source_type,
                "source_id": tx.source_id,
                "issued_by": tx.issued_by,
                "approved_by": tx.approved_by,
                "status": tx.status,
                "metadata_json": tx.metadata_json,
                "idempotency_key": tx.idempotency_key,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
            }
            for tx in recent_transactions
        ],
        "achievements": {
            "all": [
                {
                    "id": a.id,
                    "type": "EXTRACURRICULAR" if a.source == "EXTRACURRICULAR" else a.type,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "evidence": a.evidence,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                }
                for a in achievements
            ],
            "learning": [
                {
                    "id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "evidence": a.evidence,
                }
                for a in learning_achievements
            ],
            "contribution": [
                {
                    "id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "evidence": a.evidence,
                }
                for a in contribution_achievements
            ],
            "extracurricular": [
                {
                    "id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "evidence": a.evidence,
                }
                for a in extracurricular_achievements
            ],
        },
        "recent_evidence": recent_evidence,
        "opportunity_applications": [
            {
                "id": app.id,
                "opportunity_id": app.opportunity_id,
                "status": app.status,
                "amount": app.amount,
                "created_at": app.created_at.isoformat() if app.created_at else None,
            }
            for app in applications
        ],
        "school_issues": [
            {
                "id": issue.id,
                "title": issue.title,
                "status": issue.status,
                "category": issue.category,
                "location": issue.location,
                "created_at": issue.created_at.isoformat() if issue.created_at else None,
            }
            for issue in issues
        ],
    }

