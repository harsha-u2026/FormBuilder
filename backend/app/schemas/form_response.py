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
    answer_rate: Optional[float] = None
    option_counts: Optional[Dict[str, int]] = None
    option_percentages: Optional[Dict[str, float]] = None
    average_rating: Optional[float] = None
    rating_breakdown: Optional[Dict[str, int]] = None
    recent_answers: Optional[List[Any]] = None


class TrendPoint(BaseModel):
    date: str
    count: int


class FormAnalyticsSummary(BaseModel):
    form_id: int
    total_responses: int
    view_count: int = 0
    completion_rate: Optional[float] = None
    latest_response_at: Optional[datetime] = None
    daily_trends: List[TrendPoint] = []
    fields_summary: List[FieldSummary] = []
    date_filter_applied: bool = False

