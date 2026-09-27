from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    class_name = Column(String, nullable=False)
    preferred_language = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    achievements = relationship("Achievement", back_populates="student")
    opportunity_applications = relationship(
        "OpportunityApplication", back_populates="student"
    )
    point_transactions = relationship(
        "PointTransaction", back_populates="student"
    )
    school_issues = relationship("SchoolIssue", back_populates="student")
    ledger_transactions = relationship(
        "LedgerTransaction", back_populates="student"
    )
    pocket_config = relationship(
        "StudentPocketConfig", back_populates="student", uselist=False
    )
    nfc_cards = relationship("NFCCard", back_populates="student")




class Achievement(Base):
    __tablename__ = "achievements"
    __table_args__ = (
        CheckConstraint(
            "type IN ('LEARNING', 'CONTRIBUTION')",
            name="ck_achievement_type",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String, nullable=False, index=True)
    evidence = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    student = relationship("Student", back_populates="achievements")
    point_transactions = relationship(
        "PointTransaction", back_populates="achievement"
    )


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    applications = relationship(
        "OpportunityApplication", back_populates="opportunity"
    )


class OpportunityApplication(Base):
    __tablename__ = "opportunity_applications"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    opportunity_id = Column(
        String,
        ForeignKey("opportunities.id"),
        nullable=False,
        index=True,
    )
    status = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    student = relationship("Student", back_populates="opportunity_applications")
    opportunity = relationship("Opportunity", back_populates="applications")


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    achievement_id = Column(
        Integer,
        ForeignKey("achievements.id"),
        nullable=True,
        index=True,
    )
    points = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    source = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    student = relationship("Student", back_populates="point_transactions")
    achievement = relationship("Achievement", back_populates="point_transactions")


class SchoolIssue(Base):
    __tablename__ = "school_issues"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    student = relationship("Student", back_populates="school_issues")
    interviews = relationship("IssueInterview", back_populates="issue")


class IssueInterview(Base):
    __tablename__ = "issue_interviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    issue_id = Column(
        String,
        ForeignKey("school_issues.id"),
        nullable=False,
        index=True,
    )
    participant_type = Column(String, nullable=False)
    participant_name = Column(String, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    issue = relationship("SchoolIssue", back_populates="interviews")


class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('ACADEMIC', 'CAMPUS')",
            name="ck_ledger_purpose",
        ),
        CheckConstraint(
            "transaction_type IN ('REWARD', 'DEDUCTION', 'PURCHASE', 'MANUAL_ADJUSTMENT')",
            name="ck_ledger_type",
        ),
        CheckConstraint(
            "status IN ('COMPLETED', 'REJECTED')",
            name="ck_ledger_status",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    purpose = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False)
    category = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    source_type = Column(String, nullable=True)
    source_id = Column(String, nullable=True)
    issued_by = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    status = Column(String, nullable=False, default="COMPLETED")
    metadata_json = Column(Text, nullable=True)
    idempotency_key = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    student = relationship("Student", back_populates="ledger_transactions")


class StudentPocketConfig(Base):
    __tablename__ = "student_pocket_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(
        String,
        ForeignKey("students.id"),
        nullable=True,
        unique=True,
        index=True,
    )
    negative_limit = Column(Integer, nullable=False, default=-500)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    student = relationship("Student", back_populates="pocket_config")


class NFCCard(Base):
    __tablename__ = "nfc_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(String, unique=True, nullable=False, index=True)
    card_uid = Column(String, unique=True, nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="ACTIVE")
    issued_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("Student", back_populates="nfc_cards")


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, default="CANTEEN")
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


