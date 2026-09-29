"""Compatibility re-export for quiz parser. Canonical location: backend.app.campus_lens.ai.parser"""
from backend.app.campus_lens.ai.parser import (
    QuizParseError,
    clean_json_response,
    validate_question_quality,
    parse_quiz_response,
)

__all__ = [
    "QuizParseError",
    "clean_json_response",
    "validate_question_quality",
    "parse_quiz_response",
]
