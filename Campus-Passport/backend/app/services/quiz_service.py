"""Compatibility re-export for quiz service. Canonical location: backend.app.campus_lens.service"""
from backend.app.campus_lens.service import (
    calculate_next_difficulty,
    score_quiz,
)

__all__ = ["calculate_next_difficulty", "score_quiz"]
