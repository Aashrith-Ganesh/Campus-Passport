import base64

from groq import Groq

from backend.app.core.config import settings
from .prompts import CAMPUS_LENS_SYSTEM_PROMPT

MODEL = "qwen/qwen3.8-27b"


def image_to_data_url(image_bytes: bytes, content_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{content_type};base64,{encoded}"


def analyze_textbook_image(
    image_bytes: bytes,
    content_type: str,
    language: str,
    grade: str,
) -> str:

    api_key = settings.GROQ_API_KEY

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    image_url = image_to_data_url(
        image_bytes,
        content_type,
    )

    user_prompt = f"""
Target language: {language}
Student grade: {grade}

Analyze the textbook image using the Campus Lens instructions.
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": CAMPUS_LENS_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": user_prompt,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url,
                        },
                    },
                ],
            },
        ],
        temperature=0.2,
        max_completion_tokens=2000,
    )

    return response.choices[0].message.content
