# Aashrith — Week 2 Backend Architecture and Integration Plan

## Purpose

Week 2 should consolidate agreed team work into the stabilized backend without reopening the Week 1 refactor. This plan is a sequencing and integration guide, not authorization for a rewrite or API break.

## Entry criteria

- Work begins from `week-one/backend/base` or an approved descendant.
- Each feature change has a named owner, a small reviewable scope, and relevant test evidence.
- Any database or client-contract change is known to Parvesh or Anirudh respectively.
- Authentication changes have a documented contract from Sidharth before prototype behavior is removed.

## Integration sequence

1. **Confirm the baseline.** Run the existing suite and smoke-check startup, `/health`, `/docs`, and `/` before merging feature work.
2. **Land shared contracts first.** Review accepted authentication and database changes for a single dependency/session path; do not independently reimplement either concern.
3. **Integrate feature changes incrementally.** Keep routes thin, services feature-local, and shared models centralized. Preserve compatibility aliases where existing clients require them.
4. **Validate browser integration.** Verify the static frontend against the final API paths, response shapes, and auth transition plan.
5. **Run regression and document outcomes.** Run the full suite after cross-feature merges. Update task status, decisions, and setup/API documentation only for verified changes.

## Decision checkpoints

Before accepting a pull request, answer:

- Does the change preserve ADR-001, ADR-003, ADR-004, ADR-005, ADR-007, and ADR-009?
- Does it use the existing `app/auth` and `app/database` boundaries?
- Are endpoint paths/response shapes unchanged, or is the transition documented and coordinated?
- Does it add focused tests and avoid committing generated local state or secrets?
- Has the relevant owner reviewed cross-feature implications?

## Week 2 success criteria

- One authoritative auth dependency path is agreed and integrated without an accidental client break.
- Database changes remain backward-safe, initialized idempotently, and covered by tests.
- Feature work remains inside the ownership map, with no duplicate service or route logic.
- The served frontend works against the documented backend contract.
- The full backend regression suite passes after the final integration.

## Escalation rule

Pause integration and record the question when a proposed change requires a new data model, a public API change, a different role policy, or a second source of truth. Resolve it with the responsible owner before implementation rather than encoding an assumption in the integration branch.
