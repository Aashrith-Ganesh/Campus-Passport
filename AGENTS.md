# Campus Passport Backend Agent Rules

## Purpose

This repository is being stabilized during Week 1. The goal is to establish a predictable backend foundation without rewriting working features.

## Non-negotiable rules

1. Inspect before changing.
2. Do not rewrite the backend from scratch.
3. Do not delete working features merely because their location is inconsistent.
4. Preserve existing API behavior unless a change is explicitly documented and verified.
5. Make one small architectural change at a time.
6. Run relevant tests after every meaningful change.
7. Keep database behavior stable unless the task explicitly concerns the database.
8. Do not invent authentication behavior. Sidharth owns the authentication/roles implementation; integrate with it when available.
9. Do not replace Parvesh's database work blindly. Treat the shared SQLAlchemy database as the current foundation.
10. Never commit `.env`, API keys, `.venv`, `__pycache__`, or generated local state.
11. Prefer moving responsibility over duplicating logic.
12. Do not create compatibility wrappers indefinitely. If a temporary compatibility layer is needed, document its removal condition.
13. Keep `main.py` as application wiring, not business logic.
14. Routes should validate/request/response concerns and delegate business logic to services.
15. Services own business rules and orchestration.
16. Database modules own persistence infrastructure and database access.
17. AI modules must not silently become sources of truth for deterministic grading or database facts.
18. Preserve the Campus Lens contract: image analysis does not generate quiz questions; the quiz-generation flow does.
19. Do not expose secrets in logs, documentation, commits, or test output.

## Before editing

Read:
- `ARCHITECTURE_AUDIT.md`
- `WEEK1_BACKEND_PLAN.md`
- `TASKS.md`
- `DECISIONS.md`

Then inspect the exact files named by the task.

## Completion standard

A task is not complete merely because the code runs. Verify:
- imports/startup,
- relevant endpoint behavior,
- relevant tests,
- no accidental API changes,
- no secrets added,
- clean `git diff`,
- and documentation/decision records when architecture changes.
