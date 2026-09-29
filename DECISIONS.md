# Architecture Decisions

## ADR-001 - Preserve the existing backend

**Status:** Accepted

### Decision

Campus Passport will be incrementally refactored rather than rewritten.

### Reason

The current backend already has working FastAPI routing, SQLAlchemy persistence, seeded demo data, Student Pocket logic, Opportunity Wallet logic, Campus Pulse behavior, Campus Lens AI flow, deterministic quiz scoring, and teacher-report generation.

### Consequence

Every architectural change must preserve working behavior unless a deliberate API/behavior change is documented.

---

## ADR-002 - Use feature-first application organization

**Status:** Accepted

### Decision

Application features should eventually own their routes, schemas, services, and feature-specific AI logic.

### Reason

The current project mixes centralized and feature-local structures. Feature ownership makes it easier for multiple developers to work independently and understand boundaries.

### Consequence

Migration should move one feature at a time. Shared database and core infrastructure remain centralized.

---

## ADR-003 - Keep database infrastructure shared

**Status:** Accepted

### Decision

Use one SQLAlchemy engine/session infrastructure and one shared database model layer.

### Reason

The current application already has a centralized database package.

### Consequence

Feature services consume the shared session. Features must not create separate database engines.

---

## ADR-004 - Keep quiz scoring deterministic

**Status:** Accepted

### Decision

The backend, not the AI model, remains the source of truth for quiz correctness and scoring.

### Reason

Current `quiz_service.py` deterministically compares submitted answers with the question's correct answer.

### Consequence

AI may generate questions, but scoring, percentages, concept results, and adaptive difficulty remain backend logic.

---

## ADR-005 - Campus Lens analysis and quiz generation remain separate

**Status:** Accepted

### Decision

Textbook image analysis does not generate quiz questions. A separate quiz-generation flow does.

### Reason

The current Campus Lens prompt explicitly requires `"quiz": []`.

### Consequence

The schema and endpoint contracts should be updated to communicate this separation clearly.

---

## ADR-006 - Configuration belongs in core

**Status:** Accepted

### Decision

Environment and application settings should be centralized under `app/core/config.py`.

### Reason

The current application and AI modules independently load `.env`.

### Consequence

Feature modules should consume configuration instead of implementing their own environment-path discovery.

---

## ADR-007 - Authentication integration is dependency-based

**Status:** Accepted

### Decision

Authentication and role checks should eventually enter through shared dependencies.

### Reason

Student Pocket currently contains prototype role checking based on request values. Sidharth owns the real authentication/role implementation.

### Consequence

Week 1 prepares clean integration boundaries but does not invent a replacement authentication system.

---

## ADR-008 - Demo data is seeded, not silently substituted

**Status:** Proposed for implementation

### Decision

Normal application behavior should use the shared database as the source of truth. Demo records should come from explicit seed logic.

### Reason

Opportunity Wallet currently contains a fallback in-memory catalog when database data is absent.

### Consequence

Fallback behavior should be retained only where explicitly useful for tests/development, and should not silently hide database configuration problems.

---

## ADR-009 - API compatibility is the default

**Status:** Accepted

### Decision

Existing public API paths and response shapes should remain compatible during the Week 1 refactor unless there is a documented reason to change them.

### Reason

Frontend and parallel team work may already depend on current endpoints.

### Consequence

Compatibility aliases may be temporary, but they must point to one implementation and have a documented removal condition.

---

## ADR-010 - Students identity APIs owned by students feature

**Status:** Accepted

### Decision

Student lookup endpoints (`/api/students`, `/api/students/{student_id}`) belong exclusively to `app/students/`.

### Reason

Earlier prototype placed student queries in `student_pocket`. Extracting them to `app/students/` decouples generic student identity from financial pocket logic.

### Consequence

`student_pocket` delegates student queries to `students.service`. Endpoints remain backwards compatible.

---

## ADR-011 - Centralized database lifecycle with separate table creation and seeding

**Status:** Accepted

### Decision

Database initialization in `app/database/init_db.py` cleanly separates schema generation (`create_tables()`) from demo data population (`seed_demo()`).

### Reason

Production and testing environments require predictable, idempotent initialization without unintended data deletion or repeated table dropping.

### Consequence

`initialize_database(seed_demo=...)` remains the single orchestrator for application lifespan and testing suites.
