from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Achievement as DbAchievement,
    Opportunity as DbOpportunity,
    OpportunityApplication as DbOpportunityApplication,
    Student as DbStudent,
)
from backend.app.opportunity_wallet.schemas import (
    ApplicationResponse,
    EligibilityResponse,
    Opportunity,
)


# Fallback catalog if DB has not yet been seeded
DEFAULT_OPPORTUNITIES = [
    Opportunity(
        id="OPP001",
        title="Olympiad Assistance",
        description="Demo education opportunity for eligible students.",
        amount=2000,
        category="EDUCATION",
    ),
]


# ---------------------------------------------------------
# OPPORTUNITY FUNCTIONS
# ---------------------------------------------------------

def get_all_opportunities(db: Optional[Session] = None) -> List[Opportunity]:
    """Return all currently active opportunities from the shared database."""
    if db is not None:
        db_opps = (
            db.query(DbOpportunity)
            .filter(DbOpportunity.active == True)
            .all()
        )
        if db_opps:
            return [
                Opportunity(
                    id=o.id,
                    title=o.title,
                    description=o.description,
                    amount=o.amount,
                    category=o.category,
                )
                for o in db_opps
            ]

    return DEFAULT_OPPORTUNITIES


def get_opportunity(
    opportunity_id: str,
    db: Optional[Session] = None,
) -> Opportunity:
    """Return one opportunity by ID from the shared database."""
    if db is not None:
        opp = db.get(DbOpportunity, opportunity_id)
        if opp and opp.active:
            return Opportunity(
                id=opp.id,
                title=opp.title,
                description=opp.description,
                amount=opp.amount,
                category=opp.category,
            )

    for opp in DEFAULT_OPPORTUNITIES:
        if opp.id == opportunity_id:
            return opp

    raise ValueError("Opportunity not found")


# ---------------------------------------------------------
# ELIGIBILITY
# ---------------------------------------------------------

def check_eligibility(
    student_id: str,
    opportunity_id: str,
    achievements: Optional[List[Dict[str, Any]]] = None,
    db: Optional[Session] = None,
) -> EligibilityResponse:
    """
    Determine whether a student is eligible for an opportunity.
    Queries verified achievements from the shared database.
    """
    opportunity = get_opportunity(opportunity_id=opportunity_id, db=db)

    # If achievements not provided, fetch from shared DB
    if achievements is None and db is not None:
        db_achievements = (
            db.query(DbAchievement)
            .filter(DbAchievement.student_id == student_id)
            .all()
        )
        achievements = [
            {"type": a.type, "title": a.title}
            for a in db_achievements
        ]
    elif achievements is None:
        achievements = []

    learning_found = False
    contribution_found = False

    for achievement in achievements:
        achievement_type = str(achievement.get("type", "")).upper()

        if achievement_type == "LEARNING":
            learning_found = True
        elif achievement_type == "CONTRIBUTION":
            contribution_found = True

    reasons = []
    missing_requirements = []

    if learning_found:
        reasons.append("Verified learning achievement found.")
    else:
        missing_requirements.append(
            "At least one verified learning achievement is required."
        )

    if contribution_found:
        reasons.append("Verified contribution achievement found.")
    else:
        missing_requirements.append(
            "At least one verified contribution achievement is required."
        )

    eligible = learning_found and contribution_found

    return EligibilityResponse(
        student_id=student_id,
        opportunity_id=opportunity.id,
        eligible=eligible,
        reasons=reasons,
        missing_requirements=missing_requirements,
    )


# ---------------------------------------------------------
# APPLICATION
# ---------------------------------------------------------

def create_application(
    student_id: str,
    opportunity_id: str,
    achievements: Optional[List[Dict[str, Any]]] = None,
    db: Optional[Session] = None,
) -> ApplicationResponse:
    """
    Submit an application for an opportunity.
    Persists application to opportunity_applications in the shared DB.
    """
    opportunity = get_opportunity(opportunity_id=opportunity_id, db=db)

    if db is not None:
        student = db.get(DbStudent, student_id)
        if not student:
            raise ValueError(f"Student '{student_id}' does not exist.")

        # Duplicate check
        existing = (
            db.query(DbOpportunityApplication)
            .filter(
                DbOpportunityApplication.student_id == student_id,
                DbOpportunityApplication.opportunity_id == opportunity_id,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"Student '{student_id}' has already applied for opportunity '{opportunity_id}'."
            )

    eligibility = check_eligibility(
        student_id=student_id,
        opportunity_id=opportunity_id,
        achievements=achievements,
        db=db,
    )

    if not eligibility.eligible:
        raise ValueError("Student is not eligible for this opportunity.")

    if db is not None:
        total_count = db.query(DbOpportunityApplication).count()
        app_id = f"APP{total_count + 1:03d}"
        while db.get(DbOpportunityApplication, app_id):
            total_count += 1
            app_id = f"APP{total_count + 1:03d}"

        row = DbOpportunityApplication(
            id=app_id,
            student_id=student_id,
            opportunity_id=opportunity.id,
            status="SIMULATED_APPROVED",
            amount=opportunity.amount,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        return ApplicationResponse(
            application_id=row.id,
            student_id=row.student_id,
            opportunity_id=row.opportunity_id,
            status=row.status,
            amount=row.amount,
        )

    # In-memory fallback if no db session provided
    return ApplicationResponse(
        application_id="APP001",
        student_id=student_id,
        opportunity_id=opportunity.id,
        status="SIMULATED_APPROVED",
        amount=opportunity.amount,
    )


def get_applications_for_student(
    student_id: str,
    db: Optional[Session] = None,
) -> List[ApplicationResponse]:
    """Retrieve all opportunity applications for a student from shared database."""
    if db is not None:
        rows = (
            db.query(DbOpportunityApplication)
            .filter(DbOpportunityApplication.student_id == student_id)
            .order_by(DbOpportunityApplication.created_at.desc())
            .all()
        )
        return [
            ApplicationResponse(
                application_id=r.id,
                student_id=r.student_id,
                opportunity_id=r.opportunity_id,
                status=r.status,
                amount=r.amount,
            )
            for r in rows
        ]

    return []
