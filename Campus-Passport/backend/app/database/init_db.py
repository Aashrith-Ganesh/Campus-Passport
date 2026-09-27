from .database import Base, SessionLocal, engine
from .seed import seed_demo_data


def initialize_database(seed_demo: bool = False):
    """
    Create missing tables without dropping existing data.

    Set seed_demo=True only when demo records are desired.
    """
    Base.metadata.create_all(bind=engine)

    if seed_demo:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
