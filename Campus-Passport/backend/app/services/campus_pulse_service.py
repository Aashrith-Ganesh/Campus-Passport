from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Achievement,
    IssueInterview,
    SchoolIssue,
    Student,
)
from backend.app.schemas.campus_pulse import (
    InterviewCreateRequest,
    IssueCreateRequest,
)
from backend.app.services.point_service import (
    award_issue_reported_points,
    award_issue_resolved_points,
    award_issue_verified_points,
)


def list_issues(db: Session, student_id: Optional[str] = None) -> List[SchoolIssue]:
    """Retrieve all school issues, optionally filtered by student_id."""
    query = db.query(SchoolIssue)
    if student_id:
        query = query.filter(SchoolIssue.student_id == student_id)
    return query.order_by(SchoolIssue.created_at.desc()).all()


def get_issue(db: Session, issue_id: str) -> SchoolIssue:
    """Retrieve an issue by ID along with its interviews."""
    issue = db.get(SchoolIssue, issue_id)
    if not issue:
        raise ValueError(f"School issue '{issue_id}' not found.")
    return issue


def create_issue(db: Session, data: IssueCreateRequest) -> SchoolIssue:
    """
    Create a new school issue with SUBMITTED status.
    Awards +10 contribution points upon reporting.
    """
    # Verify student exists
    student = db.get(Student, data.student_id)
    if not student:
        raise ValueError(f"Student '{data.student_id}' does not exist.")

    # Generate issue ID if not provided
    issue_id = data.id
    if not issue_id:
        count = db.query(SchoolIssue).count()
        issue_id = f"ISSUE{count + 1:03d}"
        while db.get(SchoolIssue, issue_id):
            count += 1
            issue_id = f"ISSUE{count + 1:03d}"
    elif db.get(SchoolIssue, issue_id):
        raise ValueError(f"Issue ID '{issue_id}' already exists.")

    issue = SchoolIssue(
        id=issue_id,
        student_id=data.student_id,
        title=data.title,
        description=data.description,
        category=data.category,
        location=data.location,
        status="SUBMITTED",
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Award points: Issue reported: +10
    award_issue_reported_points(
        db=db,
        student_id=issue.student_id,
        issue_id=issue.id,
        title=issue.title,
    )

    return issue


def add_interview(
    db: Session,
    issue_id: str,
    data: InterviewCreateRequest,
) -> IssueInterview:
    """
    Record user research interview for an issue.
    Advances status to UNDER_REVIEW if currently SUBMITTED.
    """
    issue = get_issue(db, issue_id)

    interview = IssueInterview(
        issue_id=issue.id,
        participant_type=data.participant_type,
        participant_name=data.participant_name,
        response=data.response,
    )
    db.add(interview)

    # Transition from SUBMITTED to UNDER_REVIEW when research begins
    if issue.status == "SUBMITTED":
        issue.status = "UNDER_REVIEW"

    db.commit()
    db.refresh(interview)
    db.refresh(issue)
    return interview


def get_research(db: Session, issue_id: str) -> Dict:
    """
    Retrieve research dossier for an issue.
    Checks whether the 3-interview threshold has been reached.
    """
    issue = get_issue(db, issue_id)
    interview_count = len(issue.interviews)
    return {
        "issue_id": issue.id,
        "title": issue.title,
        "status": issue.status,
        "interview_count": interview_count,
        "minimum_required": 3,
        "is_ready_for_verification": interview_count >= 3,
        "interviews": issue.interviews,
    }


def verify_issue(db: Session, issue_id: str) -> SchoolIssue:
    """
    Verify an issue. Requires at least 3 stakeholder research interviews.
    Awards +20 contribution points upon verification.
    """
    issue = get_issue(db, issue_id)
    interview_count = len(issue.interviews)

    if interview_count < 3:
        raise ValueError(
            f"An issue requires at least 3 user research interviews before it can be verified. "
            f"Current interview count: {interview_count}."
        )

    issue.status = "VERIFIED"
    db.commit()
    db.refresh(issue)

    # Award points: Issue verified: +20
    award_issue_verified_points(
        db=db,
        student_id=issue.student_id,
        issue_id=issue.id,
        title=issue.title,
    )

    return issue


def resolve_issue(db: Session, issue_id: str) -> SchoolIssue:
    """
    Resolve a verified issue.
    Creates a verified CONTRIBUTION achievement in the shared database.
    Awards +30 contribution points linked to the achievement.
    """
    issue = get_issue(db, issue_id)

    if issue.status not in ("VERIFIED", "IN_PROGRESS"):
        raise ValueError(
            f"Issue must be verified before it can be resolved. "
            f"Current status: {issue.status}."
        )

    issue.status = "RESOLVED"
    db.commit()
    db.refresh(issue)

    # Create a CONTRIBUTION achievement in the shared achievement table
    achievement = Achievement(
        student_id=issue.student_id,
        type="CONTRIBUTION",
        title=f"Resolved School Issue: {issue.title}",
        description=f"Conducted stakeholder research ({len(issue.interviews)} interviews) and resolved school issue: {issue.description}",
        source="CAMPUS_PULSE",
        evidence=f"Issue {issue.id} verified with {len(issue.interviews)} interviews and resolved.",
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)

    # Award points: Issue resolved: +30 linked to achievement
    award_issue_resolved_points(
        db=db,
        student_id=issue.student_id,
        issue_id=issue.id,
        title=issue.title,
        achievement_id=achievement.id,
    )

    return issue
