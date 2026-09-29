"""Compatibility re-export for AI prompts. Canonical location: backend.app.campus_lens.ai.prompts"""
from backend.app.campus_lens.ai.prompts import (
    CAMPUS_LENS_SYSTEM_PROMPT,
    QUIZ_SYSTEM_PROMPT,
    build_quiz_system_prompt,
)

__all__ = [
    "CAMPUS_LENS_SYSTEM_PROMPT",
    "QUIZ_SYSTEM_PROMPT",
    "build_quiz_system_prompt",
]
