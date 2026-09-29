"""Compatibility re-export for quiz generator. Canonical location: backend.app.campus_lens.ai.quiz"""
from backend.app.campus_lens.ai.quiz import generate_quiz, MODEL
from backend.app.campus_lens.ai.prompts import QUIZ_SYSTEM_PROMPT

__all__ = ["generate_quiz", "MODEL", "QUIZ_SYSTEM_PROMPT"]
