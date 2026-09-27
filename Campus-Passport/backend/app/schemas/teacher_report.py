from pydantic import BaseModel


class ConceptResult(BaseModel):
    concept: str
    correct: bool


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

    strengths: list[str]
    areas_for_improvement: list[str]

    learning_summary: str
    recommended_action: str

    concept_results: list[ConceptResult]
