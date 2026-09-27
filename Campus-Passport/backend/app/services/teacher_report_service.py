from typing import List

from backend.app.schemas.quiz import QuizResult


def build_teacher_report(
    student_id: str,
    student_name: str,
    class_name: str,
    language: str,
    result: QuizResult,
) -> dict:
    """
    Build a teacher-facing learning report from verified quiz results.

    The score and concept correctness come from the backend.
    This function does not allow AI to invent student performance.
    """

    strengths: List[str] = []
    areas_for_improvement: List[str] = []

    # ---------------------------------------------------------
    # Identify strengths and concepts needing reinforcement
    # ---------------------------------------------------------

    for concept in result.concept_results:

        if concept.correct:
            strengths.append(concept.concept)
        else:
            areas_for_improvement.append(
                concept.concept
            )

    # ---------------------------------------------------------
    # Overall learning summary
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Recommended teacher action
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Concept-level breakdown
    # ---------------------------------------------------------

    concept_results = []

    for item in result.concept_results:

        concept_results.append(
            {
                "question_id": item.question_id,
                "concept": item.concept,
                "correct": item.correct,
            }
        )

    # ---------------------------------------------------------
    # Final teacher report
    # ---------------------------------------------------------

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
