"""
Legacy compatibility re-export for campus_pulse service functions.
Canonical location is backend.app.campus_pulse.service.
"""
from backend.app.campus_pulse.service import (
    add_interview,
    create_issue,
    get_issue,
    get_research,
    list_issues,
    resolve_issue,
    verify_issue,
)

__all__ = [
    "list_issues",
    "get_issue",
    "create_issue",
    "add_interview",
    "get_research",
    "verify_issue",
    "resolve_issue",
]
