from groq import Groq

from backend.app.core.config import settings
from .prompts import build_quiz_system_prompt

MODEL = "qwen/qwen3.8-27b"


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
Topic: {topic}
Language: {target_language}
Difficulty: {difficulty}

Key concepts:
{concepts_text}

Material:
{explanation[:1200]}

Generate {question_count} multiple-choice questions matching the rules and JSON format.
"""

    system_prompt = build_quiz_system_prompt(grade=grade)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        temperature=0.3,
        max_tokens=1500,
    )

    return response.choices[0].message.content
