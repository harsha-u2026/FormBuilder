from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormUpload(Base):
    __tablename__ = "form_uploads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    form_id = Column(
        Integer,
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_id = Column(
        Integer,
        ForeignKey("form_fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    response_id = Column(
        Integer,
        ForeignKey("form_responses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    file_key = Column(String(100), unique=True, index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    form = relationship("Form", back_populates="uploads")
    response = relationship("FormResponse", back_populates="uploads")

    def __repr__(self) -> str:
        return f"<FormUpload(id={self.id}, form_id={self.form_id}, filename='{self.original_filename}', key='{self.file_key}')>"
