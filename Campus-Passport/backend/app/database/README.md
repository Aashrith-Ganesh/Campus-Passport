# Campus Passport Shared Database

Database-only package for integration into an existing backend.

## Source of truth

`schema.sql` is the conceptual database contract.

SQLAlchemy models in `models.py` mirror that schema and can generate the
SQLite tables automatically.

## Shared tables

1. `students`
2. `achievements`
3. `opportunities`
4. `opportunity_applications`
5. `point_transactions`
6. `school_issues`
7. `issue_interviews`

All modules should use the same `students` and `achievements` records.

## Module mapping

- Campus Lens -> `students`, `achievements`
- Campus Pulse / My School My Fix -> `students`, `achievements`,
  `school_issues`, `issue_interviews`
- Points -> `students`, `achievements`, `point_transactions`
- Opportunity Wallet -> `students`, `opportunities`,
  `opportunity_applications`
- Passport -> reads shared student data, achievements, points,
  opportunities/applications, and issue/contribution records as needed

## Integration

Copy:

```text
backend/app/database/
```

into the existing backend.

Initialize during the existing backend startup/lifespan:

```python
from backend.app.database import initialize_database

initialize_database()
```

To add demo records:

```python
initialize_database(seed_demo=True)
```

## FastAPI dependency

```python
from backend.app.database.database import get_db
```

Then:

```python
from fastapi import Depends
from sqlalchemy.orm import Session

def endpoint(db: Session = Depends(get_db)):
    ...
```

## Shared student rule

Other modules must reference the stable student identifier:

```text
student_id = "STU001"
```

They should not create separate Student tables.

## Achievement rule

Current allowed values:

```text
LEARNING
CONTRIBUTION
```

Typical sources:

```text
CAMPUS_LENS
CAMPUS_PULSE
MY_SCHOOL_MY_FIX
```

## Points rule

Do not store an editable `total_points` on the student.

Points are stored in `point_transactions` and the total is calculated with:

```python
from backend.app.database.crud import get_student_total_points
```

## No app included

This package intentionally contains no `main.py`, no API routes, no frontend,
and no authentication UI. It is intended to plug into the team's existing
backend without replacing it.
