from sqlalchemy.orm import Session

from .models import Achievement, Opportunity, Student


def seed_demo_data(db: Session):
    # Student
    student = db.get(Student, "STU001")
    if student is None:
        db.add(
            Student(
                id="STU001",
                name="Aarav",
                class_name="10",
                preferred_language="Kannada",
            )
        )
        db.commit()

    # Achievement
    exists = (
        db.query(Achievement)
        .filter(
            Achievement.student_id == "STU001",
            Achievement.source == "CAMPUS_LENS",
            Achievement.title == "Geography Concept Mastery",
        )
        .first()
    )
    if exists is None:
        db.add(
            Achievement(
                student_id="STU001",
                type="LEARNING",
                title="Geography Concept Mastery",
                description="Completed a Campus Lens geography mastery activity.",
                source="CAMPUS_LENS",
                evidence="Quiz 3/3",
            )
        )

    # Contribution Achievement
    contrib_exists = (
        db.query(Achievement)
        .filter(
            Achievement.student_id == "STU001",
            Achievement.type == "CONTRIBUTION",
        )
        .first()
    )
    if contrib_exists is None:
        db.add(
            Achievement(
                student_id="STU001",
                type="CONTRIBUTION",
                title="Library Book Drive Volunteer",
                description="Organized and cataloged books for the campus library.",
                source="CAMPUS_PULSE",
                evidence="Verified by faculty supervisor",
            )
        )
        db.commit()

    # Initial Point Transactions
    from .models import PointTransaction

    learning_ach = (
        db.query(Achievement)
        .filter(
            Achievement.student_id == "STU001",
            Achievement.type == "LEARNING",
        )
        .first()
    )
    if learning_ach:
        pt_exists = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.student_id == "STU001",
                PointTransaction.source == "CAMPUS_LENS",
            )
            .first()
        )
        if pt_exists is None:
            db.add(
                PointTransaction(
                    student_id="STU001",
                    achievement_id=learning_ach.id,
                    points=35,
                    reason="Campus Lens module completed: Geography",
                    source="CAMPUS_LENS",
                )
            )

    contrib_ach = (
        db.query(Achievement)
        .filter(
            Achievement.student_id == "STU001",
            Achievement.type == "CONTRIBUTION",
        )
        .first()
    )
    if contrib_ach:
        pt_contrib_exists = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.student_id == "STU001",
                PointTransaction.source == "CAMPUS_PULSE",
            )
            .first()
        )
        if pt_contrib_exists is None:
            db.add(
                PointTransaction(
                    student_id="STU001",
                    achievement_id=contrib_ach.id,
                    points=30,
                    reason="School issue contribution: Library Book Drive",
                    source="CAMPUS_PULSE",
                )
            )

    # Additional Demo Students (5-6 total)
    demo_students = [
        ("STU002", "Diya", "10", "English"),
        ("STU003", "Rohan", "9", "Hindi"),
        ("STU004", "Ananya", "11", "English"),
        ("STU005", "Kabir", "10", "Kannada"),
        ("STU006", "Meera", "9", "Kannada"),
    ]
    for sid, sname, sclass, slang in demo_students:
        if db.get(Student, sid) is None:
            db.add(
                Student(
                    id=sid,
                    name=sname,
                    class_name=sclass,
                    preferred_language=slang,
                )
            )

    # Opportunity
    if db.get(Opportunity, "OPP001") is None:
        db.add(
            Opportunity(
                id="OPP001",
                title="Olympiad Assistance",
                description="Demo education opportunity for eligible students.",
                amount=2000,
                category="EDUCATION",
                active=True,
            )
        )

    # Extracurricular Achievement for STU001
    extra_ach_exists = (
        db.query(Achievement)
        .filter(
            Achievement.student_id == "STU001",
            Achievement.source == "EXTRACURRICULAR",
        )
        .first()
    )
    if extra_ach_exists is None:
        db.add(
            Achievement(
                student_id="STU001",
                type="CONTRIBUTION",
                title="Inter-school Robotics Challenge",
                description="Led school team in the regional robotics competition.",
                source="EXTRACURRICULAR",
                evidence="Teacher verified certificate",
            )
        )

    # Demo Merchant (Campus Canteen)
    from .models import LedgerTransaction, Merchant, NFCCard

    if db.get(Merchant, "MERCHANT001") is None:
        db.add(
            Merchant(
                id="MERCHANT001",
                name="Campus Canteen",
                category="CANTEEN",
                active=True,
            )
        )

    # Demo NFC Cards
    nfc_seeds = [
        ("CARD_STU001_01", "04:A1:B2:C3:01", "tok_aarav_nfc_001", "STU001", "ACTIVE"),
        ("CARD_STU002_01", "04:D2:E3:F4:02", "tok_diya_nfc_002", "STU002", "ACTIVE"),
        ("CARD_STU003_01", "04:55:66:77:03", "tok_rohan_nfc_003", "STU003", "DEACTIVATED"),
    ]
    for cid, cuid, ctok, csid, cstat in nfc_seeds:
        card = (
            db.query(NFCCard)
            .filter(NFCCard.card_id == cid)
            .first()
        )
        if card is None:
            db.add(
                NFCCard(
                    card_id=cid,
                    card_uid=cuid,
                    token=ctok,
                    student_id=csid,
                    status=cstat,
                )
            )

    # Initial Student Pocket Ledger Transactions for STU001 (Aarav)
    ledger_seeds = [
        {
            "idempotency_key": "seed_tx_aarav_acad_01",
            "student_id": "STU001",
            "amount": 100,
            "purpose": "ACADEMIC",
            "transaction_type": "REWARD",
            "category": "ACADEMIC_EFFORT",
            "reason": "Math Olympiad School Distinction",
            "issued_by": "Teacher_Rao",
        },
        {
            "idempotency_key": "seed_tx_aarav_camp_01",
            "student_id": "STU001",
            "amount": 80,
            "purpose": "CAMPUS",
            "transaction_type": "REWARD",
            "category": "VOLUNTEERING",
            "reason": "Campus Garden Greenery Volunteer",
            "issued_by": "Teacher_Mehta",
        },
        {
            "idempotency_key": "seed_tx_aarav_purch_01",
            "student_id": "STU001",
            "amount": -30,
            "purpose": "CAMPUS",
            "transaction_type": "PURCHASE",
            "category": "PURCHASE",
            "reason": "Lunch - Campus Canteen Meal",
            "source_type": "MERCHANT",
            "source_id": "MERCHANT001",
            "issued_by": "MERCHANT001",
        },
        {
            "idempotency_key": "seed_tx_aarav_deduct_01",
            "student_id": "STU001",
            "amount": -15,
            "purpose": "CAMPUS",
            "transaction_type": "DEDUCTION",
            "category": "RESPONSIBILITY_POSITIVE_CONDUCT",
            "reason": "Late Sports Equipment Return",
            "issued_by": "Teacher_Sharma",
        },
    ]

    for item in ledger_seeds:
        exists_tx = (
            db.query(LedgerTransaction)
            .filter(LedgerTransaction.idempotency_key == item["idempotency_key"])
            .first()
        )
        if exists_tx is None:
            db.add(LedgerTransaction(**item))

    db.commit()


