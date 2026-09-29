from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.core.config import settings

DATABASE_PATH = settings.DATABASE_PATH
DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

# SQLite does not enforce FK constraints unless this PRAGMA is enabled
# on each connection.
@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

from contextlib import contextmanager

Base = declarative_base()


def get_db():
    """
    FastAPI-compatible DB dependency.

    Usage:
        from backend.app.database.database import get_db
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions in scripts/tests.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

