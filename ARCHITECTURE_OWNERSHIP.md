# Campus Passport Backend Architecture Ownership & Module Boundaries

**Status:** Completed Analysis & Design (Task T04)  
**Target:** Clean, feature-first module boundaries for Week 1 backend stabilization  
**Rule:** No application code changes; this document governs the migration from T05 onward.

---

## 1. Final Proposed Module Tree

```text
Campus-Passport/backend/
├── app/
│   ├── main.py                          # Application entry point & router wiring
│   ├── core/                            # Shared cross-cutting infrastructure
│   │   ├── __init__.py
│   │   ├── config.py                    # Centralized settings & environment
│   │   └── exceptions.py                # Centralized exception hierarchy & handlers
│   ├── database/                        # Shared persistence infrastructure
│   │   ├── __init__.py
│   │   ├── database.py                  # SQLAlchemy engine & sessionmaker
│   │   ├── models.py                    # Canonical SQLAlchemy ORM models
│   │   ├── schemas.py                   # Shared DB schemas/CRUD schemas
│   │   ├── crud.py                      # Shared CRUD operations
│   │   ├── init_db.py                   # DB creation & initialization logic
│   │   └── seed.py                      # Deterministic demo data seeding
│   ├── auth/                            # Reserved for Sidharth's auth implementation
│   │   ├── __init__.py
│   │   ├── dependencies.py              # Auth/role dependency boundary (get_current_user, require_role)
│   │   ├── routes.py                    # Login, token refresh, session endpoints
│   │   ├── schemas.py                   # Token, Credentials, UserContext schemas
│   │   └── service.py                   # Password verification, JWT/token logic
│   ├── students/                        # Student identity & profile feature
│   │   ├── __init__.py
│   │   ├── routes.py                    # GET /api/students, GET /api/students/{id}
│   │   ├── schemas.py                   # StudentResponse, StudentList schemas
│   │   └── service.py                   # Student directory lookup and retrieval
│   ├── passport/                        # Student Passport aggregate presentation
│   │   ├── __init__.py
│   │   ├── routes.py                    # GET /api/student/{id}/passport, /points, /achievements
│   │   ├── schemas.py                   # Aggregate passport & points response models
│   │   └── service.py                   # Passport aggregator service
│   ├── student_pocket/                  # Student Pocket, NFC, and campus ledger
│   │   ├── __init__.py
│   │   ├── routes.py                    # Balances, cards, purchases, rewards, deductions
│   │   ├── schemas.py                   # Pocket/Ledger/NFC request and response schemas
│   │   └── service.py                   # Ledger rules, balance calculations, tap processing
│   ├── campus_pulse/                    # School issues, user research & verification
│   │   ├── __init__.py
│   │   ├── routes.py                    # Canonical issue reporting, research, verification
│   │   ├── schemas.py                   # Issue, Interview, Research schemas
│   │   └── service.py                   # 3-interview verification workflow & status transitions
│   ├── campus_lens/                     # AI textbook analysis, quiz generation & grading
│   │   ├── __init__.py
│   │   ├── routes.py                    # Analysis, quiz generation, quiz submission
│   │   ├── schemas.py                   # CampusLensResult, Quiz, TeacherReport schemas
│   │   ├── service.py                   # Scoring & report generation service orchestration
│   │   └── ai/
│   │       ├── __init__.py
│   │       ├── groq.py                  # Groq/Qwen vision inference client
│   │       ├── prompts.py               # Vision & quiz generation system prompts
│   │       ├── parser.py                # AI JSON response parser & validator
│   │       └── quiz.py                  # Quiz generation orchestrator
│   └── opportunity_wallet/              # Opportunities, eligibility & applications
│       ├── __init__.py
│       ├── routes.py                    # Opportunity catalog, eligibility, application endpoints
│       ├── schemas.py                   # Opportunity, Eligibility, Application schemas
│       └── service.py                   # Criteria evaluation & application submission
```

---

## 2. Feature Ownership Table

| Feature | Primary Domain Responsibility | Key Inputs / Dependencies | Key Outputs / Artifacts |
|---|---|---|---|
| **Core** | Environment, configuration, base exception hierarchy, global HTTP error handlers | System environment (`.env`) | `settings`, base exceptions, error responses |
| **Database** | Canonical models, engine, session factory, base CRUD, seed demo data | SQLite / SQLAlchemy | DB sessions, ORM models, persistence |
| **Auth** | User identity, token generation, role verification, authentication dependencies | Credentials, Bearer tokens | `UserContext`, auth dependencies |
| **Students** | Student directory, profile lookups, student identity retrieval | `database.models.Student` | `StudentResponse`, student listings |
| **Passport** | Aggregating student identity, achievements, points ledger, opportunity history | `database`, `student_pocket`, `opportunity_wallet` | Complete Passport summary JSON |
| **Student Pocket**| Dual balances (Academic & Campus), transactions, NFC cards, purchases, rewards | Ledger entries, NFC cards, merchants | Balance breakdown, ledger transactions |
| **Campus Pulse** | School issue reporting, user interviews, research readiness, verification | School issues, interviews, student IDs | Issue lifecycle states (`REPORTED` $\rightarrow$ `VERIFIED` $\rightarrow$ `RESOLVED`) |
| **Campus Lens** | Vision analysis of textbooks, quiz generation, deterministic scoring, teacher reports | Images, syllabus concepts, answers | Extracted concepts, MCQs, score reports |
| **Opportunity Wallet**| Extracurricular & education opportunities, eligibility verification, applications | Student achievements, criteria rules | Opportunities catalog, applications |

---

## 3. Current File $\rightarrow$ Future Owner Mapping

| Current File | Target Location | Migration Plan |
|---|---|---|
| `app/main.py` | `app/main.py` | Retain as top-level app wiring. |
| `app/core/config.py` | `app/core/config.py` | Retain in Core (T02). |
| `app/core/exceptions.py` | `app/core/exceptions.py` | Retain in Core (T03). |
| `app/database/*` | `app/database/*` | Retain in Database (Shared). Do not move. |
| `app/routes/student_pocket.py` | Split: `app/students/routes.py` & `app/student_pocket/routes.py` | Extract student directory endpoints to `students/routes.py`; keep wallet/NFC/ledger in `student_pocket/routes.py`. |
| `app/schemas/student_pocket.py` | `app/student_pocket/schemas.py` | Move to `student_pocket/schemas.py`. |
| `app/services/student_pocket_service.py`| `app/student_pocket/service.py` | Move to `student_pocket/service.py`. |
| `app/routes/passport.py` | `app/passport/routes.py` | Move route handler to `passport/routes.py`. Extract query aggregation to service. |
| `app/services/point_service.py` | Split/Move: `app/passport/service.py` & `app/student_pocket/` | Points ledger summary moves to `passport/service.py` or `student_pocket/service.py`. |
| `app/routes/campus_pulse.py` | `app/campus_pulse/routes.py` | Move to `campus_pulse/routes.py`. Keep `/api/issues` compatibility alias. |
| `app/schemas/campus_pulse.py` | `app/campus_pulse/schemas.py` | Move to `campus_pulse/schemas.py`. |
| `app/services/campus_pulse_service.py` | `app/campus_pulse/service.py` | Move to `campus_pulse/service.py`. |
| `app/routes/campus_lens.py` | `app/campus_lens/routes.py` | Move to `campus_lens/routes.py`. |
| `app/schemas/campus_lens.py` | `app/campus_lens/schemas.py` | Consolidate into `campus_lens/schemas.py`. |
| `app/schemas/quiz.py` | `app/campus_lens/schemas.py` | Consolidate quiz schemas into `campus_lens/schemas.py`. |
| `app/schemas/teacher_report.py` | `app/campus_lens/schemas.py` | Consolidate teacher report schemas into `campus_lens/schemas.py`. |
| `app/services/quiz_service.py` | `app/campus_lens/service.py` | Consolidate scoring & reports into `campus_lens/service.py`. |
| `app/services/teacher_report_service.py`| `app/campus_lens/service.py` | Consolidate into `campus_lens/service.py`. |
| `app/ai/groq.py` | `app/campus_lens/ai/groq.py` | Move vision inference to `campus_lens/ai/groq.py`. |
| `app/ai/quiz.py` | `app/campus_lens/ai/quiz.py` | Move quiz generator to `campus_lens/ai/quiz.py`. |
| `app/ai/parser.py` | `app/campus_lens/ai/parser.py` | Move quiz parser to `campus_lens/ai/parser.py`. |
| `app/ai/prompts.py` | `app/campus_lens/ai/prompts.py`| Move prompts to `campus_lens/ai/prompts.py`. |
| `app/ai/gemini.py` | Remove | Empty 0-byte file. Delete in cleanup phase. |
| `app/services/campus_lens_service.py` | Remove | Empty 0-byte file. Delete in cleanup phase. |
| `app/my_school_my_fix/*` | Remove | Legacy 0-byte stub files (except model re-export). Delete in cleanup phase. |
| `app/opportunity_wallet/*` | `app/opportunity_wallet/*` | Already feature-local. Refine service fallback behavior. |

---

## 4. Current Endpoint $\rightarrow$ Feature Mapping

### Students (`app/students`)
- `GET /api/students` $\rightarrow$ `students.routes:list_students`
- `GET /api/students/{student_id}` $\rightarrow$ `students.routes:get_student`

### Passport (`app/passport`)
- `GET /api/student/{student_id}/passport` $\rightarrow$ `passport.routes:get_passport`
- `GET /api/student/{student_id}/points` $\rightarrow$ `passport.routes:get_points`
- `GET /api/student/{student_id}/achievements` $\rightarrow$ `passport.routes:get_achievements`

### Student Pocket (`app/student_pocket`)
- `GET /api/student/{student_id}/balance` $\rightarrow$ `student_pocket.routes:get_balance`
- `GET /api/student/{student_id}/transactions` $\rightarrow$ `student_pocket.routes:get_transactions`
- `GET /api/student/{student_id}/cards` $\rightarrow$ `student_pocket.routes:get_student_cards`
- `POST /api/student/{student_id}/achievements` $\rightarrow$ `student_pocket.routes:record_achievement`
- `POST /api/rewards` $\rightarrow$ `student_pocket.routes:create_reward`
- `POST /api/deductions` $\rightarrow$ `student_pocket.routes:create_deduction`
- `GET /api/teacher/rewards/categories` $\rightarrow$ `student_pocket.routes:get_categories`
- `POST /api/nfc/cards` $\rightarrow$ `student_pocket.routes:register_card`
- `POST /api/nfc/tap` $\rightarrow$ `student_pocket.routes:nfc_tap`
- `POST /api/purchases` $\rightarrow$ `student_pocket.routes:process_purchase`

### Opportunity Wallet (`app/opportunity_wallet`)
- `GET /api/opportunities` $\rightarrow$ `opportunity_wallet.routes:list_opportunities`
- `GET /api/opportunities/{opportunity_id}` $\rightarrow$ `opportunity_wallet.routes:get_opportunity`
- `GET /api/student/{student_id}/opportunities/{opportunity_id}/eligibility` $\rightarrow$ `opportunity_wallet.routes:check_student_eligibility`
- `POST /api/student/{student_id}/opportunities/{opportunity_id}/apply` $\rightarrow$ `opportunity_wallet.routes:apply_for_opportunity`
- `GET /api/student/{student_id}/opportunities/applications` $\rightarrow$ `opportunity_wallet.routes:list_student_applications`

### Campus Pulse (`app/campus_pulse`)
- `GET /api/campus-pulse/issues` & `GET /api/issues` $\rightarrow$ `campus_pulse.routes:list_issues`
- `POST /api/campus-pulse/issues` & `POST /api/issues` $\rightarrow$ `campus_pulse.routes:create_issue`
- `GET /api/campus-pulse/issues/{issue_id}` & `GET /api/issues/{issue_id}` $\rightarrow$ `campus_pulse.routes:get_issue`
- `POST /api/campus-pulse/issues/{issue_id}/interviews` & `POST /api/issues/{issue_id}/interviews` $\rightarrow$ `campus_pulse.routes:add_interview`
- `GET /api/campus-pulse/issues/{issue_id}/research` & `GET /api/issues/{issue_id}/research` $\rightarrow$ `campus_pulse.routes:get_research`
- `POST /api/campus-pulse/issues/{issue_id}/verify` & `POST /api/issues/{issue_id}/verify` $\rightarrow$ `campus_pulse.routes:verify_issue`
- `POST /api/campus-pulse/issues/{issue_id}/resolve` & `POST /api/issues/{issue_id}/resolve` $\rightarrow$ `campus_pulse.routes:resolve_issue`

### Campus Lens (`app/campus_lens`)
- `GET /api/campus-lens/status` $\rightarrow$ `campus_lens.routes:campus_lens_status`
- `POST /api/campus-lens/analyze` $\rightarrow$ `campus_lens.routes:analyze_campus_lens`
- `POST /api/campus-lens/quiz` $\rightarrow$ `campus_lens.routes:create_quiz`
- `POST /api/campus-lens/quiz/submit` $\rightarrow$ `campus_lens.routes:submit_quiz`
- `POST /api/campus-lens/teacher-report` $\rightarrow$ `campus_lens.routes:create_teacher_report`

### Core & Application Root
- `GET /health` $\rightarrow$ `main:health`
- `GET /` $\rightarrow$ `main:serve_frontend`
- `GET /docs`, `/redoc`, `/openapi.json` $\rightarrow$ FastAPI automatic endpoints

---

## 5. Shared Infrastructure Mapping

The following components are shared cross-cutting infrastructure and **must remain centralized**:

1. **`app/core/config.py`**:
   - Settings singleton (`settings`).
   - Sourced by database, AI modules, and server bootstrap.
2. **`app/core/exceptions.py`**:
   - `CampusPassportException`, `EntityNotFoundException`, `DomainValidationError`, `ForbiddenException`, `DuplicateResourceException`, `ServiceUnavailableException`.
   - Handlers registered globally on the FastAPI application in `main.py`.
3. **`app/database/database.py`**:
   - SQLAlchemy `engine`, `SessionLocal`, `Base`, `get_db` FastAPI dependency, `get_db_context` context manager.
   - PRAGMA foreign keys listener.
4. **`app/database/models.py`**:
   - Single canonical definitions for: `Student`, `Achievement`, `Opportunity`, `OpportunityApplication`, `PointTransaction`, `SchoolIssue`, `IssueInterview`, `StudentPocketConfig`, `NFCCard`, `Merchant`, `LedgerTransaction`.
5. **`app/database/init_db.py` & `app/database/seed.py`**:
   - DDL table generation (`Base.metadata.create_all`) and idempotent initial seeding.

---

## 6. Dependency Relationships

```text
               ┌─────────────┐
               │  app/core   │
               └──────┬──────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│   app/database   │      │     app/auth     │ (Future Sidharth Auth)
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         ├─────────────────────────┼────────────────────────┐
         │                         │                        │
         ▼                         ▼                        ▼
┌──────────────────┐      ┌──────────────────┐     ┌──────────────────┐
│   app/students   │      │app/student_pocket│     │ app/campus_pulse │
└────────┬─────────┘      └────────┬─────────┘     └────────┬─────────┘
         │                         │                        │
         ├─────────────────────────┼────────────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────────┐
│   app/passport   │      │app/opportunity_wallet│
└──────────────────┘      └──────────────────────┘
         ▲
         │
┌──────────────────┐
│ app/campus_lens  │ (Independent AI & Scoring Pipeline)
└──────────────────┘
```

1. **Core** has zero internal application dependencies.
2. **Database** depends only on `Core` (`config.py`).
3. **Domain features** (`students`, `student_pocket`, `campus_pulse`, `opportunity_wallet`, `campus_lens`) depend on `Core` and `Database`. They **never depend on each other's route modules**.
4. **Passport** acts as an aggregator: it retrieves summary data across models via its own service layer, avoiding direct route-to-route calls.
5. **Campus Lens** is an autonomous feature: its AI vision calls, prompt logic, parser, deterministic quiz scoring, and teacher report service belong entirely inside `campus_lens/`.

---

## 7. Circular Dependency Risks

1. **Passport $\leftrightarrow$ Student Pocket:**
   - *Risk:* `passport.py` routes currently import `student_pocket_service`, while `student_pocket` routes might want passport snapshots.
   - *Solution:* Student Pocket must never import from Passport. Passport service imports from `student_pocket.service` (or queries shared models directly).
2. **Points Service $\leftrightarrow$ Campus Pulse / Campus Lens:**
   - *Risk:* `point_service.py` currently contains functions to award points specifically for Campus Pulse and Campus Lens.
   - *Solution:* Keep point transaction recording general (`record_point_transaction` in database/crud or student_pocket). Let Campus Pulse and Campus Lens call this shared function rather than maintaining a monolithic cross-domain point service.
3. **Database Models $\leftrightarrow$ Feature Services:**
   - *Risk:* Services defining their own models or circular imports between models and feature logic.
   - *Solution:* All ORM models stay strictly within `app/database/models.py`. Feature services import models from `backend.app.database.models`.

---

## 8. Duplicated Implementation Risks

1. **Achievements Creation vs Query:**
   - `GET /api/student/{student_id}/achievements` is in `passport.py`.
   - `POST /api/student/{student_id}/achievements` is in `student_pocket.py`.
   - *Risk:* Disjoint validation and split maintenance.
   - *Solution:* Consolidate achievements handling cleanly: either own both in `passport` or own both in `student_pocket`. Recommended: `passport` owns achievements presentation; `student_pocket` owns awards/achievements creation during activities.
2. **Opportunity Wallet Default Fallback:**
   - `app/opportunity_wallet/service.py` contains `DEFAULT_OPPORTUNITIES` fallback when the database has no records.
   - *Risk:* Inconsistent source of truth between test assertions and production DB state.
   - *Solution:* As established in ADR-008, fallback catalog should be restricted to development/demo-seed fallback; seeded database must be the source of truth.

---

## 9. Empty / Unused Module Findings

During code inspection, the following files were found to be empty (0 bytes) or legacy stubs:

1. **`app/campus_lens/` (current empty directory structure):**
   - `app/campus_lens/__init__.py` (0 bytes)
   - `app/campus_lens/ai/__init__.py` (0 bytes)
   - `app/campus_lens/routes/__init__.py` (0 bytes)
   - `app/campus_lens/schemas/__init__.py` (0 bytes)
   - `app/campus_lens/services/__init__.py` (0 bytes)
   - *Finding:* A target skeleton was pre-created, but all working implementation currently resides in `app/routes/campus_lens.py`, `app/schemas/campus_lens.py`, `app/ai/*`, and `app/services/*`.
2. **`app/services/campus_lens_service.py`:**
   - 0 bytes. Completely unused.
3. **`app/ai/gemini.py`:**
   - 0 bytes. Unused placeholder for Gemini provider.
4. **`app/my_school_my_fix/`:**
   - `__init__.py` (0 bytes), `routes.py` (0 bytes), `schemas.py` (0 bytes), `service.py` (0 bytes).
   - `models.py` (8 lines): Merely re-exports `SchoolIssue` and `IssueInterview` from `backend.app.database.models`.
   - *Finding:* Deprecated early working name for Campus Pulse. Not imported by `main.py` or any tests.
5. **`tests/campus_lens/`:**
   - `test_api.py` (0 bytes), `test_parser.py` (0 bytes), `test_validation.py` (0 bytes). Only `test_scoring.py` and `test_report.py` contain active test code.

*Action:* Do not delete in T04. Schedule deletion in the appropriate cleanup task after feature migration is proven with tests.

---

## 10. Campus Pulse Duplicate Route Analysis

### Current State
`main.py` registers two distinct routers for the same handlers:
1. `campus_pulse_router` mounted at `/api/campus-pulse` $\rightarrow$ handles `/api/campus-pulse/issues/...`
2. `issues_router` mounted at `/api/issues` $\rightarrow$ handles `/api/issues/...`

### Compatibility Findings
- `test_campus_pulse.py` tests `/api/campus-pulse/issues/...`.
- `test_student_pocket_final.py` tests `/api/issues/...`.
- Both path conventions have live test coverage asserting HTTP 200, 201, 400, and 404 responses.

### Recommendation
- **Canonical Route:** `/api/campus-pulse/issues` represents the consistent feature-namespaced standard.
- **Compatibility Route:** `/api/issues` must be retained as a secondary route alias pointing directly to the canonical handlers.
- **Implementation in T07:** Move the route implementations to `app/campus_pulse/routes.py`. Expose both prefixes from that router without duplicating handler functions.

---

## 11. Campus Lens AI Ownership Analysis

### Current State
Campus Lens AI logic is scattered across centralized packages:
- Route: `app/routes/campus_lens.py`
- AI Vision & Prompts: `app/ai/groq.py`, `app/ai/prompts.py`
- Quiz Generation: `app/ai/quiz.py`
- Parsing & Validation: `app/ai/parser.py`
- Scoring: `app/services/quiz_service.py`
- Reports: `app/services/teacher_report_service.py`

### Ownership Rules
1. **Feature-Owned AI:** Textbook vision analysis, quiz prompt engineering, and quiz output parsing are specific to Campus Lens. They do not belong in a generic global `ai/` folder.
2. **Deterministic Grading Separation (ADR-004 & ADR-005):**
   - Groq vision analyzes the image and extracts concepts.
   - Quiz generation takes extracted concepts and generates MCQs.
   - Scoring is deterministic Python backend logic (`quiz_service.py`), strictly isolated from the AI provider.
   - Teacher report generation is deterministic summary formatting (`teacher_report_service.py`).
3. **Migration Plan (T05):** Consolidate `ai/` logic into `app/campus_lens/ai/`. Move `quiz_service.py` and `teacher_report_service.py` into `app/campus_lens/service.py`.

---

## 12. Auth Integration Boundary for Sidharth

Sidharth owns authentication and role management. To ensure clean integration without rewriting features later:

### Interface Boundary (`app/auth/dependencies.py`)
```python
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel

class UserContext(BaseModel):
    user_id: str
    username: str
    role: str  # "STUDENT", "TEACHER", "ADMIN", "MERCHANT"
    student_id: Optional[str] = None

async def get_current_user(...) -> UserContext:
    """Sidharth will implement real token extraction & signature verification here."""
    ...

def require_role(allowed_roles: List[str]):
    """Returns a dependency checking if user.role is in allowed_roles."""
    async def _role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Role '{user.role}' not permitted.",
            )
        return user
    return _role_checker
```

### Temporary Compatibility with Prototype `X-Actor-Role`
- During Week 1, the prototype header checks in `routes/student_pocket.py` remain active.
- In T09, `verify_actor_role` will be refactored into this dependency interface.
- When Sidharth delivers the JWT/token mechanism, it will be plugged into `get_current_user` without modifying feature route business logic.

---

## 13. Database Ownership Boundary for Parvesh

Parvesh coordinates database models and schema.

### Non-Negotiable Boundaries
1. **Single Source of Schema Truth:** All SQLAlchemy model classes remain in [`app/database/models.py`](file:///Users/aashrith/Campus-Passport/Campus-Passport/backend/app/database/models.py). Feature modules must never declare independent SQLAlchemy `Base` classes or separate SQLite engines.
2. **Session Lifecycle:** Routes obtain sessions through the shared dependency `Depends(get_db)`. Services receive `db: Session` as an argument. Services must never call `SessionLocal()` or `engine.connect()` directly.
3. **Schema Modifications:** Any schema or relationship adjustments required by feature refactorings must be documented and coordinated with Parvesh rather than applied arbitrarily.

---

## 14. Safe Migration Order for T05 Onward

Migration must proceed incrementally, verifying tests after every step:

```text
T05 (Campus Lens)
       ↓
T06 (Opportunity Wallet)
       ↓
T07 (Campus Pulse & Issue Aliases)
       ↓
T08 (Passport Aggregation Service)
       ↓
T09 (Isolate Prototype Authorization)
       ↓
T10 (Students Feature Extraction)
       ↓
T11 (Database Initialization & Seed Policy)
       ↓
T12 (Testing & Integration Verification)
       ↓
T13 (Documentation, Cleanup & Handoff)
```

1. **T05 - Campus Lens:** Self-contained feature with no external feature dependencies; perfect candidate for the first complete feature-first migration.
2. **T06 - Opportunity Wallet:** Already largely feature-local; standardize boundaries and fallback behavior.
3. **T07 - Campus Pulse:** Consolidate duplicated router wiring; verify both issue paths.
4. **T08 - Passport:** Extract aggregation logic from `routes/passport.py` into a clean service layer.
5. **T09 - Prototype Auth Isolation:** Wrap `X-Actor-Role` behind dependency boundaries for Sidharth.
6. **T10 - Students Feature:** Extract student directory endpoints from `student_pocket` into `students/`.
7. **T11 - DB Init Cleanup:** Decouple demo seeding from general startup.
8. **T12 - Integration Verification:** Run all test suites against the final architecture.
9. **T13 - Cleanup:** Delete legacy empty files (`gemini.py`, `my_school_my_fix/`), update README, and prepare handoff.

---

## 15. Files That MUST NOT Be Moved

- `app/core/config.py` (Centralized configuration)
- `app/core/exceptions.py` (Centralized exception handling)
- `app/database/database.py` (Shared SQLAlchemy engine & session)
- `app/database/models.py` (Canonical models)
- `app/database/init_db.py` (Database initialization)
- `app/database/seed.py` (Deterministic seeding)
- `app/main.py` (Application root & lifespan wiring)

---

## 16. Files That Should Eventually Move

- `app/routes/campus_lens.py` $\rightarrow$ `app/campus_lens/routes.py`
- `app/schemas/campus_lens.py`, `quiz.py`, `teacher_report.py` $\rightarrow$ `app/campus_lens/schemas.py`
- `app/ai/groq.py`, `quiz.py`, `parser.py`, `prompts.py` $\rightarrow$ `app/campus_lens/ai/*`
- `app/services/quiz_service.py`, `teacher_report_service.py` $\rightarrow$ `app/campus_lens/service.py`
- `app/routes/campus_pulse.py` $\rightarrow$ `app/campus_pulse/routes.py`
- `app/schemas/campus_pulse.py` $\rightarrow$ `app/campus_pulse/schemas.py`
- `app/services/campus_pulse_service.py` $\rightarrow$ `app/campus_pulse/service.py`
- `app/routes/passport.py` $\rightarrow$ `app/passport/routes.py`
- `app/routes/student_pocket.py` (student endpoints) $\rightarrow$ `app/students/routes.py`
- `app/routes/student_pocket.py` (pocket endpoints) $\rightarrow$ `app/student_pocket/routes.py`
- `app/schemas/student_pocket.py` $\rightarrow$ `app/student_pocket/schemas.py`
- `app/services/student_pocket_service.py` $\rightarrow$ `app/student_pocket/service.py`

---

## 17. Files That Should Be Deleted Only After Migration and Tests

- `app/ai/gemini.py` (Empty placeholder)
- `app/services/campus_lens_service.py` (Empty placeholder)
- `app/my_school_my_fix/` (Entire folder: empty stubs and re-export)
- `tests/campus_lens/test_api.py`, `test_parser.py`, `test_validation.py` (Empty test stubs)

---

## 18. Compatibility Requirements

1. **Path Compatibility:** All 45 registered endpoints must remain accessible with their current HTTP methods and URL paths.
2. **Dual Route Aliases:** Both `/api/campus-pulse/issues` and `/api/issues` must continue functioning with identical behavior.
3. **Payload Compatibility:** Response models for existing successful endpoints and `{"detail": ...}` error responses must not change.
4. **Deterministic Evaluation:** Image analysis must never generate quiz questions directly; quiz generation and deterministic scoring must remain separated.
5. **Database Immutability:** No schema tables, column types, or constraint names may be modified during feature reorganization.
