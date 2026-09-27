import json
import re

from pydantic import ValidationError

from backend.app.schemas.campus_lens import QuizQuestion


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

    # Handle responses such as:
    #
    # ```json
    # {
    #   "quiz": [...]
    # }
    # ```
    #
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

    These checks are intentionally conservative. Their purpose is to
    reject obviously corrupted AI output, not to judge whether a
    question is academically good.
    """

    # Question must contain meaningful text.
    if len(question.question.strip()) < 10:
        raise QuizParseError(
            f"{question.id}: question is too short."
        )

    # Exactly four options are already enforced by Pydantic,
    # but make sure they are not empty.
    for option in question.options:
        if not option.strip():
            raise QuizParseError(
                f"{question.id}: empty option detected."
            )

    # Correct answer must be one of the options.
    if question.correct_answer not in question.options:
        raise QuizParseError(
            f"{question.id}: correct answer does not match an option."
        )

    # Prevent extremely long options.
    for option in question.options:
        if len(option.split()) > 30:
            raise QuizParseError(
                f"{question.id}: option is excessively long."
            )

    # Detect obvious repetitive/corrupted output.
    for option in question.options:
        words = option.split()

        if len(words) >= 20:
            unique_words = set(words)

            repetition_ratio = len(unique_words) / len(words)

            if repetition_ratio < 0.2:
                raise QuizParseError(
                    f"{question.id}: option contains excessive repetition."
                )


def parse_quiz_response(
    raw_response: str,
) -> list[QuizQuestion]:
    """
    Convert the raw Groq response into validated QuizQuestion objects.

    Pipeline:

        Raw AI response
              ↓
        Remove code fences
              ↓
          Parse JSON
              ↓
        Validate structure
              ↓
        Validate questions
              ↓
        Return QuizQuestion objects
    """

    # ---------------------------------------------------------
    # 1. Clean the response
    # ---------------------------------------------------------

    cleaned = clean_json_response(raw_response)

    if not cleaned:
        raise QuizParseError(
            "AI returned an empty response."
        )

    # ---------------------------------------------------------
    # 2. Parse JSON
    # ---------------------------------------------------------

    try:
        data = json.loads(cleaned)

    except json.JSONDecodeError as exc:
        raise QuizParseError(
            f"Groq returned invalid JSON: {exc}"
        ) from exc

    # ---------------------------------------------------------
    # 3. Validate top-level structure
    # ---------------------------------------------------------

    if not isinstance(data, dict):
        raise QuizParseError(
            "Quiz response must be a JSON object."
        )

    questions = data.get("quiz")

    if not isinstance(questions, list):
        raise QuizParseError(
            "Quiz response must contain a 'quiz' list."
        )

    # Campus Lens currently expects exactly 3 questions.
    if len(questions) != 3:
        raise QuizParseError(
            f"Expected exactly 3 questions, got {len(questions)}."
        )

    # ---------------------------------------------------------
    # 4. Validate every question with Pydantic
    # ---------------------------------------------------------

    validated_questions: list[QuizQuestion] = []

    for index, question in enumerate(
        questions,
        start=1,
    ):

        if not isinstance(question, dict):
            raise QuizParseError(
                f"Question {index} must be a JSON object."
            )

        try:
            validated = QuizQuestion.model_validate(
                question
            )

        except ValidationError as exc:
            raise QuizParseError(
                f"Question {index} failed validation: {exc}"
            ) from exc

        # -----------------------------------------------------
        # 5. Additional quality checks
        # -----------------------------------------------------

        validate_question_quality(validated)

        validated_questions.append(validated)

    # ---------------------------------------------------------
    # 6. Return safe structured data
    # ---------------------------------------------------------

    return validated_questions
