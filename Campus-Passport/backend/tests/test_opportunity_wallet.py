from fastapi.testclient import TestClient

from backend.app.database import initialize_database
from backend.app.database.database import SessionLocal
from backend.app.database.models import Achievement, Student
from backend.app.main import app

client = TestClient(app)


def setup_module():
    initialize_database(seed_demo=True)


def test_list_and_get_opportunities():
    # List opportunities
    res = client.get("/api/opportunities")
    assert res.status_code == 200
    opps = res.json()
    assert len(opps) >= 1
    assert any(o["id"] == "OPP001" for o in opps)

    # Retrieve valid opportunity
    res = client.get("/api/opportunities/OPP001")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "OPP001"
    assert data["amount"] == 2000

    # Unknown opportunity
    res = client.get("/api/opportunities/NON_EXISTENT")
    assert res.status_code == 404


def test_student_eligibility_scenarios():
    db = SessionLocal()
    try:
        # Create student with only LEARNING
        if not db.get(Student, "STU_LEARN_ONLY"):
            db.add(
                Student(
                    id="STU_LEARN_ONLY",
                    name="Learning Only",
                    class_name="10",
                    preferred_language="English",
                )
            )
            db.add(
                Achievement(
                    student_id="STU_LEARN_ONLY",
                    type="LEARNING",
                    title="Math Quiz",
                    description="Scored well",
                    source="CAMPUS_LENS",
                )
            )
            db.commit()

        # Create student with only CONTRIBUTION
        if not db.get(Student, "STU_CONTRIB_ONLY"):
            db.add(
                Student(
                    id="STU_CONTRIB_ONLY",
                    name="Contrib Only",
                    class_name="10",
                    preferred_language="English",
                )
            )
            db.add(
                Achievement(
                    student_id="STU_CONTRIB_ONLY",
                    type="CONTRIBUTION",
                    title="Tree Planting",
                    description="Campus greening",
                    source="CAMPUS_PULSE",
                )
            )
            db.commit()
    finally:
        db.close()

    # 1. Eligible student (STU001 - seeded with both LEARNING & CONTRIBUTION)
    res = client.get("/api/student/STU001/opportunities/OPP001/eligibility")
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is True
    assert len(data["reasons"]) == 2
    assert len(data["missing_requirements"]) == 0

    # 2. Missing contribution achievement
    res = client.get(
        "/api/student/STU_LEARN_ONLY/opportunities/OPP001/eligibility"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is False
    assert any("contribution" in m.lower() for m in data["missing_requirements"])

    # 3. Missing learning achievement
    res = client.get(
        "/api/student/STU_CONTRIB_ONLY/opportunities/OPP001/eligibility"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is False
    assert any("learning" in m.lower() for m in data["missing_requirements"])

    # 4. Unknown opportunity for eligibility check -> 404
    res = client.get(
        "/api/student/STU001/opportunities/UNKNOWN_OPP/eligibility"
    )
    assert res.status_code == 404


def test_application_workflow_and_duplicate_prevention():
    db = SessionLocal()
    from backend.app.database.models import OpportunityApplication
    db.query(OpportunityApplication).filter(OpportunityApplication.student_id == "STU001").delete()
    db.commit()
    db.close()

    # Ineligible student applying -> 400
    res = client.post(
        "/api/student/STU_LEARN_ONLY/opportunities/OPP001/apply"
    )
    assert res.status_code == 400
    assert "not eligible" in res.json()["detail"].lower()


    # Unknown opportunity applying -> 404
    res = client.post(
        "/api/student/STU001/opportunities/UNKNOWN_OPP/apply"
    )
    assert res.status_code == 404

    # Eligible student applying -> 200 / 201 success with SIMULATED_APPROVED
    res = client.post("/api/student/STU001/opportunities/OPP001/apply")
    assert res.status_code in (200, 201)
    app_data = res.json()
    assert app_data["student_id"] == "STU001"
    assert app_data["opportunity_id"] == "OPP001"
    assert app_data["status"] == "SIMULATED_APPROVED"
    assert app_data["amount"] == 2000

    # Persistence verification: fetch applications for student
    res = client.get("/api/student/STU001/opportunities/applications")
    assert res.status_code == 200
    apps = res.json()
    assert any(a["application_id"] == app_data["application_id"] for a in apps)


    # Duplicate application handling -> returns 400 rejecting duplicate
    res_dup = client.post("/api/student/STU001/opportunities/OPP001/apply")
    assert res_dup.status_code == 400
    assert "already applied" in res_dup.json()["detail"].lower()


if __name__ == "__main__":
    setup_module()
    test_list_and_get_opportunities()
    test_student_eligibility_scenarios()
    test_application_workflow_and_duplicate_prevention()
    print("Opportunity Wallet tests passed successfully!")
