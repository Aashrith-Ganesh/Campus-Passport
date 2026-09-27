from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import initialize_database
from backend.app.database.database import SessionLocal
from backend.app.database.models import Base, LedgerTransaction, Student
from backend.app.schemas.student_pocket import LedgerTransactionCreate
from backend.app.services.student_pocket_service import (
    create_ledger_transaction,
    get_effective_negative_limit,
    get_student_balance,
    set_negative_limit,
    validate_campus_purchase,
)



def setup_module():
    initialize_database(seed_demo=True)


def test_empty_student_balance():
    db = SessionLocal()
    try:
        # Create fresh student with zero ledger transactions
        sid = "STU_POCKET_EMPTY"
        if not db.get(Student, sid):
            db.add(
                Student(
                    id=sid,
                    name="Empty Pocket",
                    class_name="10",
                    preferred_language="English",
                )
            )
            db.commit()

        # Clean any prior test transactions
        db.query(LedgerTransaction).filter(
            LedgerTransaction.student_id == sid
        ).delete()
        db.commit()

        balance = get_student_balance(db, sid)
        assert balance["student_id"] == sid
        assert balance["total_balance"] == 0
        assert balance["academic_balance"] == 0
        assert balance["campus_balance"] == 0
        assert balance["effective_negative_limit"] == -500
        # When campus balance is 0 and limit is -500, available spending is 500
        assert balance["available_campus_spending_balance"] == 500
    finally:
        db.close()


def test_academic_and_campus_credits_and_universal_total():
    db = SessionLocal()
    try:
        sid = "STU_POCKET_CREDITS"
        if not db.get(Student, sid):
            db.add(
                Student(
                    id=sid,
                    name="Credit Student",
                    class_name="10",
                    preferred_language="Kannada",
                )
            )
            db.commit()

        db.query(LedgerTransaction).filter(
            LedgerTransaction.student_id == sid
        ).delete()
        db.commit()

        # 1. Academic credit (+150)
        tx_acad = create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=sid,
                amount=150,
                purpose="ACADEMIC",
                transaction_type="REWARD",
                category="academic effort",
                reason="Excellent performance in state math competition",
                issued_by="Teacher_Rao",
                idempotency_key="tx-acad-001",
            ),
        )
        assert tx_acad.id is not None
        assert tx_acad.amount == 150

        # Verify balances after academic credit
        b1 = get_student_balance(db, sid)
        assert b1["total_balance"] == 150
        assert b1["academic_balance"] == 150
        assert b1["campus_balance"] == 0
        # Available campus spending is still 500 (since campus balance is 0, limit is -500)
        # Academic credit does NOT expand campus spending
        assert b1["available_campus_spending_balance"] == 500

        # 2. Campus credit (+200)
        tx_campus = create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=sid,
                amount=200,
                purpose="CAMPUS",
                transaction_type="REWARD",
                category="volunteering",
                reason="Campus garden cleanup",
                issued_by="Teacher_Mehta",
                idempotency_key="tx-campus-001",
            ),
        )
        assert tx_campus.id is not None
        assert tx_campus.amount == 200

        # Verify universal total and separated views
        b2 = get_student_balance(db, sid)
        assert b2["total_balance"] == 350  # 150 academic + 200 campus
        assert b2["academic_balance"] == 150
        assert b2["campus_balance"] == 200
        # Campus spending: 200 - (-500) = 700
        assert b2["available_campus_spending_balance"] == 700

    finally:
        db.close()


def test_negative_balance_calculation_and_overrides():
    db = SessionLocal()
    try:
        sid = "STU_POCKET_LIMITS"
        if not db.get(Student, sid):
            db.add(
                Student(
                    id=sid,
                    name="Limit Student",
                    class_name="10",
                    preferred_language="Hindi",
                )
            )
            db.commit()

        db.query(LedgerTransaction).filter(
            LedgerTransaction.student_id == sid
        ).delete()
        db.commit()

        # Check default limit
        assert get_effective_negative_limit(db, sid) == -500

        # Override individual student limit to -200
        set_negative_limit(db, negative_limit=-200, student_id=sid)
        assert get_effective_negative_limit(db, sid) == -200

        # Create a debit/deduction of -100 on campus purpose
        create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=sid,
                amount=-100,
                purpose="CAMPUS",
                transaction_type="DEDUCTION",
                category="responsibility/positive conduct",
                reason="Late library material return",
                issued_by="Librarian",
            ),
        )

        b = get_student_balance(db, sid)
        assert b["campus_balance"] == -100
        assert b["total_balance"] == -100
        assert b["effective_negative_limit"] == -200
        # Available spending: -100 - (-200) = 100
        assert b["available_campus_spending_balance"] == 100

        # Test purchase validation within limit: purchase of 100 is allowed
        assert validate_campus_purchase(db, sid, purchase_amount=100) is True

        # Purchase of 101 would result in -201, which breaches -200 limit -> MUST FAIL
        failed = False
        try:
            validate_campus_purchase(db, sid, purchase_amount=101)
        except ValueError as exc:
            failed = True
            assert "breaching the negative limit" in str(exc)
        assert failed, "Expected purchase to fail due to negative limit breach"

        # Reset individual override back to default
        set_negative_limit(db, negative_limit=-500, student_id=sid)
        assert get_effective_negative_limit(db, sid) == -500

    finally:
        db.close()


def test_duplicate_idempotency_key_protection():
    db = SessionLocal()
    try:
        sid = "STU_POCKET_IDEMP"
        if not db.get(Student, sid):
            db.add(
                Student(
                    id=sid,
                    name="Idempotency Student",
                    class_name="10",
                    preferred_language="English",
                )
            )
            db.commit()

        db.query(LedgerTransaction).filter(
            LedgerTransaction.student_id == sid
        ).delete()
        db.commit()

        # First transaction with key
        key = "idemp-unique-event-12345"
        tx1 = create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=sid,
                amount=50,
                purpose="CAMPUS",
                transaction_type="REWARD",
                category="helping classmates",
                reason="Tutoring peer in physics",
                idempotency_key=key,
            ),
        )
        assert tx1.id is not None

        # Duplicate attempt with identical key -> MUST BE REJECTED
        failed_idemp = False
        try:
            create_ledger_transaction(
                db=db,
                data=LedgerTransactionCreate(
                    student_id=sid,
                    amount=50,
                    purpose="CAMPUS",
                    transaction_type="REWARD",
                    category="helping classmates",
                    reason="Tutoring peer in physics duplicate",
                    idempotency_key=key,
                ),
            )
        except ValueError as exc:
            failed_idemp = True
            assert "Duplicate transaction" in str(exc)
        assert failed_idemp, "Expected duplicate idempotency key to be rejected"

        # Confirm only 1 transaction exists in the database
        count = (
            db.query(LedgerTransaction)
            .filter(LedgerTransaction.idempotency_key == key)
            .count()
        )
        assert count == 1
    finally:
        db.close()


def test_academic_and_campus_purpose_separation_during_purchase_validation():
    db = SessionLocal()
    try:
        sid = "STU_POCKET_PURPOSE"
        if not db.get(Student, sid):
            db.add(
                Student(
                    id=sid,
                    name="Purpose Student",
                    class_name="10",
                    preferred_language="English",
                )
            )
            db.commit()

        db.query(LedgerTransaction).filter(
            LedgerTransaction.student_id == sid
        ).delete()
        db.commit()

        # Student has +10,000 ACADEMIC points
        create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=sid,
                amount=10000,
                purpose="ACADEMIC",
                transaction_type="REWARD",
                reason="Olympiad National Scholarship",
            ),
        )

        # Student has 0 CAMPUS points, limit is -500
        # Available campus spending is 500, NOT 10,500!
        balance = get_student_balance(db, sid)
        assert balance["academic_balance"] == 10000
        assert balance["campus_balance"] == 0
        assert balance["total_balance"] == 10000
        assert balance["available_campus_spending_balance"] == 500

        # Purchase of 500 campus points -> allowed
        assert validate_campus_purchase(db, sid, 500) is True

        # Purchase of 501 campus points -> rejected! (Academic points cannot subsidize campus purchases)
        failed_purchase = False
        try:
            validate_campus_purchase(db, sid, 501)
        except ValueError as exc:
            failed_purchase = True
            assert "breaching the negative limit" in str(exc)
        assert failed_purchase, "Expected purchase beyond campus limit to be rejected"
    finally:
        db.close()



if __name__ == "__main__":
    setup_module()
    test_empty_student_balance()
    test_academic_and_campus_credits_and_universal_total()
    test_negative_balance_calculation_and_overrides()
    test_duplicate_idempotency_key_protection()
    test_academic_and_campus_purpose_separation_during_purchase_validation()
    print("All Phase B Student Pocket tests passed successfully!")
