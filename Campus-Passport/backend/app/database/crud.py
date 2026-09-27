from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import (
    Achievement,
    IssueInterview,
    Opportunity,
    OpportunityApplication,
    PointTransaction,
    SchoolIssue,
    Student,
)
from .schemas import (
    AchievementCreate,
    IssueInterviewCreate,
    OpportunityApplicationCreate,
    OpportunityCreate,
    PointTransactionCreate,
    SchoolIssueCreate,
    StudentCreate,
)


def get_student(db: Session, student_id: str):
    return db.get(Student, student_id)


def create_student(db: Session, data: StudentCreate):
    if get_student(db, data.id):
        raise ValueError("Student ID already exists")
    row = Student(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_achievement(db: Session, data: AchievementCreate):
    if not get_student(db, data.student_id):
        raise ValueError("Student does not exist")
    row = Achievement(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_student_achievements(db: Session, student_id: str):
    return (
        db.query(Achievement)
        .filter(Achievement.student_id == student_id)
        .order_by(Achievement.timestamp.desc())
        .all()
    )


def create_opportunity(db: Session, data: OpportunityCreate):
    if db.get(Opportunity, data.id):
        raise ValueError("Opportunity ID already exists")
    row = Opportunity(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_opportunity_application(
    db: Session,
    data: OpportunityApplicationCreate,
):
    if not get_student(db, data.student_id):
        raise ValueError("Student does not exist")
    if not db.get(Opportunity, data.opportunity_id):
        raise ValueError("Opportunity does not exist")
    if db.get(OpportunityApplication, data.id):
        raise ValueError("Application ID already exists")
    row = OpportunityApplication(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_point_transaction(db: Session, data: PointTransactionCreate):
    if not get_student(db, data.student_id):
        raise ValueError("Student does not exist")
    if data.achievement_id is not None and not db.get(Achievement, data.achievement_id):
        raise ValueError("Achievement does not exist")
    row = PointTransaction(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_student_total_points(db: Session, student_id: str) -> int:
    total = (
        db.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.student_id == student_id)
        .scalar()
    )
    return int(total or 0)


def create_school_issue(db: Session, data: SchoolIssueCreate):
    if not get_student(db, data.student_id):
        raise ValueError("Student does not exist")
    if db.get(SchoolIssue, data.id):
        raise ValueError("Issue ID already exists")
    row = SchoolIssue(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_issue_interview(db: Session, data: IssueInterviewCreate):
    if not db.get(SchoolIssue, data.issue_id):
        raise ValueError("School issue does not exist")
    row = IssueInterview(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_passport_snapshot(db: Session, student_id: str):
    student = get_student(db, student_id)
    if student is None:
        return None

    return {
        "student": student,
        "achievements": get_student_achievements(db, student_id),
        "total_points": get_student_total_points(db, student_id),
        "applications": (
            db.query(OpportunityApplication)
            .filter(OpportunityApplication.student_id == student_id)
            .all()
        ),
        "school_issues": (
            db.query(SchoolIssue)
            .filter(SchoolIssue.student_id == student_id)
            .all()
        ),
    }
