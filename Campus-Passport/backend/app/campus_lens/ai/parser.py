import json
import re

from pydantic import ValidationError

from backend.app.campus_lens.schemas import QuizQuestion


class QuizParseError(Exception):
    """Raised when the AI-generated quiz cannot be safely parsed or validated."""


def clean_json_response(raw_response: str) -> str:
    """
    Remove Markdown code fences and surrounding whitespace
    from the AI response.
    """
    if not isinstance(raw_response, str):
        raise QuizParseError("AI response must be a string.")

    text = raw_response.strip()

    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\s*```$",
        "",
        text,
    )

    return text.strip()


def validate_question_quality(question: QuizQuestion) -> None:
    """
    Perform basic sanity checks on a generated question.
    Rejects corrupted AI output.
    """
    if len(question.question.strip()) < 10:
        raise QuizParseError(f"{question.id}: question is too short.")

    for option in question.options:
        if not option.strip():
            raise QuizParseError(f"{question.id}: empty option detected.")

    if question.correct_answer not in question.options:
        raise QuizParseError(
            f"{question.id}: correct answer does not match an option."
        )

    for option in question.options:
        if len(option.split()) > 30:
            raise QuizParseError(f"{question.id}: option is excessively long.")

    for option in question.options:
        words = option.split()
        if len(words) >= 20:
            unique_words = set(words)
            repetition_ratio = len(unique_words) / len(words)
            if repetition_ratio < 0.2:
                raise QuizParseError(
                    f"{question.id}: option contains excessive repetition."
                )


def parse_quiz_response(raw_response: str) -> list[QuizQuestion]:
    """Convert raw Groq response into validated QuizQuestion objects."""
    cleaned = clean_json_response(raw_response)

    if not cleaned:
        raise QuizParseError("AI returned an empty response.")

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise QuizParseError(f"Groq returned invalid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise QuizParseError("Quiz response must be a JSON object.")

    questions = data.get("quiz")

    if not isinstance(questions, list):
        raise QuizParseError("Quiz response must contain a 'quiz' list.")

    if len(questions) != 3:
        raise QuizParseError(f"Expected exactly 3 questions, got {len(questions)}.")

    validated_questions: list[QuizQuestion] = []

    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise QuizParseError(f"Question {index} must be a JSON object.")

        try:
            validated = QuizQuestion.model_validate(question)
        except ValidationError as exc:
            raise QuizParseError(f"Question {index} failed validation: {exc}") from exc

        validate_question_quality(validated)
        validated_questions.append(validated)

    return validated_questions
