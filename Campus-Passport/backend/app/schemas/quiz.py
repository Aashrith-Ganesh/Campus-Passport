from typing import List

from pydantic import BaseModel


class QuizAnswer(BaseModel):
    question_id: str
    selected_answer: str


class QuizSubmission(BaseModel):
    student_id: str
    topic: str
    language: str
    difficulty: str
    questions: List[dict]
    answers: List[QuizAnswer]


class ConceptResult(BaseModel):
    question_id: str
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
