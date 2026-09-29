# Week 1 Backend Plan

## Objective

Establish a stable backend foundation for Campus Passport so other team members can build features without depending on inconsistent module boundaries.

The goal is **architecture stabilization, not feature completion**.

## Target architecture

Use feature-first organization for application functionality:

```text
backend/
└── app/
    ├── main.py
    ├── core/
    │   ├── config.py
    │   ├── security.py
    │   ├── exceptions.py
    │   └── logging.py
    ├── database/
    │   ├── database.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── init_db.py
    │   └── seed.py
    ├── auth/
    │   ├── routes.py
    │   ├── schemas.py
    │   ├── service.py
    │   └── dependencies.py
    ├── students/
    │   ├── routes.py
    │   ├── schemas.py
    │   └── service.py
    ├── passport/
    │   ├── routes.py
    │   ├── schemas.py
    │   └── service.py
    ├── student_pocket/
    │   ├── routes.py
    │   ├── schemas.py
    │   └── service.py
    ├── campus_pulse/
    │   ├── routes.py
    │   ├── schemas.py
    │   └── service.py
    ├── campus_lens/
    │   ├── routes.py
    │   ├── schemas.py
    │   ├── service.py
    │   └── ai/
    │       ├── groq.py
    │       ├── parser.py
    │       └── prompts.py
    └── opportunity_wallet/
        ├── routes.py
        ├── schemas.py
        └── service.py
```

This is a target, not a command to move every file immediately.

## Design rules

### Routes

Routes should:
- define HTTP paths,
- parse request data,
- resolve dependencies,
- call services,
- return response models,
- translate known domain errors into HTTP errors.

Routes should not contain large database queries or business workflows.

### Services

Services should:
- contain business rules,
- orchestrate database operations,
- coordinate feature-specific behavior,
- remain testable without HTTP concerns.

### Database

The database package remains shared infrastructure.

There should be one session/engine configuration.

Feature services should not create independent database engines.

### Core

Core owns cross-cutting configuration and infrastructure:
- settings,
- security dependencies,
- shared exception handling,
- logging.

### AI

AI code should belong to the feature that owns the AI workflow when practical.

Campus Lens should own textbook analysis, quiz generation, parsing, and related prompts.

AI output must be validated before being treated as structured application data.

## Integration with Sidharth

Sidharth owns authentication and role implementation.

Aashrith's Week 1 work should:
1. preserve current prototype role checks temporarily;
2. avoid designing a competing auth system;
3. identify every endpoint requiring role protection;
4. expose clean dependency boundaries where Sidharth's auth dependencies can be inserted;
5. replace prototype request-header/query/body role checks only after the real auth contract is agreed.

Expected eventual pattern:

```text
request
  ↓
auth dependency
  ↓
authenticated user + role
  ↓
route
  ↓
service
```

## Integration with Parvesh

Parvesh owns/coordinates database model work.

Aashrith should:
- use the shared database/session infrastructure,
- avoid duplicating models,
- avoid changing schema assumptions without coordination,
- keep service logic independent from HTTP,
- document any required model changes before implementing them.

## Migration principles

1. Start with characterization tests around existing behavior.
2. Centralize configuration.
3. Establish shared exception conventions.
4. Introduce feature package boundaries.
5. Move one feature at a time.
6. Keep compatibility imports/routes temporarily where necessary.
7. Remove duplication only after tests prove equivalent behavior.
8. Refactor Passport aggregation.
9. Integrate auth dependencies.
10. Finish with startup, API, and integration verification.

## Acceptance criteria

Week 1 is successful when:
- backend starts cleanly,
- `/health` works,
- database initialization works,
- existing major endpoints remain functional,
- configuration is centralized,
- feature ownership is predictable,
- routes are thinner,
- no duplicate business implementation is introduced,
- prototype auth is clearly isolated for later replacement,
- tests cover startup and key feature flows,
- `.env` remains local and untracked,
- README/setup instructions match the actual startup process,
- Git diff is reviewable.
