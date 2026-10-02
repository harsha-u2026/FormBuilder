from pathlib import Path
from typing import List, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory: FormBuilder/backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "formbuilder.db"
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "FormBuilder API"
    API_V1_STR: str = "/api/v1"
    
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    
    # Primary database connection string
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/formbuilder_db"
    
    # Fallback to local SQLite if PostgreSQL is unreachable (defaults to backend/formbuilder.db)
    SQLITE_FALLBACK_URL: str = DEFAULT_SQLITE_URL
    ENABLE_SQLITE_FALLBACK: bool = True

    # File uploads storage directory
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")

    # Authentication & JWT
    SECRET_KEY: str = "formbuilder-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("DATABASE_URL", "SQLITE_FALLBACK_URL", mode="after")
    @classmethod
    def resolve_sqlite_url(cls, v: str) -> str:
        """Ensure any relative SQLite URL is deterministically resolved to BACKEND_DIR."""
        if v.startswith("sqlite:///") and not v.startswith("sqlite:////"):
            path_part = v[len("sqlite:///"):]
            p = Path(path_part)
            if not p.is_absolute():
                resolved = (BACKEND_DIR / p).resolve()
                return f"sqlite:///{resolved.as_posix()}"
        return v

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
