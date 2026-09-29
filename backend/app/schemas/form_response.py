from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FormResponseSubmit(BaseModel):
    answers: Dict[str, Any]


class FormResponseRead(BaseModel):
    id: int
    form_id: int
    submitted_at: datetime
    answers: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class FieldSummary(BaseModel):
    field_id: int
    label: str
    field_type: str
    total_answers: int
    option_counts: Optional[Dict[str, int]] = None
    average_rating: Optional[float] = None
    recent_answers: Optional[List[Any]] = None


class FormAnalyticsSummary(BaseModel):
    form_id: int
    total_responses: int
    latest_response_at: Optional[datetime] = None
    fields_summary: List[FieldSummary] = []
