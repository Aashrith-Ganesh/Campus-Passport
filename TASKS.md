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

## T10 - Students API foundation

### Goal
Give student-related APIs a clear home.

### Actions
Create the students feature only around existing behavior.

Do not duplicate Student model/database logic.

Move student listing/retrieval behavior from Student Pocket routes if that is the correct ownership after inspection.

### Verification
Existing student endpoints continue working.

### Acceptance
Student identity APIs have one feature owner.

---

## T11 - Database initialization cleanup

### Goal
Separate application startup from demo-data policy.

### Actions
Review `initialize_database(seed_demo=True)`.

Decide how development/demo seeding should be controlled through configuration.

Do not remove seed data needed for local demos.

### Verification
Fresh local environment can initialize predictably.

### Acceptance
Production-style startup does not silently depend on demo data.

---

## T12 - Testing and integration

### Minimum checks

1. Backend startup.
2. `/health`.
3. `/docs`.
4. Frontend `/`.
5. Database initialization.
6. Student retrieval.
7. Passport retrieval.
8. Points/balance behavior.
9. Campus Pulse issue flow.
10. Opportunity eligibility/application.
11. Campus Lens analysis contract.
12. Quiz generation/parsing.
13. Quiz scoring.
14. Role-protected endpoints.
15. `.env` ignored by Git.

### Acceptance

All relevant tests pass and `git diff` contains only intended changes.

---

## T13 - Documentation and handoff

Update:
- README startup instructions,
- architecture documentation,
- environment setup,
- API ownership,
- Week 1 completion status.

Record unresolved work for Week 2.

### Final acceptance

Another team member should be able to:
1. clone the repository,
2. configure `.env`,
3. start the backend,
4. understand where each feature lives,
5. run tests,
6. identify the auth/database integration points,
7. continue development without reverse-engineering the whole project.
