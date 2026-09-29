import json

from groq import Groq

from backend.app.core.config import settings



MODEL = "qwen/qwen3.8-27b"


QUIZ_SYSTEM_PROMPT = """
You are Campus Lens Quiz Generator for Grade 10 students.

Generate exactly 3 multiple-choice questions using ONLY the supplied academic material.

Rules:
1. Exactly 3 questions.
2. Exactly 4 options per question.
3. Exactly one correct answer.
4. Questions must be based only on the supplied material.
5. Match the requested language.
6. Match the requested difficulty.
7. Keep questions and options concise.
8. Do not add facts not present in the material.
9. Include a short explanation for each answer.
10. Return ONLY valid JSON.
11. Do not use Markdown or code fences.

Required JSON format:

{
  "quiz": [
    {
      "id": "q1",
      "concept": "short concept",
      "question": "question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "short explanation",
      "difficulty": "medium"
    },
    {
      "id": "q2",
      "concept": "short concept",
      "question": "question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "explanation": "short explanation",
      "difficulty": "medium"
    },
    {
      "id": "q3",
      "concept": "short concept",
      "question": "question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "C",
      "explanation": "short explanation",
      "difficulty": "medium"
    }
  ]
}
"""


def generate_quiz(
    topic: str,
    explanation: str,
    key_concepts: list,
    target_language: str,
    grade: str,
    question_count: int = 3,
    difficulty: str = "medium",
) -> str:

    api_key = settings.GROQ_API_KEY

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    # Keep the material compact so the generated response
    # stays comfortably below Groq's output-token limit.
    concepts_text = "\n".join(
        f"- {concept}"
        for concept in key_concepts[:5]
    )

    user_prompt = f"""
Grade: {grade}
Language: {target_language}
Difficulty: {difficulty}
Topic: {topic}

Explanation:
{explanation[:1800]}

Key concepts:
{concepts_text}

Generate exactly 3 concise MCQs.
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": QUIZ_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        temperature=0.2,
        max_completion_tokens=900,
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("Groq returned an empty quiz response")

    return content
