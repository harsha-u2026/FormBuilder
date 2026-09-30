from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.form_field import FormFieldCreate, FormFieldRead


class FormBase(BaseModel):
    title: str = Field(default="Untitled Form", max_length=255)
    description: Optional[str] = None
    is_published: bool = False
    theme_color: str = Field(default="#6366f1", max_length=50)
    submit_button_text: str = Field(default="Submit", max_length=50)
    success_message: str = "Thank you! Your response has been recorded."


class FormCreate(FormBase):
    initial_fields: Optional[List[FormFieldCreate]] = None


class FormUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    is_published: Optional[bool] = None
    theme_color: Optional[str] = Field(default=None, max_length=50)
    submit_button_text: Optional[str] = Field(default=None, max_length=50)
    success_message: Optional[str] = None


class FormListItem(BaseModel):
    id: int
    owner_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    is_published: bool
    theme_color: str
    submit_button_text: str
    created_at: datetime
    updated_at: datetime
    field_count: int = 0
    response_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FormRead(FormBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    fields: List[FormFieldRead] = []
    response_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FormPublicRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_published: bool
    theme_color: str
    submit_button_text: str
    success_message: str
    fields: List[FormFieldRead] = []

    model_config = ConfigDict(from_attributes=True)
