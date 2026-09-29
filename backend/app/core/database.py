import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

logger = logging.getLogger("formbuilder.database")
logging.basicConfig(level=logging.INFO)

ACTIVE_DATABASE_URL = settings.DATABASE_URL
engine = None

# Attempt primary connection; fallback to SQLite if PostgreSQL is unavailable
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
    else:
        # Test postgresql connection quickly
        test_engine = create_engine(settings.DATABASE_URL, connect_args={"connect_timeout": 2})
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        logger.info(f"Connected to primary database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
except Exception as exc:
    if settings.ENABLE_SQLITE_FALLBACK:
        logger.warning(
            f"Could not connect to primary database ({exc}). "
            f"Falling back to local SQLite at {settings.SQLITE_FALLBACK_URL}"
        )
        ACTIVE_DATABASE_URL = settings.SQLITE_FALLBACK_URL
        engine = create_engine(
            ACTIVE_DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
    else:
        logger.error(f"Failed to connect to database: {exc}")
        raise exc

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
