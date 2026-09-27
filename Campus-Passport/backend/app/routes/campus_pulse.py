from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.schemas.campus_pulse import (
    InterviewCreateRequest,
    InterviewResponse,
    IssueCreateRequest,
    IssueResponse,
    ResearchResponse,
)
from backend.app.services import campus_pulse_service

router = APIRouter(
    prefix="/api/campus-pulse",
    tags=["Campus Pulse"],
)


@router.get(
    "/issues",
    response_model=List[IssueResponse],
    summary="List all school issues",
)
def list_issues(
    db: Session = Depends(get_db),
):
    """Retrieve all school issues."""
    return campus_pulse_service.list_issues(db=db)


@router.post(
    "/issues",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a new school issue",
)
def create_issue(
    payload: IssueCreateRequest,
    db: Session = Depends(get_db),
):
    """Report an issue and award +10 contribution points."""
    try:
        return campus_pulse_service.create_issue(db=db, data=payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/issues/{issue_id}",
    response_model=IssueResponse,
    summary="Get issue details and interviews",
)
def get_issue(
    issue_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve details and user research interviews for an issue."""
    try:
        return campus_pulse_service.get_issue(db=db, issue_id=issue_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post(
    "/issues/{issue_id}/interviews",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add user research interview to an issue",
)
def add_interview(
    issue_id: str,
    payload: InterviewCreateRequest,
    db: Session = Depends(get_db),
):
    """Record an interview conducted with a student, teacher, or staff member."""
    try:
        return campus_pulse_service.add_interview(
            db=db, issue_id=issue_id, data=payload
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/issues/{issue_id}/research",
    response_model=ResearchResponse,
    summary="Get user research data and verification readiness",
)
def get_research(
    issue_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve research summary and check if 3-interview threshold is satisfied."""
    try:
        return campus_pulse_service.get_research(db=db, issue_id=issue_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post(
    "/issues/{issue_id}/verify",
    response_model=IssueResponse,
    summary="Verify an issue after user research",
)
def verify_issue(
    issue_id: str,
    db: Session = Depends(get_db),
):
    """
    Verify an issue. Requires at least 3 completed user research interviews.
    Awards +20 contribution points.
    """
    try:
        return campus_pulse_service.verify_issue(db=db, issue_id=issue_id)
    except ValueError as exc:
        err_msg = str(exc)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )


@router.post(
    "/issues/{issue_id}/resolve",
    response_model=IssueResponse,
    summary="Resolve a verified issue",
)
def resolve_issue(
    issue_id: str,
    db: Session = Depends(get_db),
):
    """
    Resolve an issue that has been verified through user research.
    Creates a verified CONTRIBUTION achievement and awards +30 points.
    """
    try:
        return campus_pulse_service.resolve_issue(db=db, issue_id=issue_id)
    except ValueError as exc:
        err_msg = str(exc)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )


# Direct /api/issues router for seamless API access
issues_router = APIRouter(
    prefix="/api/issues",
    tags=["School Issues"],
)

issues_router.add_api_route(
    "",
    list_issues,
    methods=["GET"],
    response_model=List[IssueResponse],
    summary="List all school issues",
)
issues_router.add_api_route(
    "",
    create_issue,
    methods=["POST"],
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a new school issue",
)
issues_router.add_api_route(
    "/{issue_id}",
    get_issue,
    methods=["GET"],
    response_model=IssueResponse,
    summary="Get issue details and interviews",
)
issues_router.add_api_route(
    "/{issue_id}/interviews",
    add_interview,
    methods=["POST"],
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add user research interview to an issue",
)
issues_router.add_api_route(
    "/{issue_id}/research",
    get_research,
    methods=["GET"],
    response_model=ResearchResponse,
    summary="Get user research data and verification readiness",
)
issues_router.add_api_route(
    "/{issue_id}/verify",
    verify_issue,
    methods=["POST"],
    response_model=IssueResponse,
    summary="Verify an issue after user research",
)
issues_router.add_api_route(
    "/{issue_id}/resolve",
    resolve_issue,
    methods=["POST"],
    response_model=IssueResponse,
    summary="Resolve a verified issue",
)

