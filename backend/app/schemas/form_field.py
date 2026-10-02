from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FormFieldBase(BaseModel):
    field_type: str = Field(
        default="text",
        description="Field type: text, textarea, number, radio, checkbox, select, rating, date, email, switch, file",
    )
    label: str = Field(default="Untitled Question", max_length=255)
    placeholder: Optional[str] = Field(default=None, max_length=255)
    help_text: Optional[str] = None
    required: bool = False
    options: Optional[List[Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    conditional_rules: Optional[Dict[str, Any]] = None
    order: int = 0


class FormFieldCreate(FormFieldBase):
    pass


class FormFieldUpdate(BaseModel):
    field_type: Optional[str] = None
    label: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    conditional_rules: Optional[Dict[str, Any]] = None
    order: Optional[int] = None


class FormFieldRead(FormFieldBase):
    id: int
    form_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FieldOrderItem(BaseModel):
    id: int
    order: int


class FieldOrderUpdate(BaseModel):
    fields: List[FieldOrderItem]
