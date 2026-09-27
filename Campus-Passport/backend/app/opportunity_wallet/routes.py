from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.opportunity_wallet import service
from backend.app.opportunity_wallet.schemas import (
    ApplicationResponse,
    EligibilityResponse,
    Opportunity,
)

router = APIRouter(
    tags=["Opportunity Wallet"],
)


# ---------------------------------------------------------
# OPPORTUNITY ENDPOINTS
# ---------------------------------------------------------

@router.get(
    "/api/opportunities",
    response_model=List[Opportunity],
    summary="List all available opportunities",
)
def list_opportunities(
    db: Session = Depends(get_db),
) -> List[Opportunity]:
    """Return all currently available opportunities in the catalog."""
    return service.get_all_opportunities(db=db)


@router.get(
    "/api/opportunities/{opportunity_id}",
    response_model=Opportunity,
    summary="Get opportunity by ID",
)
def get_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
) -> Opportunity:
    """Return details of a specific opportunity by ID."""
    try:
        return service.get_opportunity(opportunity_id=opportunity_id, db=db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


# ---------------------------------------------------------
# ELIGIBILITY & APPLICATION ENDPOINTS
# ---------------------------------------------------------

@router.get(
    "/api/student/{student_id}/opportunities/{opportunity_id}/eligibility",
    response_model=EligibilityResponse,
    summary="Check student eligibility for an opportunity",
)
def check_student_eligibility(
    student_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
) -> EligibilityResponse:
    """
    Check if a student is eligible for an opportunity based on verified achievements.
    Returns explainable reasons for satisfied requirements and missing requirements.
    """
    try:
        return service.check_eligibility(
            student_id=student_id,
            opportunity_id=opportunity_id,
            db=db,
        )
    except ValueError as exc:
        err_msg = str(exc)
        if "not found" in err_msg.lower() or "not exist" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )


@router.post(
    "/api/student/{student_id}/opportunities/{opportunity_id}/apply",
    response_model=ApplicationResponse,
    summary="Apply for an opportunity",
)
def apply_for_opportunity(
    student_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """
    Submit an application for an opportunity on behalf of a student.
    Only creates an application if the student meets eligibility criteria.
    Persists to the shared SQLite database.
    """
    try:
        return service.create_application(
            student_id=student_id,
            opportunity_id=opportunity_id,
            db=db,
        )
    except ValueError as exc:
        err_msg = str(exc)
        if "not found" in err_msg.lower() or "not exist" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )


@router.get(
    "/api/student/{student_id}/opportunities/applications",
    response_model=List[ApplicationResponse],
    summary="Get all applications for a student",
)
def list_student_applications(
    student_id: str,
    db: Session = Depends(get_db),
) -> List[ApplicationResponse]:
    """Retrieve all applications submitted by a student from the database."""
    return service.get_applications_for_student(student_id=student_id, db=db)
