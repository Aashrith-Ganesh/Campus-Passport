"""
Legacy compatibility re-export for campus_pulse schemas.
Canonical location is backend.app.campus_pulse.schemas.
"""
from backend.app.campus_pulse.schemas import (
    InterviewCreateRequest,
    InterviewResponse,
    IssueCreateRequest,
    IssueResponse,
    ResearchResponse,
)

__all__ = [
    "IssueCreateRequest",
    "InterviewCreateRequest",
    "InterviewResponse",
    "IssueResponse",
    "ResearchResponse",
]
