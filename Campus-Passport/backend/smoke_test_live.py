import json
import urllib.request
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"


def make_request(path, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode("utf-8")
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as exc:
        err_content = exc.read().decode("utf-8")
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = {"raw": err_content}
        return exc.code, parsed


def run_live_smoke_test():
    print("=" * 60)
    print("RUNNING LIVE SMOKE TEST AGAINST http://127.0.0.1:8000")
    print("=" * 60)

    # Health Check
    code, res = make_request("/health")
    print(f"\n[0] GET /health -> Status: {code}")
    print(f"    Payload: {res}")
    assert code == 200

    # 1. GET students
    code, students = make_request("/api/students")
    print(f"\n[1] GET /api/students -> Status: {code}")
    print(f"    Total Students: {len(students)}")
    for s in students[:3]:
        print(f"    - {s['id']}: {s['name']} ({s['class_name']}, {s['preferred_language']})")
    assert code == 200

    # 2. GET Aarav balance
    code, aarav_bal_initial = make_request("/api/student/STU001/balance")
    print(f"\n[2] GET /api/student/STU001/balance (Initial) -> Status: {code}")
    print(f"    Total Balance: {aarav_bal_initial['total_balance']}")
    print(f"    Academic: {aarav_bal_initial['academic_balance']}, Campus: {aarav_bal_initial['campus_balance']}")
    print(f"    Negative Limit: {aarav_bal_initial['effective_negative_limit']}, Available Spending: {aarav_bal_initial['available_campus_spending_balance']}")
    assert code == 200

    # 3. Teacher awards extracurricular points
    ach_payload = {
        "type": "EXTRACURRICULAR",
        "title": f"State Level Robotics Hackathon {uuid.uuid4().hex[:4]}",
        "description": "Constructed autonomous obstacle navigation rover",
        "evidence": "Faculty verified trophy and certificate",
        "points": 45,
        "action_event_id": f"ach_robotics_{uuid.uuid4().hex[:6]}"
    }
    code, ach_res = make_request(
        "/api/student/STU001/achievements",
        method="POST",
        data=ach_payload,
        headers={"X-Actor-Role": "TEACHER"},
    )
    print(f"\n[3] POST /api/student/STU001/achievements (Teacher Reward) -> Status: {code}")
    print(f"    Achievement: {ach_res.get('title')} (+{ach_res.get('points_awarded')} pts)")
    assert code == 201

    # 4. Balance increases
    code, aarav_bal_after_reward = make_request("/api/student/STU001/balance")
    print(f"\n[4] GET /api/student/STU001/balance (After Reward) -> Status: {code}")
    print(f"    Previous Campus: {aarav_bal_initial['campus_balance']} -> New Campus: {aarav_bal_after_reward['campus_balance']}")
    print(f"    Previous Total: {aarav_bal_initial['total_balance']} -> New Total: {aarav_bal_after_reward['total_balance']}")
    assert aarav_bal_after_reward['campus_balance'] == aarav_bal_initial['campus_balance'] + 45
    assert aarav_bal_after_reward['total_balance'] == aarav_bal_initial['total_balance'] + 45

    # 5. Create infrastructure issue
    issue_payload = {
        "student_id": "STU001",
        "title": f"Damaged Ceiling Fan in Room 102 {uuid.uuid4().hex[:4]}",
        "description": "Fan is rattling loudly and wobbling during class.",
        "category": "FACILITIES",
        "location": "Room 102"
    }
    code, issue_res = make_request(
        "/api/issues",
        method="POST",
        data=issue_payload,
    )
    issue_id = issue_res.get("id")
    print(f"\n[5] POST /api/issues (Create Issue) -> Status: {code}")
    print(f"    Issue ID: {issue_id}, Status: {issue_res.get('status')}, Title: {issue_res.get('title')}")
    assert code == 201

    # 6. Add interviews
    interviews = [
        {"participant_type": "Teacher", "participant_name": "Mr. Sharma", "response": "Fan rattles continuously during lectures."},
        {"participant_type": "Student", "participant_name": "Diya", "response": "Students sitting underneath feel unsafe."},
        {"participant_type": "Staff", "participant_name": "Mr. Gopal (Maintenance)", "response": "Mounting bracket is loose and needs immediate tightening."}
    ]
    print(f"\n[6] Adding 3 Research Interviews for Issue {issue_id}:")
    for i, iv in enumerate(interviews, 1):
        code, iv_res = make_request(
            f"/api/issues/{issue_id}/interviews",
            method="POST",
            data=iv,
        )
        print(f"    Interview {i} ({iv['participant_type']} - {iv['participant_name']}) -> Status: {code}")
        assert code == 201

    # 7. Verify/resolution flow
    code, res_research = make_request(f"/api/issues/{issue_id}/research")
    print(f"\n[7a] GET /api/issues/{issue_id}/research -> Status: {code}")
    print(f"     Interview Count: {res_research.get('interview_count')}, Can Verify: {res_research.get('is_ready_for_verification')}")
    assert res_research.get('is_ready_for_verification') is True

    code, verify_res = make_request(f"/api/issues/{issue_id}/verify", method="POST")
    print(f"[7b] POST /api/issues/{issue_id}/verify -> Status: {code}, Status: {verify_res.get('status')}")
    assert code == 200
    assert verify_res.get("status") == "VERIFIED"

    code, resolve_res = make_request(f"/api/issues/{issue_id}/resolve", method="POST")
    print(f"[7c] POST /api/issues/{issue_id}/resolve -> Status: {code}, Status: {resolve_res.get('status')}")
    assert code == 200
    assert resolve_res.get("status") == "RESOLVED"

    # 8. Contribution achievement appears
    code, achs = make_request("/api/student/STU001/achievements")
    print(f"\n[8] GET /api/student/STU001/achievements -> Status: {code}")
    matching_ach = [a for a in achs if "Damaged Ceiling Fan" in a.get("title", "")]
    assert len(matching_ach) >= 1
    print(f"    Verified Contribution Achievement: '{matching_ach[0]['title']}' (Source: {matching_ach[0]['source']})")

    # 9. NFC tap/purchase
    code, tap_res = make_request(
        "/api/nfc/tap",
        method="POST",
        data={
            "token": "tok_aarav_nfc_001",
            "merchant_id": "MERCHANT001",
            "amount": 25,
            "description": "Canteen Fresh Juice & Sandwich",
            "idempotency_key": f"pur_smoke_{uuid.uuid4().hex[:6]}"
        },
        headers={"X-Actor-Role": "MERCHANT"}
    )
    print(f"\n[9] POST /api/nfc/tap (NFC Tap & Purchase of 25 pts) -> Status: {code}")
    print(f"    Student: {tap_res.get('student_name')}, Status: {tap_res.get('status')}")
    print(f"    Purchase Result: {tap_res.get('purchase_result')}")
    assert code == 200
    assert tap_res.get("purchase_result", {}).get("success") is True

    # 10. Balance decreases
    code, aarav_bal_after_purchase = make_request("/api/student/STU001/balance")
    print(f"\n[10] GET /api/student/STU001/balance (After Purchase) -> Status: {code}")
    print(f"     Previous Campus: {aarav_bal_after_reward['campus_balance']} -> New Campus: {aarav_bal_after_purchase['campus_balance']}")
    print(f"     Previous Total: {aarav_bal_after_reward['total_balance']} -> New Total: {aarav_bal_after_purchase['total_balance']}")
    assert aarav_bal_after_purchase['campus_balance'] == aarav_bal_after_reward['campus_balance'] - 25
    assert aarav_bal_after_purchase['total_balance'] == aarav_bal_after_reward['total_balance'] - 25

    # 11. Passport shows everything
    code, passport = make_request("/api/student/STU001/passport")
    print(f"\n[11] GET /api/student/STU001/passport -> Status: {code}")
    print(f"     Student: {passport['student']['name']} ({passport['student']['id']})")
    print(f"     Student Pocket Total: {passport['student_pocket']['total_balance']} pts")
    print(f"     Student Pocket Academic: {passport['student_pocket']['academic_balance']} pts")
    print(f"     Student Pocket Campus: {passport['student_pocket']['campus_balance']} pts")
    print(f"     Negative Limit: {passport['student_pocket']['negative_balance_limit']}")
    print(f"     Available Spending: {passport['student_pocket']['available_spending_balance']}")
    print(f"     Total Achievements: {len(passport['achievements']['all'])}")
    print(f"     Learning Achievements: {len(passport['achievements']['learning'])}")
    print(f"     Contribution Achievements: {len(passport['achievements']['contribution'])}")
    print(f"     Extracurricular Achievements: {len(passport['achievements']['extracurricular'])}")
    print(f"     Recent Ledger Transactions: {len(passport['recent_transactions'])}")
    print(f"     School Issues: {len(passport['school_issues'])}")
    print(f"     Opportunity Applications: {len(passport['opportunity_applications'])}")

    assert passport['student_pocket']['campus_balance'] == aarav_bal_after_purchase['campus_balance']
    assert len(passport['achievements']['extracurricular']) >= 1
    assert len(passport['recent_transactions']) >= 1

    print("\n" + "=" * 60)
    print("ALL 11 SMOKE TEST DEMONSTRATION STEPS COMPLETED WITH 100% SUCCESS!")
    print("=" * 60)


if __name__ == "__main__":
    run_live_smoke_test()
