"""
Canonical models for school issues and interviews are in backend.app.database.models.
Re-exported here for compatibility with my_school_my_fix module.
"""
from backend.app.database.models import IssueInterview, SchoolIssue

__all__ = ["SchoolIssue", "IssueInterview"]
