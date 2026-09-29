# Campus Passport Backend Architecture Audit

**Audit status:** Complete, read-only audit  
**Scope:** Existing backend as inspected during Week 1 planning  
**Goal:** Establish evidence for a safe incremental refactor

## 1. Current repository shape

The repository contains a nested project directory:

```text
Campus-Passport/
├── .git/
├── README.md
├── Start Campus Passport.bat
└── Campus-Passport/
    ├── Start Campus Passport.bat
    └── backend/
        ├── .env
        ├── .venv/
        ├── app/
        ├── campus.db
        ├── requirements.txt
        ├── run.sh
        ├── static/
        └── tests/
```

The backend is FastAPI-based and currently uses SQLite through SQLAlchemy.

## 2. Current application entry point

`app/main.py` currently:
- loads environment files,
- creates the FastAPI application,
- configures CORS,
- initializes/seeds the database during lifespan startup,
- registers routers,
- exposes `/health`,
- serves the static frontend at `/`.

The file is already mostly application wiring, which is a good starting point.

### Current concerns

- Environment loading belongs in shared configuration rather than application wiring.
- CORS is currently broadly permissive.
- Database initialization and demo seeding happen during application startup.
- Router organization is inconsistent.

These are refactor targets, not reasons to rewrite `main.py`.

## 3. Current package organization

The backend currently mixes two organizational styles.

### Centralized style

```text
app/routes/
app/schemas/
app/services/
app/ai/
```

### Feature-local style

```text
app/opportunity_wallet/
    routes.py
    schemas.py
    service.py

app/my_school_my_fix/
    models.py
    routes.py
    schemas.py
    service.py

app/campus_lens/
    ai/
    routes/
    schemas/
    services/
```

This inconsistency is the main architectural problem discovered during the audit.

## 4. Database architecture

The database foundation is centralized under `app/database/`.

Observed components include:
- `database.py`
- `models.py`
- `schemas.py`
- `crud.py`
- `init_db.py`
- `seed.py`
- `schema.sql`
- `README.md`

The current database uses SQLite and SQLAlchemy.

The shared models cover students, achievements, opportunities, opportunity applications, points, school issues, issue interviews, ledger transactions, Student Pocket configuration, NFC cards, and merchants.

The database infrastructure should be preserved during Week 1 rather than replaced.

## 5. Routing findings

### Campus Pulse

Campus Pulse contains handlers for school issues, interviews, research, verification, and resolution.

The same handlers are exposed through both the main route structure and an additional `/api/issues` router using `add_api_route()`.

This is duplicated route registration and should be consolidated carefully while preserving intended API paths.

### Campus Passport

`app/routes/passport.py` does more than controller work. It:
- queries students directly,
- queries achievements,
- categorizes achievements,
- calls the points service,
- calls Student Pocket service,
- queries opportunity applications,
- queries school issues,
- manually constructs a large aggregate response.

The eventual target is a thin route calling a Passport service/aggregation layer.

### Student Pocket

Student Pocket has substantial domain logic behind routes and currently includes a prototype role mechanism based on request headers/query/body values.

This is not equivalent to real authentication/authorization.

Do not remove it blindly. Sidharth's future auth/role system must become the authoritative mechanism, with a deliberate integration migration.

### Opportunity Wallet

Opportunity Wallet already follows a feature-local structure and uses a shared database.

Its service can also fall back to hard-coded default opportunity data when no database data is available. This creates an unclear source-of-truth boundary.

For the stabilized architecture, database-backed data should be explicit and demo data should be provided by seeding rather than silently switching sources.

### My School My Fix

The package contains model/schema files, but its inspected `routes.py` and `service.py` are empty. Treat it as unfinished/reserved functionality, not as a reason to invent implementation during Week 1.

## 6. Service-layer findings

The service layer contains useful existing business logic and should be retained.

### Student Pocket

Contains meaningful domain behavior including:
- balance calculation,
- rewards/deductions,
- achievements,
- NFC card registration,
- NFC token validation,
- merchant validation,
- purchase validation,
- negative-balance rules,
- ledger transactions,
- idempotency handling,
- NFC tap processing.

This is valuable business logic and should not be rewritten merely to change package layout.

### Teacher Report

`teacher_report_service.py` is comparatively clean. It receives verified quiz results and creates a teacher-facing report. It does not let AI determine student performance.

Preserve this separation.

### Quiz Service

Quiz scoring is deterministic:
- answers are mapped by question ID,
- correctness is checked against the supplied answer,
- score and percentage are calculated,
- next difficulty is determined,
- concept results are produced.

This is a good boundary and should remain backend-owned.

## 7. AI architecture findings

AI functionality is currently split across global modules:

```text
app/ai/
    gemini.py
    groq.py
    parser.py
    prompts.py
    quiz.py
```

while Campus Lens also has a feature package.

### Current Groq flow

```text
textbook image
    ↓
Groq/Qwen vision call
    ↓
Campus Lens JSON
```

### Current quiz flow

```text
Campus Lens explanation + concepts
    ↓
quiz generator
    ↓
3 MCQs
    ↓
parser + Pydantic validation
    ↓
student answers
    ↓
deterministic quiz scoring
    ↓
teacher report
```

This separation is useful and should be preserved.

### AI concerns

- AI modules load `.env` independently.
- `GROQ_API_KEY` access is duplicated.
- `gemini.py` is currently empty.
- Quiz prompt says Grade 10 even though the function accepts a `grade` parameter.
- Campus Lens analysis explicitly requires `"quiz": []`, while the response schema permits a non-empty quiz list. This is a contract ambiguity that should be resolved deliberately.
- The parser expects exactly three generated quiz questions, matching the current generator behavior.

## 8. Configuration findings

Configuration is currently loaded in multiple places.

Observed behavior includes `.env` loading from several possible paths in `main.py`, Groq modules, and quiz modules.

Target:
```text
core/config.py
    ↓
all application components
```

Required environment values identified during the project include:
- `DATABASE_URL`
- `GROQ_API_KEY`
- `SECRET_KEY`
- `ENVIRONMENT`

Only placeholders belong in `.env.example`.

## 9. Startup and health

The backend can start successfully with the existing environment.

The observed health endpoint is:

```text
GET /health
```

and returns a successful Campus Passport API status response.

The existing `run.sh` starts Uvicorn and sets `PYTHONPATH`. It was observed to work when invoked with `bash run.sh`. Direct execution was not executable at the time of audit.

Do not change startup behavior casually.

## 10. Severity classification

### High priority

- Establish one feature/module organization.
- Centralize configuration.
- Keep one database/session foundation.
- Integrate real auth/roles when Sidharth's implementation is available.
- Preserve API compatibility during migration.

### Medium priority

- Move Passport aggregation into a service.
- Consolidate duplicated Campus Pulse route registration.
- Clarify Opportunity Wallet source-of-truth behavior.
- Align Campus Lens schema and prompt contracts.
- Make quiz grade handling consistent.

### Low priority / later

- Empty Gemini provider cleanup.
- Startup script executable bit.
- Further logging improvements.
- Production CORS tightening after frontend origins are finalized.
- Documentation polish beyond Week 1.

## 11. What must not happen

- No blind rewrite.
- No mass file move without import/test verification.
- No database replacement.
- No removal of working endpoints without compatibility plan.
- No secret rotation or exposure unless explicitly required.
- No invented auth system.
- No AI-based grading replacing deterministic scoring.
