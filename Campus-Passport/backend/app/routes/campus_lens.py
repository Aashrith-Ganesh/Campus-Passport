import json
import os

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.ai.groq import analyze_textbook_image
from backend.app.ai.quiz import generate_quiz
from backend.app.ai.parser import parse_quiz_response
from backend.app.database.database import get_db
from backend.app.schemas.campus_lens import CampusLensResult
from backend.app.schemas.quiz import QuizSubmission
from backend.app.services.point_service import award_campus_lens_points
from backend.app.services.quiz_service import score_quiz
from backend.app.services.teacher_report_service import build_teacher_report



router = APIRouter(
    prefix="/api/campus-lens",
    tags=["Campus Lens"],
)


# ============================================================
# AI STATUS CHECK
# ============================================================

@router.get("/status")
async def campus_lens_status():
    """Check whether the AI backend (Groq) is configured and available."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    ai_configured = bool(api_key and len(api_key) > 10)
    return {
        "success": True,
        "ai_configured": ai_configured,
    }


# ============================================================
# ANALYZE TEXTBOOK IMAGE
# ============================================================

@router.post("/analyze")
async def analyze_campus_lens(
    image: UploadFile = File(...),
    language: str = Form("Kannada"),
    grade: str = Form("10"),
):
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    # Validate image type
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_IMAGE",
                "message": "Please upload a JPG, PNG, or WEBP image.",
            },
        )

    # Read image
    image_bytes = await image.read()

    max_size = 10 * 1024 * 1024

    # Validate image size
    if len(image_bytes) > max_size:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": "Image must be smaller than 10 MB.",
            },
        )

    # Validate empty image
    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_IMAGE",
                "message": "Uploaded image is empty.",
            },
        )

    try:
        # Send image to Groq vision model
        raw_response = analyze_textbook_image(
            image_bytes=image_bytes,
            content_type=image.content_type,
            language=language,
            grade=grade,
        )

        # Clean possible Markdown code fences
        cleaned = raw_response.strip()

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "", 1)
            cleaned = cleaned.replace("```", "", 1)
            cleaned = cleaned.strip()

        # Parse AI JSON
        data = json.loads(cleaned)

        # Validate against Campus Lens schema
        result = CampusLensResult.model_validate(data)

        return {
            "success": True,
            "data": result.model_dump(),
        }

    except json.JSONDecodeError as exc:
        print("=== CAMPUS LENS ANALYSIS JSON ERROR ===")
        print(type(exc).__name__)
        print(str(exc))

        raise HTTPException(
            status_code=502,
            detail={
                "code": "INVALID_AI_RESPONSE",
                "message": "Campus Lens received an invalid JSON response from the AI service.",
            },
        )

    except Exception as exc:
        print("=== CAMPUS LENS ANALYSIS ERROR ===")
        print(type(exc).__name__)
        print(str(exc))

        raise HTTPException(
            status_code=500,
            detail={
                "code": "AI_ANALYSIS_FAILED",
                "message": "Campus Lens could not analyze this image.",
            },
        )


# ============================================================
# GENERATE DYNAMIC QUIZ
# ============================================================

@router.post("/quiz")
async def create_quiz(
    topic: str = Form(...),
    explanation: str = Form(...),
    key_concepts: str = Form(...),
    language: str = Form(...),
    grade: str = Form(...),
    difficulty: str = Form("medium"),
):
    try:
        # The frontend sends concepts separated by "|"
        concepts = [
            concept.strip()
            for concept in key_concepts.split("|")
            if concept.strip()
        ]

        print()
        print("========================================")
        print("CAMPUS LENS QUIZ GENERATION")
        print("========================================")
        print("Topic:", topic)
        print("Language:", language)
        print("Grade:", grade)
        print("Difficulty:", difficulty)
        print("Concepts:", concepts)

        # Ask Groq to generate exactly 3 questions
        raw_response = generate_quiz(
            topic=topic,
            explanation=explanation,
            key_concepts=concepts,
            target_language=language,
            grade=grade,
            question_count=3,
            difficulty=difficulty,
        )

        print()
        print("=== RAW GROQ QUIZ RESPONSE ===")
        print(raw_response)

        # Validate and parse generated quiz
        questions = parse_quiz_response(raw_response)

        print()
        print("=== QUIZ PARSED SUCCESSFULLY ===")
        print("Question count:", len(questions))
        print("========================================")
        print()

        return {
            "success": True,
            "quiz": [
                question.model_dump()
                for question in questions
            ],
        }

    except Exception as exc:
        print()
        print("========================================")
        print("CAMPUS LENS QUIZ ERROR")
        print("========================================")
        print("Error type:", type(exc).__name__)
        print("Error:", str(exc))
        print("========================================")
        print()

        raise HTTPException(
            status_code=500,
            detail={
                "code": "QUIZ_GENERATION_FAILED",
                "message": str(exc),
            },
        )


# ============================================================
# SUBMIT QUIZ
# ============================================================

@router.post("/quiz/submit")
async def submit_quiz(
    submission: QuizSubmission = Body(...),
    db: Session = Depends(get_db),
):
    try:
        result = score_quiz(
            student_id=submission.student_id,
            topic=submission.topic,
            difficulty=submission.difficulty,
            questions=submission.questions,
            answers=submission.answers,
        )

        try:
            award_campus_lens_points(
                db=db,
                student_id=submission.student_id,
                topic=submission.topic,
                percentage=result.percentage,
                correct_count=result.correct_count,
                total_count=result.total_count,
            )
        except Exception as pt_err:
            print("Campus Lens point award notice:", pt_err)

        return {
            "success": True,
            "result": result.model_dump(),
        }


    except Exception as exc:
        print("=== QUIZ SUBMISSION ERROR ===")
        print(type(exc).__name__)
        print(str(exc))

        raise HTTPException(
            status_code=500,
            detail={
                "code": "QUIZ_SUBMISSION_FAILED",
                "message": str(exc),
            },
        )


# ============================================================
# TEACHER REPORT
# ============================================================

@router.post("/teacher-report")
async def create_teacher_report(
    submission: QuizSubmission = Body(...),
):
    try:
        # Calculate deterministic quiz result
        result = score_quiz(
            student_id=submission.student_id,
            topic=submission.topic,
            difficulty=submission.difficulty,
            questions=submission.questions,
            answers=submission.answers,
        )

        # Build teacher-facing learning report
        report = build_teacher_report(
            student_id=submission.student_id,
            student_name="Aarav",
            class_name="10",
            language=submission.language,
            result=result,
        )

        return {
            "success": True,
            "report": report,
        }

    except Exception as exc:
        print("=== TEACHER REPORT ERROR ===")
        print(type(exc).__name__)
        print(str(exc))

        raise HTTPException(
            status_code=500,
            detail={
                "code": "TEACHER_REPORT_FAILED",
                "message": str(exc),
            },
        )
