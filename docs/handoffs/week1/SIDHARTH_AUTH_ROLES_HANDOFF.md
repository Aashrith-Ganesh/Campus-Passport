# Sidharth — Week 1 Authentication and Roles Handoff

## Starting point

Week 1 created an explicit authentication integration boundary without inventing a final authentication system. Your work owns the implementation behind that boundary. Preserve current API behavior until a real contract is agreed and verified.

Read first: `AGENTS.md`, `WEEK1_BACKEND_PLAN.md`, `TASKS.md`, `DECISIONS.md`, and `ARCHITECTURE_OWNERSHIP.md`.

## Current boundary

Authentication code is intentionally isolated in:

```text
Campus-Passport/backend/app/auth/
├── dependencies.py
└── schemas.py
```

`get_current_user()` currently produces `UserContext` from the prototype `X-Actor-Role` header or `actor_role` query parameter. `require_role()` provides the intended FastAPI dependency shape. `verify_actor_role()` remains a compatibility helper for existing Student Pocket routes, which also support a prototype body role.

The current recognized roles are `STUDENT`, `TEACHER`, `ADMIN`, and `MERCHANT`. `UserContext` contains `user_id`, `username`, `role`, and optional `student_id`.

## Scope

1. Agree and document the credential/token contract before replacing prototype extraction.
2. Implement authentication and role resolution in `app/auth` rather than inside feature routes.
3. Keep features consuming an authenticated user through dependencies.
4. Migrate existing protected routes deliberately, retaining documented compatibility where it is still needed.
5. Verify authorization failures use the established HTTP `403` behavior and `{"detail": "..."}` error shape.

## Existing protected integration points

Student Pocket currently protects teacher/admin actions such as rewards, deductions, achievement recording, NFC-card registration, and related administrative operations. Merchant-facing NFC tap/purchase behavior is also role-sensitive. Inspect `app/routes/student_pocket.py` before editing a dependency or request contract.

The static frontend currently sends `X-Actor-Role` for its prototype flows. Do not silently remove that behavior; coordinate a frontend change with Anirudh if the final browser contract changes.

## Constraints from accepted decisions

- ADR-007: authentication integration is dependency-based.
- ADR-009: public API paths and response shapes are compatible by default.
- No secrets, tokens, passwords, or `.env` contents may be committed or logged.
- Do not add a second database engine or independent user store without an agreed database change with Parvesh.

## Verification and handoff

Add focused tests for token/credential parsing, role checks, invalid credentials, and protected-route behavior. Re-run `Campus-Passport/backend/tests/run_all_tests.py` after a cross-feature migration. Record any compatibility removal condition in `DECISIONS.md` or the relevant task documentation, and provide Anirudh and Vatsa the final client contract and test evidence.
