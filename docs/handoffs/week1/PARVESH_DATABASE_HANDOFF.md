# Parvesh — Week 1 Database and Data-Model Handoff

## Starting point

Week 1 stabilized the shared SQLAlchemy database foundation. The database is shared infrastructure, not a feature-owned replacement target. Preserve the one-engine, one-session configuration and canonical model layer while coordinating changes with feature owners.

Read first: `AGENTS.md`, `WEEK1_BACKEND_PLAN.md`, `DECISIONS.md`, `ARCHITECTURE_OWNERSHIP.md`, and `Campus-Passport/backend/app/database/README.md`.

## Canonical database boundary

```text
Campus-Passport/backend/app/database/
├── database.py      # engine, SessionLocal, Base, FastAPI/context dependencies
├── models.py        # canonical ORM models
├── schemas.py       # shared database schemas
├── crud.py           # shared persistence helpers
├── init_db.py       # table creation and initialization orchestration
├── seed.py           # deterministic demo data
└── schema.sql        # conceptual database contract
```

`initialize_database(seed_demo=...)` is the established lifecycle entry point. Table creation and demo seeding are separate and idempotent; keep that separation. The application startup currently requests deterministic demo seeding.

## Existing shared model domains

The canonical models cover students, achievements, opportunities and applications, point transactions, Campus Pulse issues and interviews, Student Pocket ledger/configuration/NFC cards, and merchants. Other modules must reference the stable `students` records (the documented demo identifier is `STU001`) rather than creating independent student tables.

Points are ledgered in `point_transactions`; do not add an editable `total_points` field to students. Student Pocket additionally owns its ledger rules through the shared models. Consult the feature owner before changing a model that feeds Passport aggregation, Opportunity Wallet eligibility, Campus Pulse verification, or Student Pocket balances.

## Scope and guardrails

- Make schema/model work only through `app/database` and keep feature services on the shared session dependency.
- Keep `schema.sql` and `models.py` aligned when their contract changes.
- Preserve foreign keys, constraints, and idempotency behavior; in particular, verify ledger transaction and NFC/purchase flows after affected changes.
- Do not create a second database engine, separate feature database, destructive initializer, or untracked migration scheme.
- Seed data is for explicit/demo initialization. ADR-008 says normal application behavior should not silently substitute an in-memory catalog for unavailable persisted data.

## Verification

Start with `backend/tests/test_database.py`, then run affected feature tests and `backend/tests/run_all_tests.py` for shared-model changes. Confirm a repeated initialization neither drops data nor creates duplicates. Keep local `campus.db`, `.env`, caches, and virtual environments out of commits.

## Coordination outputs

Before landing a model contract change, provide Aashrith with affected endpoint/aggregation implications, Sidharth with any identity/auth persistence needs, Anirudh with response-shape impacts, and Vatsa with reproducible test/seed instructions. Record an accepted architecture decision in `DECISIONS.md` when it changes a cross-feature contract.
