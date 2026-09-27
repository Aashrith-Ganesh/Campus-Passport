from fastapi.testclient import TestClient

from backend.app.database import initialize_database
from backend.app.main import app

client = TestClient(app)


def setup_module():
    initialize_database(seed_demo=True)


def test_passport_endpoints():
    # 1. GET achievements for STU001
    res = client.get("/api/student/STU001/achievements")
    assert res.status_code == 200
    achievements = res.json()
    assert len(achievements) >= 2
    types = {a["type"] for a in achievements}
    assert "LEARNING" in types
    assert "CONTRIBUTION" in types

    # 2. GET points for STU001
    res = client.get("/api/student/STU001/points")
    assert res.status_code == 200
    points_data = res.json()
    assert "total_points" in points_data
    assert points_data["total_points"] > 0
    assert "breakdown" in points_data
    assert "transactions" in points_data

    # 3. GET full passport snapshot for STU001
    res = client.get("/api/student/STU001/passport")
    assert res.status_code == 200
    passport = res.json()
    assert passport["student"]["id"] == "STU001"
    assert passport["student"]["name"] == "Aarav"
    assert "achievements" in passport
    assert len(passport["achievements"]["all"]) >= 2
    assert len(passport["achievements"]["learning"]) >= 1
    assert len(passport["achievements"]["contribution"]) >= 1
    assert "recent_evidence" in passport
    assert "opportunity_applications" in passport
    assert "school_issues" in passport

    # 4. Unknown student passport -> 404
    res_404 = client.get("/api/student/UNKNOWN_STUDENT_ID/passport")
    assert res_404.status_code == 404


if __name__ == "__main__":
    setup_module()
    test_passport_endpoints()
    print("Campus Passport tests passed successfully!")
