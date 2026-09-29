from typing import List, Dict, Any

from backend.app.campus_lens.schemas import (
    ConceptResult,
    QuizAnswer,
    QuizResult,
    TeacherReport,
)


def calculate_next_difficulty(
    score: int,
    total_questions: int,
    current_difficulty: str,
) -> str:
    """Calculate adaptive next difficulty based on percentage score."""
    if total_questions == 0:
        return current_difficulty

    percentage = (score / total_questions) * 100

    if percentage >= 80:
        if current_difficulty == "easy":
            return "medium"
        if current_difficulty == "medium":
            return "hard"
        return "hard"

    if percentage < 40:
        if current_difficulty == "hard":
            return "medium"
        if current_difficulty == "medium":
            return "easy"
        return "easy"

    return current_difficulty


def score_quiz(
    student_id: str,
    topic: str,
    difficulty: str,
    questions: List[dict],
    answers: List[QuizAnswer],
) -> QuizResult:
    """Deterministically score student quiz submission against question keys."""
    answer_map = {
        answer.question_id: answer.selected_answer
        for answer in answers
    }

    score = 0
    concept_results: List[ConceptResult] = []

    for question in questions:
        question_id = question.get("id", "")
        correct_answer = question.get("correct_answer", "")
        selected_answer = answer_map.get(question_id)

        correct = (
            selected_answer is not None
            and selected_answer == correct_answer
        )

        if correct:
            score += 1

        concept = question.get(
            "concept",
            question.get("question", "Unknown concept"),
        )

        concept_results.append(
            ConceptResult(
                question_id=question_id,
                concept=concept,
                correct=correct,
            )
        )

    total_questions = len(questions)
    percentage = (
        (score / total_questions) * 100
        if total_questions > 0
        else 0
    )

    next_difficulty = calculate_next_difficulty(
        score,
        total_questions,
        difficulty,
    )

    return QuizResult(
        student_id=student_id,
        topic=topic,
        score=score,
        total_questions=total_questions,
        percentage=round(percentage, 2),
        difficulty=difficulty,
        next_difficulty=next_difficulty,
        concept_results=concept_results,
    )


def build_teacher_report(
    student_id: str,
    student_name: str,
    class_name: str,
    language: str,
    result: QuizResult,
) -> dict:
    """
    Build a teacher-facing learning report from verified deterministic quiz results.
    AI is never used to determine student performance or correctness.
    """
    strengths: List[str] = []
    areas_for_improvement: List[str] = []

    for concept in result.concept_results:
        if concept.correct:
            strengths.append(concept.concept)
        else:
            areas_for_improvement.append(concept.concept)

    if result.percentage >= 80:
        learning_summary = (
            "The student demonstrated strong understanding "
            "of the assessed concepts."
        )
    elif result.percentage >= 40:
        learning_summary = (
            "The student demonstrated partial understanding "
            "of the assessed concepts and may benefit from "
            "reinforcement of specific concepts."
        )
    else:
        learning_summary = (
            "The student may need additional support and "
            "simpler explanation of the assessed concepts."
        )

    if areas_for_improvement:
        recommended_action = (
            "Reinforce the following concepts with a short "
            "explanation, worked example, or classroom activity: "
            + ", ".join(areas_for_improvement)
            + "."
        )
    else:
        recommended_action = (
            "The student has demonstrated strong understanding. "
            "Consider providing a slightly more challenging "
            "activity to extend learning."
        )

    concept_results = [
        {
            "question_id": item.question_id,
            "concept": item.concept,
            "correct": item.correct,
        }
        for item in result.concept_results
    ]

    return {
        "student": {
            "id": student_id,
            "name": student_name,
            "class": class_name,
            "language": language,
        },
        "learning_activity": {
            "topic": result.topic,
            "difficulty": result.difficulty,
        },
        "performance": {
            "score": result.score,
            "total_questions": result.total_questions,
            "percentage": result.percentage,
        },
        "adaptive_learning": {
            "current_difficulty": result.difficulty,
            "recommended_next_difficulty": result.next_difficulty,
        },
        "learning_insights": {
            "strengths": strengths,
            "areas_for_improvement": areas_for_improvement,
            "summary": learning_summary,
        },
        "recommended_teacher_action": recommended_action,
        "concept_results": concept_results,
    }
