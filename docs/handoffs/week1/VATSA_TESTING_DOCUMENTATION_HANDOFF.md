# Vatsa — Week 1 Testing, Documentation, and Support Handoff

## Starting point

Week 1 backend stabilization is complete on this branch's parent (`week-one/backend/base`). The application remains a single FastAPI service with a static frontend, shared SQLAlchemy persistence, and existing API compatibility as the default. This handoff does not authorize a feature rewrite.

Read before changing anything:

1. `AGENTS.md`
2. `WEEK1_BACKEND_PLAN.md`
3. `TASKS.md`
4. `DECISIONS.md`
5. `ARCHITECTURE_OWNERSHIP.md`

## Your ownership

- Maintain repeatable verification for existing backend behavior.
- Keep setup and API documentation accurate as the team makes agreed changes.
- Support teammates with focused reproduction notes and regression coverage.
- Do not change authentication policy, database schema, or feature behavior merely to make a test pass; raise the mismatch with the relevant owner.

## Existing verification baseline

The authoritative suite runner is `Campus-Passport/backend/tests/run_all_tests.py`. It exercises seven groups:

1. database CRUD and persistence;
2. Opportunity Wallet list, eligibility, application, and duplicate prevention;
3. Campus Pulse issue lifecycle and the three-interview rule;
4. points and duplicate prevention;
5. Passport endpoints;
6. Student Pocket ledger and balance rules; and
7. Student Pocket end-to-end integration, including role enforcement, NFC, purchases, issue flow, and Passport snapshots.

From the repository root, the documented command is:

```bash
PYTHONPATH="." backend/.venv/bin/python backend/tests/run_all_tests.py
```

The Week 1 acceptance record says all seven suites passed. Treat a failure as a regression to isolate, not a reason to weaken the test.

## High-value smoke checks

When a teammate changes an integration boundary, verify `/health`, `/docs`, and `/` plus the affected API path. Preserve existing response shapes and public paths unless an approved decision record says otherwise. In particular, retain both Campus Pulse path families where required and verify the Student Pocket frontend's calls to student, balance, transaction, card, reward, and NFC APIs.

For defects, record the branch/commit, exact request or test command, expected versus actual result, and whether a seeded database was used. Never put `.env` values, API keys, or local database contents in notes or commits.

## Documentation responsibilities

- Update `README.md` only when a verified setup or public API detail changes.
- Update `TASKS.md` when a task's status or verification evidence changes.
- Update `DECISIONS.md` only for an actual architecture decision, not an implementation diary.
- Keep the distinction between Campus Lens image analysis and quiz generation explicit; scoring remains deterministic backend logic.

## Completion checklist

- Run the smallest relevant test first, then the suite runner for cross-feature work.
- Confirm no generated database, `.env`, virtual-environment, or cache files are staged.
- Document actual commands and outcomes, without secrets.
- Keep commits limited to test or documentation support and state the verified scope in the commit message.
