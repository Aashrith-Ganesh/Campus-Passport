from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class QuizQuestion(BaseModel):
    id: str
    concept: str
    question: str
    options: List[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    explanation: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(cls, value: str, info) -> str:
        options = info.data.get("options", [])
        if options and value not in options:
            raise ValueError("correct_answer must exactly match one of the options")
        return value


class CampusLensResult(BaseModel):
    extracted_text: str
    topic: str
    subtopics: List[str] = Field(default_factory=list)
    simple_explanation: str
    translated_explanation: str
    key_concepts: List[str] = Field(default_factory=list)
    # As per ADR-005, image analysis does not generate quiz questions; separate quiz flow does.
    quiz: List[QuizQuestion] = Field(
        default_factory=list,
        description="Always empty in image analysis; quizzes are generated via /api/campus-lens/quiz",
    )
    image_quality: Literal["good", "partially_readable", "unreadable"] = "good"


class CampusLensResponse(BaseModel):
    success: bool
    data: Optional[CampusLensResult] = None
    error: Optional[dict] = None


class QuizAnswer(BaseModel):
    question_id: str
    selected_answer: str


class QuizSubmission(BaseModel):
    student_id: str
    topic: str
    language: str
    difficulty: str = "medium"
    questions: List[dict]
    answers: List[QuizAnswer]


class ConceptResult(BaseModel):
    question_id: Optional[str] = None
    concept: str
    correct: bool


class QuizResult(BaseModel):
    student_id: str
    topic: str
    score: int
    total_questions: int
    percentage: float
    difficulty: str
    next_difficulty: str
    concept_results: List[ConceptResult]

    @property
    def correct_count(self) -> int:
        return self.score

    @property
    def total_count(self) -> int:
        return self.total_questions


class TeacherReport(BaseModel):
    student_id: str
    student_name: str
    class_name: str
    topic: str
    language: str
    score: int
    total_questions: int
    percentage: float
    difficulty: str
    strengths: List[str]
    areas_for_improvement: List[str]
    learning_summary: str
    recommended_action: str
    concept_results: List[ConceptResult]
