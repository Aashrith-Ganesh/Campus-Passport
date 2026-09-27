from backend.app.services.quiz_service import score_quiz
from backend.app.schemas.quiz import QuizAnswer


questions = [
    {
        "id": "q1",
        "concept": "Definition of Geography",
        "question": "What is geography?",
        "options": [
            "Study of Earth",
            "Study of numbers",
            "Study of computers",
            "Study of music",
        ],
        "correct_answer": "Study of Earth",
    },
    {
        "id": "q2",
        "concept": "Human Environment",
        "question": "Which is a human feature?",
        "options": [
            "Mountain",
            "River",
            "City",
            "Ocean",
        ],
        "correct_answer": "City",
    },
    {
        "id": "q3",
        "concept": "Physical Environment",
        "question": "Which is part of the physical environment?",
        "options": [
            "Road",
            "Mountain",
            "Building",
            "School",
        ],
        "correct_answer": "Mountain",
    },
]


answers = [
    QuizAnswer(
        question_id="q1",
        selected_answer="Study of Earth",
    ),
    QuizAnswer(
        question_id="q2",
        selected_answer="City",
    ),
    QuizAnswer(
        question_id="q3",
        selected_answer="City",
    ),
]


result = score_quiz(
    student_id="STU001",
    topic="Introduction to Geography",
    difficulty="medium",
    questions=questions,
    answers=answers,
)


print("Score:", result.score)
print("Total:", result.total_questions)
print("Percentage:", result.percentage)
print("Current difficulty:", result.difficulty)
print("Next difficulty:", result.next_difficulty)

print("\nConcept results:")

for item in result.concept_results:
    status = "CORRECT" if item.correct else "WRONG"
    print(item.question_id, "|", item.concept, "|", status)
