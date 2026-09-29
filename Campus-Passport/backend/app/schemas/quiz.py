"""Compatibility re-export for quiz schemas. Canonical location: backend.app.campus_lens.schemas"""
from backend.app.campus_lens.schemas import (
    QuizAnswer,
    QuizSubmission,
    ConceptResult,
    QuizResult,
)

__all__ = ["QuizAnswer", "QuizSubmission", "ConceptResult", "QuizResult"]
