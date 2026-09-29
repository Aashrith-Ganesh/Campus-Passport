from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.database import initialize_database
from backend.app.opportunity_wallet.routes import (
    router as opportunity_wallet_router,
)
from backend.app.routes.campus_lens import router as campus_lens_router
from backend.app.routes.campus_pulse import (
    router as campus_pulse_router,
    issues_router,
)
from backend.app.routes.passport import router as passport_router
from backend.app.routes.student_pocket import router as student_pocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed deterministic demo records if needed
    initialize_database(seed_demo=True)
    yield


app = FastAPI(
    title="Campus Passport API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Campus Passport API",
    }


# Register all module routers
app.include_router(campus_lens_router)
app.include_router(opportunity_wallet_router)
app.include_router(campus_pulse_router)
app.include_router(issues_router)
app.include_router(passport_router)
app.include_router(student_pocket_router)


# ============================================================
# SERVE FRONTEND
# ============================================================

_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
_INDEX_HTML = _STATIC_DIR / "index.html"


@app.get("/", include_in_schema=False)
async def serve_frontend():
    """Serve the Campus Passport frontend at the root URL."""
    return FileResponse(
        _INDEX_HTML,
        media_type="text/html",
    )
