from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import Achievement, PointTransaction, Student


def get_student_points_summary(db: Session, student_id: str) -> Dict:
    """
    Calculate total points and transaction ledger breakdown by source.
    Points are computed dynamically from immutable ledger transactions.
    """
    txs = (
        db.query(PointTransaction)
        .filter(PointTransaction.student_id == student_id)
        .order_by(PointTransaction.created_at.desc())
        .all()
    )

    total_points = sum(t.points for t in txs)
    learning_points = sum(
        t.points for t in txs if t.source in ("CAMPUS_LENS", "LEARNING")
    )
    contribution_points = sum(
        t.points
        for t in txs
        if t.source in ("CAMPUS_PULSE", "MY_SCHOOL_MY_FIX", "CONTRIBUTION")
    )

    return {
        "student_id": student_id,
        "total_points": total_points,
        "breakdown": {
            "learning": learning_points,
            "contribution": contribution_points,
        },
        "transactions": [
            {
                "id": t.id,
                "points": t.points,
                "reason": t.reason,
                "source": t.source,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in txs
        ],
    }


def record_transaction_if_not_exists(
    db: Session,
    student_id: str,
    points: int,
    reason: str,
    source: str,
    achievement_id: Optional[int] = None,
) -> Optional[PointTransaction]:
    """
    Prevent duplicate point transactions for the exact same event.
    """
    existing = (
        db.query(PointTransaction)
        .filter(
            PointTransaction.student_id == student_id,
            PointTransaction.reason == reason,
            PointTransaction.source == source,
        )
        .first()
    )
    if existing:
        return None

    tx = PointTransaction(
        student_id=student_id,
        achievement_id=achievement_id,
        points=points,
        reason=reason,
        source=source,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def award_campus_lens_points(
    db: Session,
    student_id: str,
    topic: str,
    percentage: int,
    correct_count: int,
    total_count: int,
) -> List[PointTransaction]:
    """
    Deterministic point calculation for Campus Lens:
    - Module completed: +20
    - Quiz score >= 80%: +10
    - Quiz score = 100%: additional +5
    Creates a LEARNING achievement if score >= 80%.
    """
    # Ensure student exists
    student = db.get(Student, student_id)
    if not student:
        return []

    awarded = []

    # 1. Module completed: +20
    reason_completed = f"Campus Lens module completed: {topic}"
    tx1 = record_transaction_if_not_exists(
        db=db,
        student_id=student_id,
        points=20,
        reason=reason_completed,
        source="CAMPUS_LENS",
    )
    if tx1:
        awarded.append(tx1)

    # 2. Score >= 80%: +10 & LEARNING achievement
    if percentage >= 80:
        ach_title = f"{topic} Concept Mastery"
        existing_ach = (
            db.query(Achievement)
            .filter(
                Achievement.student_id == student_id,
                Achievement.source == "CAMPUS_LENS",
                Achievement.title == ach_title,
            )
            .first()
        )
        if not existing_ach:
            existing_ach = Achievement(
                student_id=student_id,
                type="LEARNING",
                title=ach_title,
                description=f"Demonstrated concept mastery for {topic} on Campus Lens quiz.",
                source="CAMPUS_LENS",
                evidence=f"Quiz score: {correct_count}/{total_count} ({percentage}%)",
            )
            db.add(existing_ach)
            db.commit()
            db.refresh(existing_ach)

        reason_80 = f"Quiz score >= 80% ({percentage}%): {topic}"
        tx2 = record_transaction_if_not_exists(
            db=db,
            student_id=student_id,
            points=10,
            reason=reason_80,
            source="CAMPUS_LENS",
            achievement_id=existing_ach.id if existing_ach else None,
        )
        if tx2:
            awarded.append(tx2)

        # 3. Score = 100%: additional +5
        if percentage == 100:
            reason_100 = f"Perfect quiz score (100%): {topic}"
            tx3 = record_transaction_if_not_exists(
                db=db,
                student_id=student_id,
                points=5,
                reason=reason_100,
                source="CAMPUS_LENS",
                achievement_id=existing_ach.id if existing_ach else None,
            )
            if tx3:
                awarded.append(tx3)

    return awarded


def award_issue_reported_points(
    db: Session,
    student_id: str,
    issue_id: str,
    title: str,
) -> Optional[PointTransaction]:
    """Issue reported: +10"""
    return record_transaction_if_not_exists(
        db=db,
        student_id=student_id,
        points=10,
        reason=f"Issue reported ({issue_id}): {title}",
        source="CAMPUS_PULSE",
    )


def award_issue_verified_points(
    db: Session,
    student_id: str,
    issue_id: str,
    title: str,
) -> Optional[PointTransaction]:
    """Issue verified: +20"""
    return record_transaction_if_not_exists(
        db=db,
        student_id=student_id,
        points=20,
        reason=f"Issue verified ({issue_id}): {title}",
        source="CAMPUS_PULSE",
    )


def award_issue_resolved_points(
    db: Session,
    student_id: str,
    issue_id: str,
    title: str,
    achievement_id: Optional[int] = None,
) -> Optional[PointTransaction]:
    """Issue resolved: +30"""
    return record_transaction_if_not_exists(
        db=db,
        student_id=student_id,
        points=30,
        reason=f"Issue resolved ({issue_id}): {title}",
        source="CAMPUS_PULSE",
        achievement_id=achievement_id,
    )
