from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text, inspect
from pathlib import Path
import logging

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
import app.models  # noqa: F401

logger = logging.getLogger("formbuilder.startup")

# Frontend production distribution path
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def ensure_database_schema():
    """Idempotently ensure tables and newly added columns exist without data loss."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "forms" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("forms")]
                if "owner_id" not in cols:
                    logger.info("Migrating schema: adding owner_id column to forms table.")
                    conn.execute(text("ALTER TABLE forms ADD COLUMN owner_id INTEGER"))
                    conn.commit()

            if "form_fields" in inspector.get_table_names():
                field_cols = [c["name"] for c in inspector.get_columns("form_fields")]
                if "conditional_rules" not in field_cols:
                    logger.info("Migrating schema: adding conditional_rules column to form_fields table.")
                    conn.execute(text("ALTER TABLE form_fields ADD COLUMN conditional_rules JSON"))
                    conn.commit()
    except Exception as exc:
        logger.warning(f"Schema migration warning: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create and migrate tables safely if they do not exist
    ensure_database_schema()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static assets if frontend production build exists
if (FRONTEND_DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="assets")


@app.get("/", tags=["Root"])
def root():
    """Root endpoint: serves frontend SPA if built, otherwise returns API welcome info."""
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {
        "message": "Welcome to FormBuilder API",
        "version": "0.1.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@app.get("/health", tags=["System"])
def health_check():
    """Basic health check endpoint confirming the backend server is running."""
    return {
        "status": "ok",
        "service": "formbuilder-backend",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health/db", tags=["System"])
def database_health_check():
    """Checks the active database connection status and dialect."""
    dialect_name = engine.dialect.name if engine else "unknown"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "connected",
            "database": dialect_name,
            "message": f"Successfully connected to {dialect_name} database.",
        }
    except Exception as exc:
        return {
            "status": "disconnected",
            "database": dialect_name,
            "message": f"Database not yet reachable: {str(exc)}",
        }


# SPA fallback route: serves index.html or static files for direct navigation / refresh
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_fallback(full_path: str):
    # Do not intercept API endpoints, docs, or OpenAPI schema
    if (
        full_path.startswith("api/")
        or full_path == "api"
        or full_path.startswith("health")
        or full_path == "health"
        or full_path.startswith("docs")
        or full_path == "docs"
        or full_path.startswith("redoc")
        or full_path == "redoc"
        or full_path.startswith("openapi.json")
    ):
        raise HTTPException(status_code=404, detail="Not Found")

    # If static file exists directly under dist (e.g. favicon, assets)
    file_path = FRONTEND_DIST_DIR / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))

    # Return index.html for SPA routes (e.g. /public/..., /p/..., deep links)
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))

    raise HTTPException(status_code=404, detail="Frontend build not found")

