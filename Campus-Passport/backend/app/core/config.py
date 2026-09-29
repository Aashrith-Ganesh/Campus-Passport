import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Search candidate locations for .env
# backend/app/core/config.py -> parents[2] is backend/
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_CANDIDATE_ENV_PATHS = [
    _BACKEND_DIR / ".env",
    _BACKEND_DIR.parent / ".env",
    Path(".env"),
]

for _candidate in _CANDIDATE_ENV_PATHS:
    if _candidate.exists():
        load_dotenv(_candidate)
        break
else:
    load_dotenv()


@dataclass
class Settings:
    """Centralized application settings loaded from environment or defaults."""
    ENVIRONMENT: str = field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development")
    )
    BACKEND_DIR: Path = field(
        default_factory=lambda: _BACKEND_DIR
    )
    DATABASE_PATH: Path = field(
        default_factory=lambda: _BACKEND_DIR / "campus.db"
    )
    DATABASE_URL: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            f"sqlite:///{(_BACKEND_DIR / 'campus.db').as_posix()}",
        )
    )
    GROQ_API_KEY: str = field(
        default_factory=lambda: os.getenv("GROQ_API_KEY", "")
    )
    SECRET_KEY: str = field(
        default_factory=lambda: os.getenv(
            "SECRET_KEY", "dev-secret-key-change-in-production"
        )
    )
    PORT: int = field(
        default_factory=lambda: int(os.getenv("PORT", "8000"))
    )

    @property
    def is_ai_configured(self) -> bool:
        """Helper to check if Groq AI key is present and valid length."""
        return bool(self.GROQ_API_KEY and len(self.GROQ_API_KEY) > 10)

    def __repr__(self) -> str:
        masked_groq = "***" if self.GROQ_API_KEY else ""
        return (
            f"Settings(ENVIRONMENT='{self.ENVIRONMENT}', "
            f"PORT={self.PORT}, "
            f"DATABASE_URL='{self.DATABASE_URL}', "
            f"GROQ_API_KEY='{masked_groq}', "
            f"SECRET_KEY='***')"
        )


settings = Settings()
