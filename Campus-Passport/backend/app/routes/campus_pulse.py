"""
Legacy compatibility re-export for campus_pulse routes.
Canonical location is backend.app.campus_pulse.routes.
"""
from backend.app.campus_pulse.routes import (
    add_interview,
    create_issue,
    get_issue,
    get_research,
    issues_router,
    list_issues,
    resolve_issue,
    router,
    verify_issue,
)

__all__ = [
    "router",
    "issues_router",
    "list_issues",
    "create_issue",
    "get_issue",
    "add_interview",
    "get_research",
    "verify_issue",
    "resolve_issue",
]
