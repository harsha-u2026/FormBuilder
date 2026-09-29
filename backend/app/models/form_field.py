from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    form_id = Column(
        Integer,
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_type = Column(String(50), nullable=False, default="text")
    label = Column(String(255), nullable=False, default="Untitled Question")
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)
    required = Column(Boolean, default=False, nullable=False)
    options = Column(JSON, nullable=True)  # List of string options or {label, value}
    validation_rules = Column(JSON, nullable=True)  # E.g. {"min": 1, "max": 10}
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship back to Form
    form = relationship("Form", back_populates="fields")

    def __repr__(self) -> str:
        return f"<FormField(id={self.id}, form_id={self.form_id}, type='{self.field_type}', label='{self.label}')>"
