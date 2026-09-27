from typing import List, Optional, Literal

from pydantic import BaseModel, Field, validator

class QuizQuestion(BaseModel):
    id: str
    concept: str
    question: str

    options: List[str] = Field(
        min_items=4,
        max_items=4
    )

    correct_answer: str
    explanation: str

    difficulty: Literal[
        "easy",
        "medium",
        "hard"
    ] = "medium"

    @validator("correct_answer")
    def validate_correct_answer(
        cls,
        value,
        values
    ):
        options = values.get("options", [])

        if options and value not in options:
            raise ValueError(
                "correct_answer must exactly match one of the options"
            )

        return value

class CampusLensResult(BaseModel):
    extracted_text: str
    topic: str

    subtopics: List[str]

    simple_explanation: str
    translated_explanation: str

    key_concepts: List[str]

    quiz: List[QuizQuestion] = Field(
        min_items=0,
        max_items=5
    )

    image_quality: Literal[
        "good",
        "partially_readable",
        "unreadable"
    ]


class CampusLensResponse(BaseModel):
    success: bool

    data: Optional[CampusLensResult] = None

    error: Optional[dict] = None
