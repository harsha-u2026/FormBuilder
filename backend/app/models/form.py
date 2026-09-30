from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(255), nullable=False, default="Untitled Form")
    description = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    theme_color = Column(String(50), default="#6366f1", nullable=False)
    submit_button_text = Column(String(50), default="Submit", nullable=False)
    success_message = Column(
        Text,
        default="Thank you! Your response has been recorded.",
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="forms")
    fields = relationship(
        "FormField",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="FormField.order",
        lazy="selectin",
    )
    responses = relationship(
        "FormResponse",
        back_populates="form",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Form(id={self.id}, title='{self.title}', is_published={self.is_published})>"
