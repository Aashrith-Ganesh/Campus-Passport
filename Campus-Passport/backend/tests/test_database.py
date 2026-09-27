import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.models import Achievement, Base, Student
from backend.app.database.crud import (
    create_achievement,
    get_student,
    get_student_achievements,
)
from backend.app.database.schemas import AchievementCreate


def test_database_crud_and_persistence():
    # Test on a temporary SQLite file to test persistence across connections
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    try:
        # Connection 1: initialize and insert
        engine1 = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(bind=engine1)
        Session1 = sessionmaker(bind=engine1)
        db1 = Session1()

        # Insert student
        student = Student(
            id="TEST_STU01",
            name="Priya",
            class_name="10",
            preferred_language="Hindi",
        )
        db1.add(student)
        db1.commit()

        # Insert achievement using CRUD
        create_achievement(
            db1,
            AchievementCreate(
                student_id="TEST_STU01",
                type="LEARNING",
                title="Physics Lab Mastery",
                description="Completed optics experiment",
                source="CAMPUS_LENS",
                evidence="Score 10/10",
            ),
        )
        db1.close()
        engine1.dispose()

        # Connection 2: Verify persistence after restart
        engine2 = create_engine(f"sqlite:///{db_path}")
        Session2 = sessionmaker(bind=engine2)
        db2 = Session2()

        # Student lookup
        fetched_student = get_student(db2, "TEST_STU01")
        assert fetched_student is not None
        assert fetched_student.name == "Priya"

        # Achievement retrieval
        achievements = get_student_achievements(db2, "TEST_STU01")
        assert len(achievements) == 1
        assert achievements[0].title == "Physics Lab Mastery"
        assert achievements[0].type == "LEARNING"

        db2.close()
        engine2.dispose()
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


if __name__ == "__main__":
    test_database_crud_and_persistence()
    print("Database CRUD and persistence tests passed successfully!")
