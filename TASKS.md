# Week 1 Backend Tasks

Work sequentially. Do not skip verification.

## T01 - Baseline and characterization

### Goal
Capture the current working state before refactoring.

### Actions
- Confirm clean Git state.
- Start backend.
- Verify `/health`.
- Verify `/docs`.
- Verify `/`.
- Run existing tests.
- Record currently registered routes.
- Confirm database starts and seed behavior.

### Verification
Save command output or test evidence in the task notes/commit message.

### Acceptance
Current behavior is documented before structural changes begin.

---

## T02 - Centralize configuration

### Goal
Create one configuration source.

### Actions
Create `app/core/config.py`.

Move environment access toward one settings interface.

At minimum account for:
- `DATABASE_URL`
- `GROQ_API_KEY`
- `SECRET_KEY`
- `ENVIRONMENT`

Keep `.env` local.

Add/update `.env.example` with placeholders only.

### Verification
- Application starts.
- AI modules no longer need to independently search for `.env`.
- No secret is printed.
- Existing database and Groq behavior remains functional.

### Acceptance
Application components consume shared configuration rather than implementing their own `.env` search logic.

---

## T03 - Establish shared exception conventions

### Goal
Prevent every route from inventing its own error structure.

### Actions
Introduce `core/exceptions.py` only as much as the existing application needs.

Do not create an elaborate exception framework unnecessarily.

Document mapping for:
- not found,
- validation/domain errors,
- unauthorized/forbidden,
- unexpected errors.

### Verification
Run affected endpoint tests.

### Acceptance
Known domain errors have predictable HTTP responses.

---

## T04 - Establish feature ownership map

### Goal
Define which feature owns which route/service/schema.

### Initial ownership

```text
auth              → authentication and roles
students          → student identity/profile APIs
passport          → aggregate student passport
student_pocket    → points, balances, NFC, purchases
campus_pulse      → school issues/research/verification
campus_lens       → textbook analysis and learning quiz pipeline
opportunity_wallet→ opportunities and applications
```

### Verification
No implementation changes required unless necessary to document ownership.

### Acceptance
Every existing major endpoint has one documented owner.

---

## T05 - Migrate Campus Lens

### Goal
Make Campus Lens internally coherent.

### Actions
Move or adapt, without behavior rewrite:
- routes,
- schemas,
- service,
- AI provider logic,
- parser,
- prompts,
- quiz generation.

Preserve the current image-analysis contract.

Preserve the separate quiz-generation/scoring pipeline.

Resolve the schema ambiguity around whether image-analysis `quiz` is always empty.

Make quiz generation actually use the requested grade rather than contradicting it with a hard-coded Grade 10 system instruction.

### Verification
- Image-analysis endpoint works.
- Invalid AI JSON is rejected.
- Quiz generation produces expected structure.
- Quiz scoring remains deterministic.

### Acceptance
Campus Lens is feature-owned and its contracts are explicit.

---

## T06 - Migrate Opportunity Wallet

### Goal
Keep its existing feature-local architecture but standardize boundaries.

### Actions
- Keep routes thin.
- Keep business rules in service.
- Use shared DB/session.
- Decide/document whether fallback opportunities are test/demo-only.
- Prefer seeded DB data as application source of truth.

### Verification
Test list, detail, eligibility, application, and application history.

### Acceptance
No accidental duplicate data source is used in normal application flow.

---

## T07 - Consolidate Campus Pulse

### Goal
Remove duplicate route registration without breaking intended paths.

### Actions
Determine which public paths are required:
- existing Campus Pulse paths,
- `/api/issues` compatibility paths.

Keep one implementation of each handler.

If compatibility paths are required, route them to the same underlying handler rather than duplicating implementation.

### Verification
Exercise every retained path.

### Acceptance
No duplicate handler registration and no accidental API break.

---

## T08 - Refactor Passport aggregation

### Goal
Make Passport route/controller thin.

### Actions
Create a Passport service responsible for:
- student retrieval,
- achievement grouping,
- points summary,
- Student Pocket snapshot,
- opportunity applications,
- school issues,
- aggregate response construction.

The route should primarily:
- receive student ID,
- obtain DB dependency,
- call service,
- map errors.

### Verification
Compare current and refactored passport response for seeded student data.

### Acceptance
Existing response fields remain compatible unless a documented contract change is required.

---

## T09 - Isolate prototype authorization

### Goal
Prepare for Sidharth's auth implementation.

### Actions
Inventory all role-protected endpoints.

Create a clear dependency boundary for authentication/role resolution.

Do not replace prototype behavior until the real auth contract exists.

### Verification
Protected endpoints behave as before.

### Acceptance
There is one obvious integration point for Sidharth's auth.

---

## T10 - Students API foundation [COMPLETED]

### Goal
Give student-related APIs a clear home.

### Actions
- Created `app/students/` package with `routes.py`, `schemas.py`, `service.py`, `__init__.py`.
- Moved student retrieval/listing endpoints (`/api/students`, `/api/students/{student_id}`) out of Student Pocket into Students module.
- Preserved backwards compatibility re-exports in `app/schemas/student_pocket.py`, `app/services/student_pocket_service.py`, and `app/routes/student_pocket.py`.

### Verification
- Tested `GET /api/students` and `GET /api/students/STU001`.
- Verified Student Pocket and Passport tests pass without regression.

### Acceptance
Student identity APIs have one authoritative feature owner.

---

## T11 - Database initialization cleanup [COMPLETED]

### Goal
Separate application startup from demo-data policy.

### Actions
- Cleaned up `app/database/init_db.py` to separate `create_tables()` and `seed_demo()`.
- Added logging and direct CLI runner execution (`python -m backend.app.database.init_db --seed`).
- Kept `initialize_database(seed_demo=...)` as single predictable entrypoint for `main.py` lifespan and test suites.
- Preserved existing SQLite data and idempotency guarantees.

### Verification
- Executed direct CLI runner and programmatic initialization.
- Verified database creates tables and preserves existing records safely.

### Acceptance
Database initialization is predictable, modular, and centralized.

---

## T12 - Testing and integration [COMPLETED]

### Checks Performed
1. Backend startup and lifespan: verified.
2. `/health`: verified 200 OK.
3. `/docs`: verified 200 OK.
4. Frontend `/`: verified 200 OK.
5. Database initialization: verified idempotent.
6. Student retrieval (`/api/students`, `/api/students/{id}`): verified.
7. Passport retrieval (`/api/student/{id}/passport`, `/points`, `/achievements`): verified.
8. Points/balance behavior: verified across Student Pocket and Passport.
9. Campus Pulse issue flow (`/api/campus-pulse/issues` and `/api/issues` alias): verified.
10. Opportunity eligibility/application (`/api/opportunities`): verified.
11. Campus Lens analysis contract: verified deterministic AI pipeline.
12. Quiz scoring and teacher report: verified standalone tests.
13. Role-protected endpoints: verified auth boundary dependencies.
14. Error handling: verified standard `{"detail": "..."}` format.
15. Full test suite: ALL 7 TEST SUITES PASSED CLEANLY.

### Acceptance
All relevant tests pass and `git diff` contains only intended changes.

---

## T13 - Documentation and handoff [COMPLETED]

### Actions
- Removed legacy dead code `app/my_school_my_fix/`.
- Updated `TASKS.md`, `DECISIONS.md`, `ARCHITECTURE_OWNERSHIP.md`, `WEEK1_BACKEND_PLAN.md`, and `README.md`.
- Documented clean boundaries for Parvesh (database) and Sidharth (auth/roles).
- Recorded architecture and completion status.

### Final acceptance
Week 1 backend foundation is stabilized, feature-first, fully tested, and ready for team collaboration.
