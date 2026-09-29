# Aashrith — Week 1 Backend Architecture and Integration Handoff

## Completed foundation

The Week 1 backend foundation is complete. The application uses feature-first ownership where practical, keeps shared core/database infrastructure centralized, and preserves existing public API behavior by default. `main.py` is application wiring; routes handle HTTP concerns; services own workflows; and database modules own persistence infrastructure.

Read before changing: `AGENTS.md`, `ARCHITECTURE_AUDIT.md`, `WEEK1_BACKEND_PLAN.md`, `TASKS.md`, `DECISIONS.md`, and `ARCHITECTURE_OWNERSHIP.md`.

## Current architecture anchors

- `app/core/`: settings and exception conventions.
- `app/database/`: the only engine/session/model foundation.
- `app/auth/`: the dependency boundary for Sidharth's authentication and roles work.
- `app/students/`, `app/passport/`, `app/campus_pulse/`, `app/campus_lens/`, and `app/opportunity_wallet/`: feature-owned modules.
- `app/routes/student_pocket.py` and its compatibility modules: existing Student Pocket behavior retained while migration is incremental.
- `app/main.py`: router wiring, lifecycle initialization, CORS, health check, and static frontend serving.

## Integration responsibilities

- Review cross-branch work for feature ownership, public-contract compatibility, shared-session use, and test evidence.
- Merge one small architectural change at a time; avoid broad cleanups that mix unrelated concerns.
- Integrate Sidharth's dependency-based auth contract without silently breaking prototype clients.
- Integrate Parvesh's database changes through the canonical model/session boundary.
- Coordinate with Anirudh on any browser-visible contract change and with Vatsa on regression coverage/documentation.

## Guardrails

Preserve the Campus Lens split between image analysis and quiz generation, and keep quiz scoring deterministic. Do not create duplicate database engines, alternate model layers, or route-to-route feature dependencies. Do not commit secrets, `.env`, virtual environments, caches, or local database state. Document intentional architecture decisions in `DECISIONS.md`.

## Verification baseline

For integration changes, verify app startup, `/health`, `/docs`, `/`, affected endpoint flows, and the full runner at `Campus-Passport/backend/tests/run_all_tests.py`. The Week 1 record reports all seven suites passing; use it as the baseline for regression assessment.
