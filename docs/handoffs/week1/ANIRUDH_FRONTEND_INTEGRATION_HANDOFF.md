# Anirudh — Week 1 Frontend and Backend-Integration Handoff

## Starting point

The frontend is served by the FastAPI application at `/` from `Campus-Passport/backend/static/index.html`. The backend and static UI are intentionally deployed from one origin. Week 1 stabilized backend paths and response contracts; use those contracts rather than duplicating business rules in the browser.

Read first: `README.md`, `AGENTS.md`, `ARCHITECTURE_OWNERSHIP.md`, `DECISIONS.md`, and `Campus-Passport/backend/app/main.py`.

## Current integration surface

`app/main.py` serves `/`, exposes `/health`, and registers the feature routers. The static UI includes Campus Lens prototype behavior and a Student Pocket integration panel. The Student Pocket panel obtains its API base from `localStorage.campusPassportApiBase` or defaults to `http://localhost:8000`.

The panel currently calls these established endpoints:

- `GET /api/students` and `GET /api/students/{student_id}`;
- `GET /api/student/{student_id}/balance`, `/transactions`, and `/cards`;
- `GET /api/teacher/rewards/categories`;
- `POST /api/rewards` and `POST /api/deductions`; and
- `POST /api/nfc/tap`.

It sends the prototype `X-Actor-Role` header for role-sensitive flows. The backend recognizes `STUDENT`, `TEACHER`, `ADMIN`, and `MERCHANT` in the current prototype. Treat that as a temporary compatibility contract owned by Sidharth; coordinate before changing browser authentication behavior.

## Scope

- Improve or integrate the UI against existing documented API contracts.
- Keep the browser focused on presentation, input collection, and error display; business, authorization, scoring, and persistence rules stay server-side.
- Use API error `detail` messages safely for user feedback without exposing secrets or internal traces.
- Keep the static frontend compatible with FastAPI's single-origin serving path.
- Coordinate endpoint or response-shape changes with Aashrith before they land and capture the agreed change in documentation.

## Important boundaries

Campus Lens image analysis and quiz generation are separate backend flows, and quiz scoring is deterministic in the backend. Do not make practice results into rewards in the UI. Student Pocket rewards, deductions, NFC, and purchases are simulated application flows but still require backend validation; do not bypass those API checks with browser-only state.

## Smoke checks

With the backend running, verify `/`, `/health`, and `/docs`, then exercise the API calls above from the served UI. Include at least one forbidden role scenario for a teacher/admin action, a successful teacher reward, and a merchant NFC tap. When changing a UI/API boundary, give Vatsa the exact browser flow and expected results for regression coverage.

## Guardrails

Do not commit API keys, `.env`, local database files, or generated build artifacts. Avoid embedding a second API base or hard-coding an alternative backend contract without an agreed transition. Preserve public paths and response shapes by default under ADR-009.
