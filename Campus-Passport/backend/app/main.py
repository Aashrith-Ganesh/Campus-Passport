from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.database import initialize_database
from backend.app.opportunity_wallet.routes import (
    router as opportunity_wallet_router,
)
from backend.app.campus_lens.routes import router as campus_lens_router
from backend.app.campus_pulse.routes import (
    router as campus_pulse_router,
    issues_router,
)
from backend.app.passport.routes import router as passport_router
from backend.app.students.routes import router as students_router
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

register_exception_handlers(app)

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
app.include_router(students_router)
app.include_router(student_pocket_router)


# ============================================================
# SERVE FRONTEND
# ============================================================

from fastapi.staticfiles import StaticFiles

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_BACKEND_STATIC_DIR = _BACKEND_DIR / "static"

# Frontend directory candidate locations (separated frontend/ alongside backend/)
_CANDIDATE_FRONTEND_DIRS = [
    _BACKEND_DIR.parent / "frontend",
    _BACKEND_DIR.parent.parent / "frontend",
    _BACKEND_DIR / "frontend",
]
_FRONTEND_DIR = next((d for d in _CANDIDATE_FRONTEND_DIRS if d.exists()), _BACKEND_DIR.parent / "frontend")
_FRONTEND_INDEX_HTML = _FRONTEND_DIR / "index.html"
_FRONTEND_ASSETS_DIR = _FRONTEND_DIR / "assets"

# Serve backend static directory (uploads, evidence photos)
if _BACKEND_STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=_BACKEND_STATIC_DIR), name="static")

# Serve separated frontend assets directory (css, js, icons, pages)
if _FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_ASSETS_DIR), name="assets")
elif (_BACKEND_STATIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=_BACKEND_STATIC_DIR / "assets"), name="assets")


@app.middleware("http")
async def revalidate_frontend_assets(request, call_next):
    """Force revalidation of the shell and its assets.

    Dynamic ES-module imports use stable URLs; without this the browser
    heuristically caches them and serves stale JS after a redeploy.
    ETag/304 revalidation keeps this cheap.
    """
    response = await call_next(request)
    path = request.url.path
    if (path == "/" or path == "/index.html" or path.startswith("/assets/") or path.startswith("/static/")) and "cache-control" not in response.headers:
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
async def serve_frontend():
    """Serve the Campus Passport frontend at the root URL."""
    if _FRONTEND_INDEX_HTML.exists():
        return FileResponse(_FRONTEND_INDEX_HTML, media_type="text/html")
    if (_BACKEND_STATIC_DIR / "index.html").exists():
        return FileResponse(_BACKEND_STATIC_DIR / "index.html", media_type="text/html")
    return {"message": "Frontend not found"}

