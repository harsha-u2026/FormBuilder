from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.form_field import FormFieldCreate, FormFieldRead

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
SAFE_FONTS = {"inter", "roboto", "outfit", "playfair", "jetbrains"}
SAFE_BUTTON_STYLES = {"rounded", "pill", "sharp"}
SAFE_BG_STYLES = {"clean", "slate", "warm", "midnight", "gradient"}


def sanitize_theme_settings(v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not v:
        return v
    cleaned = dict(v)
    if "primary_color" in cleaned and cleaned["primary_color"]:
        col = str(cleaned["primary_color"]).strip()
        if not HEX_COLOR_REGEX.match(col):
            raise ValueError(f"Invalid primary_color '{col}': must be a valid 3 or 6 digit hex code (e.g. #4F46E5)")
    if "font_family" in cleaned and cleaned["font_family"]:
        font = str(cleaned["font_family"]).strip().lower()
        cleaned["font_family"] = font if font in SAFE_FONTS else "inter"
    if "button_style" in cleaned and cleaned["button_style"]:
        btn = str(cleaned["button_style"]).strip().lower()
        cleaned["button_style"] = btn if btn in SAFE_BUTTON_STYLES else "rounded"
    if "background_style" in cleaned and cleaned["background_style"]:
        bg = str(cleaned["background_style"]).strip().lower()
        cleaned["background_style"] = bg if bg in SAFE_BG_STYLES else "clean"
    if "banner_url" in cleaned and cleaned["banner_url"]:
        url = str(cleaned["banner_url"]).strip()
        # Disallow javascript: or unsafe protocols
        if url.lower().startswith("javascript:") or "<" in url or ">" in url or '"' in url:
            raise ValueError("Invalid banner_url: JavaScript and HTML injection are strictly forbidden.")
    return cleaned


class FormBase(BaseModel):
    title: str = Field(default="Untitled Form", max_length=255)
    description: Optional[str] = None
    is_published: bool = False
    theme_color: str = Field(default="#6366f1", max_length=50)
    theme_settings: Optional[Dict[str, Any]] = None
    submit_button_text: str = Field(default="Submit", max_length=50)
    success_message: str = "Thank you! Your response has been recorded."

    @field_validator("theme_settings", mode="before")
    @classmethod
    def validate_theme_settings(cls, v: Any) -> Optional[Dict[str, Any]]:
        if isinstance(v, dict):
            return sanitize_theme_settings(v)
        return v


class FormCreate(FormBase):
    initial_fields: Optional[List[FormFieldCreate]] = None


class FormUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    is_published: Optional[bool] = None
    theme_color: Optional[str] = Field(default=None, max_length=50)
    theme_settings: Optional[Dict[str, Any]] = None
    submit_button_text: Optional[str] = Field(default=None, max_length=50)
    success_message: Optional[str] = None

    @field_validator("theme_settings", mode="before")
    @classmethod
    def validate_theme_settings(cls, v: Any) -> Optional[Dict[str, Any]]:
        if isinstance(v, dict):
            return sanitize_theme_settings(v)
        return v


class FormListItem(BaseModel):
    id: int
    owner_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    is_published: bool
    theme_color: str
    theme_settings: Optional[Dict[str, Any]] = None
    submit_button_text: str
    created_at: datetime
    updated_at: datetime
    field_count: int = 0
    response_count: int = 0
    view_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FormRead(FormBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    fields: List[FormFieldRead] = []
    response_count: int = 0
    view_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FormPublicRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_published: bool
    theme_color: str
    theme_settings: Optional[Dict[str, Any]] = None
    submit_button_text: str
    success_message: str
    fields: List[FormFieldRead] = []

    model_config = ConfigDict(from_attributes=True)

