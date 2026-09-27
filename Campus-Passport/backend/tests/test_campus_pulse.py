from fastapi.testclient import TestClient

from backend.app.database import initialize_database
from backend.app.database.database import SessionLocal
from backend.app.database.models import Achievement, SchoolIssue
from backend.app.main import app

client = TestClient(app)


def setup_module():
    initialize_database(seed_demo=True)


def test_campus_pulse_issue_workflow():
    # 1. Create issue
    payload = {
        "title": "Broken Science Lab Water Tap",
        "description": "The water tap in Biology Lab 2 has been leaking continuously.",
        "category": "INFRASTRUCTURE",
        "location": "Biology Lab 2",
        "student_id": "STU001",
    }
    res = client.post("/api/campus-pulse/issues", json=payload)
    assert res.status_code == 201
    issue = res.json()
    issue_id = issue["id"]
    assert issue["status"] == "SUBMITTED"
    assert issue["title"] == payload["title"]

    # Retrieve issue
    res = client.get(f"/api/campus-pulse/issues/{issue_id}")
    assert res.status_code == 200
    assert res.json()["id"] == issue_id

    # 2. Add Interview 1
    int1 = {
        "participant_type": "Student",
        "participant_name": "Rohan",
        "response": "Water spills onto the floor during experiments, making it slippery.",
    }
    res = client.post(f"/api/campus-pulse/issues/{issue_id}/interviews", json=int1)
    assert res.status_code == 201

    # Check status moved to UNDER_REVIEW
    res = client.get(f"/api/campus-pulse/issues/{issue_id}")
    assert res.json()["status"] == "UNDER_REVIEW"

    # 3. Research retrieval: 1 interview -> cannot verify yet
    res = client.get(f"/api/campus-pulse/issues/{issue_id}/research")
    assert res.status_code == 200
    research = res.json()
    assert research["interview_count"] == 1
    assert research["is_ready_for_verification"] is False

    # 4. Attempt verify with fewer than 3 interviews -> MUST FAIL with 400
    res_verify_fail = client.post(f"/api/campus-pulse/issues/{issue_id}/verify")
    assert res_verify_fail.status_code == 400
    assert "at least 3" in res_verify_fail.json()["detail"].lower()

    # 5. Add Interview 2 & Interview 3
    int2 = {
        "participant_type": "Teacher",
        "participant_name": "Mrs. Sharma",
        "response": "We have to shut off the main valve, preventing chemistry practicals.",
    }
    client.post(f"/api/campus-pulse/issues/{issue_id}/interviews", json=int2)

    int3 = {
        "participant_type": "Staff",
        "participant_name": "Mr. Ramesh (Caretaker)",
        "response": "The rubber washer has worn out; replacing it will fix the leak.",
    }
    client.post(f"/api/campus-pulse/issues/{issue_id}/interviews", json=int3)

    # 6. Check research retrieval: 3 interviews -> ready for verification
    res = client.get(f"/api/campus-pulse/issues/{issue_id}/research")
    assert res.status_code == 200
    research = res.json()
    assert research["interview_count"] == 3
    assert research["is_ready_for_verification"] is True

    # 7. Verify with 3 interviews -> MUST SUCCEED with VERIFIED
    res_verify = client.post(f"/api/campus-pulse/issues/{issue_id}/verify")
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "VERIFIED"

    # 8. Resolve issue -> MUST SUCCEED with RESOLVED
    res_resolve = client.post(f"/api/campus-pulse/issues/{issue_id}/resolve")
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"

    # 9. Verify CONTRIBUTION achievement was created in the shared database
    db = SessionLocal()
    try:
        ach = (
            db.query(Achievement)
            .filter(
                Achievement.student_id == "STU001",
                Achievement.source == "CAMPUS_PULSE",
                Achievement.type == "CONTRIBUTION",
                Achievement.title.contains("Broken Science Lab Water Tap"),
            )
            .first()
        )
        assert ach is not None
        assert "Biology Lab 2" in ach.description or "Water Tap" in ach.title
    finally:
        db.close()


if __name__ == "__main__":
    setup_module()
    test_campus_pulse_issue_workflow()
    print("Campus Pulse tests passed successfully!")
