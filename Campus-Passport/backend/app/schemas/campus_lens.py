"""Compatibility re-export for campus_lens schemas. Canonical location: backend.app.campus_lens.schemas"""
from backend.app.campus_lens.schemas import (
    QuizQuestion,
    CampusLensResult,
    CampusLensResponse,
)

__all__ = ["QuizQuestion", "CampusLensResult", "CampusLensResponse"]
