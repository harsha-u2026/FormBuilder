from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FormUploadRead(BaseModel):
    id: int
    form_id: int
    field_id: Optional[int] = None
    response_id: Optional[int] = None
    file_key: str
    original_filename: str
    file_size: int
    content_type: Optional[str] = None
    created_at: datetime
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
