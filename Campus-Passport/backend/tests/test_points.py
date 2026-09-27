from backend.app.database import initialize_database
from backend.app.database.database import SessionLocal
from backend.app.database.models import PointTransaction, Student
from backend.app.services.point_service import (
    award_campus_lens_points,
    award_issue_reported_points,
    get_student_points_summary,
    record_transaction_if_not_exists,
)


def setup_module():
    initialize_database(seed_demo=True)


def test_points_calculation_and_duplicate_prevention():
    db = SessionLocal()
    try:
        # Create dedicated test student
        test_sid = "STU_POINT_TEST"
        if not db.get(Student, test_sid):
            db.add(
                Student(
                    id=test_sid,
                    name="Point Tester",
                    class_name="10",
                    preferred_language="Kannada",
                )
            )
            db.commit()

        # Clean existing transactions for this test student
        db.query(PointTransaction).filter(
            PointTransaction.student_id == test_sid
        ).delete()
        db.commit()

        # 1. Award Campus Lens module completed (+20)
        # and quiz score >= 80% (+10) and 100% (+5) -> Total should be 35
        txs = award_campus_lens_points(
            db=db,
            student_id=test_sid,
            topic="Solar System",
            percentage=100,
            correct_count=3,
            total_count=3,
        )
        assert len(txs) == 3

        # Duplicate prevention check:
        # Re-awarding same event should yield 0 new transactions
        dup_txs = award_campus_lens_points(
            db=db,
            student_id=test_sid,
            topic="Solar System",
            percentage=100,
            correct_count=3,
            total_count=3,
        )
        assert len(dup_txs) == 0

        # 2. Award Contribution: Issue reported (+10)
        c_tx = award_issue_reported_points(
            db=db,
            student_id=test_sid,
            issue_id="ISSUE_TEST_01",
            title="Broken Bench",
        )
        assert c_tx is not None
        assert c_tx.points == 10

        # Duplicate check on issue reported
        dup_c_tx = award_issue_reported_points(
            db=db,
            student_id=test_sid,
            issue_id="ISSUE_TEST_01",
            title="Broken Bench",
        )
        assert dup_c_tx is None

        # 3. Check summary totals and learning vs contribution breakdown
        summary = get_student_points_summary(db=db, student_id=test_sid)
        assert summary["total_points"] == 45  # 35 learning + 10 contribution
        assert summary["breakdown"]["learning"] == 35
        assert summary["breakdown"]["contribution"] == 10
        assert len(summary["transactions"]) == 4

    finally:
        db.close()


if __name__ == "__main__":
    setup_module()
    test_points_calculation_and_duplicate_prevention()
    print("Point System tests passed successfully!")
