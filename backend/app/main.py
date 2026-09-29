from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables if they do not exist
    Base.metadata.create_all(bind=engine)
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


@app.get("/", tags=["Root"])
def root():
    """Root endpoint welcoming visitors and directing to interactive docs."""
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
