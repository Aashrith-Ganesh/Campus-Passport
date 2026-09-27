import uuid
from fastapi.testclient import TestClient

from backend.app.database import initialize_database
from backend.app.database.database import get_db_context
from backend.app.database.models import Student, Merchant, NFCCard
from backend.app.main import app

client = TestClient(app)


def setup_module():
    initialize_database(seed_demo=True)


def test_student_directory_endpoints():
    """Verify student listing and single student lookup."""
    # 1. List students
    res = client.get("/api/students")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    students = res.json()
    assert len(students) >= 6, f"Expected at least 6 seeded students, got {len(students)}"
    student_ids = {s["id"] for s in students}
    assert "STU001" in student_ids
    assert "STU002" in student_ids

    # 2. Get specific student (STU001)
    res_single = client.get("/api/students/STU001")
    assert res_single.status_code == 200
    stu1 = res_single.json()
    assert stu1["id"] == "STU001"
    assert stu1["name"] == "Aarav"
    assert stu1["class_name"] in ("10", "Class 10")
    assert stu1["preferred_language"] == "Kannada"


    # 3. Non-existent student -> 404
    res_404 = client.get("/api/students/NON_EXISTENT_ID")
    assert res_404.status_code == 404


def test_student_balance_and_transaction_history():
    """Verify universal balance and ledger history retrieval."""
    res = client.get("/api/student/STU001/balance")
    assert res.status_code == 200
    balance = res.json()
    assert balance["student_id"] == "STU001"
    assert "total_balance" in balance
    assert "academic_balance" in balance
    assert "campus_balance" in balance
    assert "effective_negative_limit" in balance
    assert "available_campus_spending_balance" in balance
    assert balance["effective_negative_limit"] == -500

    # Transactions history
    res_txs = client.get("/api/student/STU001/transactions")
    assert res_txs.status_code == 200
    txs = res_txs.json()
    assert isinstance(txs, list)
    assert len(txs) >= 1
    sample = txs[0]
    assert "id" in sample
    assert "purpose" in sample
    assert "transaction_type" in sample
    assert "amount" in sample


def test_teacher_rewards_and_role_enforcement():
    """Verify teacher reward category listing, allocation, and role restrictions."""
    # 1. Categories
    res_cat = client.get("/api/teacher/rewards/categories")
    assert res_cat.status_code == 200
    categories = res_cat.json()
    assert len(categories) >= 5
    cat_keys = {c["category"] for c in categories}
    assert "ACADEMIC_EXCELLENCE" in cat_keys
    assert "COMMUNITY_CONTRIBUTION" in cat_keys

    # 2. Student role attempting to reward -> 403 Forbidden
    res_forbidden = client.post(
        "/api/rewards",
        headers={"X-Actor-Role": "STUDENT"},
        json={
            "student_id": "STU002",
            "category": "COMMUNITY_CONTRIBUTION",
            "amount": 50,
            "reason": "Student self-awarding points",
        },
    )
    assert res_forbidden.status_code == 403, f"Expected 403, got {res_forbidden.status_code}"

    # 3. Invalid category -> 400 Bad Request
    res_bad_cat = client.post(
        "/api/rewards",
        headers={"X-Actor-Role": "TEACHER"},
        json={
            "student_id": "STU002",
            "category": "INVALID_UNKNOWN_CATEGORY_XYZ",
            "amount": 50,
            "reason": "Test invalid category",
        },
    )
    assert res_bad_cat.status_code == 400

    # 4. Teacher allocates valid reward
    action_key = f"reward_test_{uuid.uuid4().hex[:8]}"
    res_reward = client.post(
        "/api/rewards",
        headers={"X-Actor-Role": "TEACHER"},
        json={
            "student_id": "STU002",
            "category": "COMMUNITY_CONTRIBUTION",
            "amount": 60,
            "reason": "Outstanding campus recycling effort",
            "action_event_id": action_key,
        },
    )
    assert res_reward.status_code == 201, f"Expected 201, got {res_reward.status_code}: {res_reward.text}"
    reward_data = res_reward.json()
    assert reward_data["student_id"] == "STU002"
    assert reward_data["amount"] == 60
    assert reward_data["transaction_type"] == "REWARD"
    assert reward_data["purpose"] == "CAMPUS"

    # Duplicate reward with same idempotency key -> rejected
    res_dup = client.post(
        "/api/rewards",
        headers={"X-Actor-Role": "TEACHER"},
        json={
            "student_id": "STU002",
            "category": "COMMUNITY_CONTRIBUTION",
            "amount": 60,
            "reason": "Outstanding campus recycling effort duplicate",
            "action_event_id": action_key,
        },
    )
    assert res_dup.status_code == 400


def test_extracurricular_achievement_creation():
    """Verify extracurricular achievement recording with atomic point awarding."""
    unique_title = f"District Debate Championship {uuid.uuid4().hex[:6]}"

    # 1. Student role forbidden
    res_forbidden = client.post(
        "/api/student/STU003/achievements",
        headers={"X-Actor-Role": "STUDENT"},
        json={
            "type": "EXTRACURRICULAR",
            "title": unique_title,
            "description": "Won 1st prize in district debate",
            "points": 50,
        },
    )
    assert res_forbidden.status_code == 403

    # 2. Teacher successfully creates achievement
    res_ach = client.post(
        "/api/student/STU003/achievements",
        headers={"X-Actor-Role": "TEACHER"},
        json={
            "type": "EXTRACURRICULAR",
            "title": unique_title,
            "description": "Won 1st prize in district debate",
            "evidence": "Certificate issued by District Board",
            "points": 50,
            "action_event_id": f"ach_{uuid.uuid4().hex[:8]}",
        },
    )
    assert res_ach.status_code == 201, f"Expected 201: {res_ach.text}"
    ach = res_ach.json()
    assert ach["student_id"] == "STU003"
    assert ach["points_awarded"] == 50
    assert ach["type"] in ("CONTRIBUTION", "EXTRACURRICULAR")

    # Verify balance updated
    res_bal = client.get("/api/student/STU003/balance")
    assert res_bal.status_code == 200
    assert res_bal.json()["campus_balance"] >= 50


def test_deductions_and_negative_limit_allowance():
    """Verify disciplinary deduction and negative balance tolerance."""
    # 1. Student forbidden
    res_forbid = client.post(
        "/api/deductions",
        headers={"X-Actor-Role": "STUDENT"},
        json={
            "student_id": "STU004",
            "amount": 30,
            "reason": "Late arrival",
        },
    )
    assert res_forbid.status_code == 403

    # 2. Teacher deduction - student deduction pushes balance down by 50
    res_bal_before = client.get("/api/student/STU004/balance").json()

    res_deduct = client.post(
        "/api/deductions",
        headers={"X-Actor-Role": "TEACHER"},
        json={
            "student_id": "STU004",
            "amount": 50,
            "reason": "Uniform violation & late arrival",
            "action_event_id": f"deduct_{uuid.uuid4().hex[:8]}",
        },
    )
    assert res_deduct.status_code == 201
    deduct_data = res_deduct.json()
    assert deduct_data["amount"] == -50
    assert deduct_data["transaction_type"] == "DEDUCTION"

    # Verify balance is reduced by 50
    res_bal_after = client.get("/api/student/STU004/balance").json()
    assert res_bal_after["campus_balance"] == res_bal_before["campus_balance"] - 50
    expected_avail = max(0, res_bal_after["campus_balance"] - res_bal_after["effective_negative_limit"])
    assert res_bal_after["available_campus_spending_balance"] == expected_avail


def test_nfc_card_lifecycle_and_tap():
    """Verify NFC card registration, listing, and tap simulation."""
    # 1. Register card for STU005
    res_reg = client.post(
        "/api/nfc/cards",
        headers={"X-Actor-Role": "ADMIN"},
        json={
            "student_id": "STU005",
            "card_id": f"CARD_STU005_{uuid.uuid4().hex[:4]}",
            "card_uid": f"UID_{uuid.uuid4().hex[:6]}",
            "token": f"TOKEN_STU005_{uuid.uuid4().hex[:6]}",
        },
    )
    assert res_reg.status_code == 201
    card = res_reg.json()
    assert card["student_id"] == "STU005"
    assert card["status"] == "ACTIVE"

    # 2. List student cards
    res_list = client.get("/api/student/STU005/cards")
    assert res_list.status_code == 200
    cards = res_list.json()
    assert len(cards) >= 1
    assert any(c["token"] == card["token"] for c in cards)

    # 3. NFC tap (balance check only, no purchase)
    res_tap = client.post(
        "/api/nfc/tap",
        json={"token": card["token"]},
    )
    assert res_tap.status_code == 200
    tap_res = res_tap.json()
    assert tap_res["status"] in ("SUCCESS", "VALID")
    assert tap_res["student_id"] == "STU005"
    assert tap_res["student_name"] == "Kabir"

    # 4. Inactive/deactivated card tap rejection
    res_inactive = client.post(
        "/api/nfc/tap",
        json={"token": "tok_rohan_nfc_003"},
    )
    assert res_inactive.status_code == 400
    err_detail = res_inactive.json()["detail"].lower()
    assert "deactivated" in err_detail or "inactive" in err_detail



def test_campus_purchases_and_safeguards():
    """Verify purchase processing, academic point separation, negative limit rejection, and duplicate prevention."""
    # 1. Award STU006 some academic points (cannot be used for campus purchase!)
    with get_db_context() as db:
        # Give STU006 500 Academic points
        from backend.app.services.student_pocket_service import (
            create_ledger_transaction,
            PURPOSE_ACADEMIC,
            PURPOSE_CAMPUS,
            TYPE_REWARD,
        )
        from backend.app.schemas.student_pocket import LedgerTransactionCreate

        create_ledger_transaction(
            db,
            LedgerTransactionCreate(
                student_id="STU006",
                amount=500,
                purpose=PURPOSE_ACADEMIC,
                transaction_type=TYPE_REWARD,
                reason="High Math Olympiad Score",
                idempotency_key=f"acad_{uuid.uuid4().hex[:8]}",
            ),
        )

    res_stu6_before = client.get("/api/student/STU006/balance").json()
    # Attempt purchase that exceeds available campus spending limit
    excess_amount = res_stu6_before["available_campus_spending_balance"] + 100
    res_over_limit = client.post(
        "/api/purchases",
        headers={"X-Actor-Role": "MERCHANT"},
        json={
            "student_id": "STU006",
            "merchant_id": "MERCHANT001",
            "amount": excess_amount,
            "description": "Large stationery set",
        },
    )
    assert res_over_limit.status_code == 400
    err_limit_msg = res_over_limit.json()["detail"].lower()
    assert "breaching" in err_limit_msg or "limit" in err_limit_msg or "rejected" in err_limit_msg


    # Student cannot initiate purchase as merchant
    res_forbid_purchase = client.post(
        "/api/purchases",
        headers={"X-Actor-Role": "STUDENT"},
        json={
            "student_id": "STU006",
            "merchant_id": "MERCHANT001",
            "amount": 10,
        },
    )
    assert res_forbid_purchase.status_code == 403

    # Valid purchase within negative limit (amount = 20)
    pur_key = f"purchase_{uuid.uuid4().hex[:8]}"
    res_valid_purchase = client.post(
        "/api/purchases",
        headers={"X-Actor-Role": "MERCHANT"},
        json={
            "student_id": "STU006",
            "merchant_id": "MERCHANT001",
            "amount": 20,
            "description": "Snack at Canteen",
            "idempotency_key": pur_key,
        },
    )
    assert res_valid_purchase.status_code == 201
    pur_data = res_valid_purchase.json()
    assert pur_data["success"] is True
    assert pur_data["student_id"] == "STU006"
    assert pur_data["purchase_amount"] == 20
    assert pur_data["new_balance"] == res_stu6_before["campus_balance"] - 20
    assert pur_data["total_balance"] == res_stu6_before["total_balance"] - 20


    # Duplicate purchase with same idempotency key -> rejected
    res_dup_purchase = client.post(
        "/api/purchases",
        headers={"X-Actor-Role": "MERCHANT"},
        json={
            "student_id": "STU006",
            "merchant_id": "MERCHANT001",
            "amount": 150,
            "description": "Duplicate Lunch set",
            "idempotency_key": pur_key,
        },
    )
    assert res_dup_purchase.status_code == 400


def test_direct_api_issues_and_three_interview_rule():
    """Verify direct /api/issues endpoint and 3-interview verification workflow."""
    # 1. Report issue via /api/issues
    res_create = client.post(
        "/api/issues",
        json={
            "title": f"Broken Science Lab Tap {uuid.uuid4().hex[:4]}",
            "description": "Water leaking continuously in Physics lab",
            "category": "INFRASTRUCTURE",
            "location": "Room 204 Physics Lab",
            "student_id": "STU001",
        },
    )
    assert res_create.status_code == 201
    issue = res_create.json()
    issue_id = issue["id"]
    assert issue["status"] == "SUBMITTED"

    # 2. Get issue via /api/issues/{id}
    res_get = client.get(f"/api/issues/{issue_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == issue_id

    # 3. Attempt verification with 0 interviews -> fails
    res_fail_v0 = client.post(f"/api/issues/{issue_id}/verify")
    assert res_fail_v0.status_code == 400

    # 4. Add Interview 1
    res_i1 = client.post(
        f"/api/issues/{issue_id}/interviews",
        json={
            "participant_type": "Teacher",
            "participant_name": "Mrs. Sharma",
            "response": "Tap has been dripping for two weeks.",
        },
    )
    assert res_i1.status_code == 201

    # 5. Add Interview 2
    res_i2 = client.post(
        f"/api/issues/{issue_id}/interviews",
        json={
            "participant_type": "Student",
            "participant_name": "Rohan",
            "response": "Water creates slippery floor near lab benches.",
        },
    )
    assert res_i2.status_code == 201

    # Attempt verification with only 2 interviews -> fails
    res_fail_v2 = client.post(f"/api/issues/{issue_id}/verify")
    assert res_fail_v2.status_code == 400
    assert "at least 3" in res_fail_v2.json()["detail"].lower()

    # 6. Add Interview 3
    res_i3 = client.post(
        f"/api/issues/{issue_id}/interviews",
        json={
            "participant_type": "Staff",
            "participant_name": "Mr. Ramesh (Caretaker)",
            "response": "Replacement valve has been requested.",
        },
    )
    assert res_i3.status_code == 201

    # Check research status
    res_res = client.get(f"/api/issues/{issue_id}/research")
    assert res_res.status_code == 200
    assert res_res.json()["interview_count"] == 3
    assert res_res.json()["is_ready_for_verification"] is True

    # 7. Verify issue -> succeeds
    res_v = client.post(f"/api/issues/{issue_id}/verify")
    assert res_v.status_code == 200
    assert res_v.json()["status"] == "VERIFIED"

    # 8. Resolve issue -> succeeds
    res_r = client.post(f"/api/issues/{issue_id}/resolve")
    assert res_r.status_code == 200
    assert res_r.json()["status"] == "RESOLVED"



def test_passport_snapshot_with_student_pocket_integration():
    """Verify GET /api/student/{student_id}/passport includes Student Pocket balances, transactions, and extracurriculars."""
    res = client.get("/api/student/STU001/passport")
    assert res.status_code == 200
    passport = res.json()

    # Legacy keys preserved
    assert "student" in passport
    assert passport["student"]["id"] == "STU001"
    assert passport["student"]["name"] == "Aarav"
    assert "points" in passport
    assert "total_points" in passport
    assert "point_breakdown" in passport
    assert "recent_evidence" in passport
    assert "opportunity_applications" in passport
    assert "school_issues" in passport

    # Student Pocket integration
    assert "student_pocket" in passport
    pocket = passport["student_pocket"]
    assert "total_balance" in pocket
    assert "academic_balance" in pocket
    assert "campus_balance" in pocket
    assert "negative_balance_limit" in pocket
    assert "available_spending_balance" in pocket

    # Recent transactions
    assert "recent_transactions" in passport
    assert isinstance(passport["recent_transactions"], list)
    assert len(passport["recent_transactions"]) >= 1

    # Achievements breakdown with extracurricular
    assert "achievements" in passport
    ach_dict = passport["achievements"]
    assert "all" in ach_dict
    assert "learning" in ach_dict
    assert "contribution" in ach_dict
    assert "extracurricular" in ach_dict
    assert isinstance(ach_dict["extracurricular"], list)


if __name__ == "__main__":
    setup_module()
    test_student_directory_endpoints()
    test_student_balance_and_transaction_history()
    test_teacher_rewards_and_role_enforcement()
    test_extracurricular_achievement_creation()
    test_deductions_and_negative_limit_allowance()
    test_nfc_card_lifecycle_and_tap()
    test_campus_purchases_and_safeguards()
    test_direct_api_issues_and_three_interview_rule()
    test_passport_snapshot_with_student_pocket_integration()
    print("ALL STUDENT POCKET FINAL TESTS PASSED CLEANLY!")
