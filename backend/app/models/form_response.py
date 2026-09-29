from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormResponse(Base):
    __tablename__ = "form_responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    form_id = Column(
        Integer,
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    answers = Column(JSON, nullable=False, default=dict)  # { "1": "Alice", "2": ["Option A"] }
    respondent_ip = Column(String(100), nullable=True)

    # Relationship back to Form
    form = relationship("Form", back_populates="responses")

    def __repr__(self) -> str:
        return f"<FormResponse(id={self.id}, form_id={self.form_id}, submitted_at='{self.submitted_at}')>"
