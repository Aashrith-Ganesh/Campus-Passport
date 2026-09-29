import logging

try:
    from backend.app.database.database import Base, SessionLocal, engine
    from backend.app.database.seed import seed_demo_data
except ImportError:
    from .database import Base, SessionLocal, engine
    from .seed import seed_demo_data

logger = logging.getLogger("campus_passport.database")


def create_tables():
    """
    Create missing tables without dropping existing data.
    Safe to run repeatedly.
    """
    logger.info("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)


def seed_demo():
    """
    Idempotently populate database with initial demo records.
    Safe to run repeatedly without creating duplicate records.
    """
    logger.info("Seeding deterministic demo records...")
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


def initialize_database(seed_demo: bool = False):
    """
    Centralized database initialization entrypoint.

    1. Creates all tables registered on SQLAlchemy Base if missing.
    2. Optionally runs idempotent demo seeding if seed_demo=True.
    Does not drop existing tables or delete existing user data.
    """
    create_tables()

    if seed_demo:
        seed_demo_records()


def seed_demo_records():
    """Alias for seed_demo for explicit readability."""
    seed_demo()


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)
    seed = "--seed" in sys.argv or "-s" in sys.argv
    initialize_database(seed_demo=seed)
    print("Database initialization complete.")
