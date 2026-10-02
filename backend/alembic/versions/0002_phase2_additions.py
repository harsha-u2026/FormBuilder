"""phase2 additions

Revision ID: 0002_phase2
Revises: 0001_initial
Create Date: 2026-10-02 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0002_phase2'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Add conditional_rules to form_fields if missing
    if "form_fields" in existing_tables:
        cols = [c["name"] for c in inspector.get_columns("form_fields")]
        if "conditional_rules" not in cols:
            op.add_column("form_fields", sa.Column("conditional_rules", sa.JSON(), nullable=True))

    # 2. Create form_uploads table if missing
    if "form_uploads" not in existing_tables:
        op.create_table(
            "form_uploads",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("form_id", sa.Integer(), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("field_id", sa.Integer(), sa.ForeignKey("form_fields.id", ondelete="SET NULL"), nullable=True),
            sa.Column("response_id", sa.Integer(), sa.ForeignKey("form_responses.id", ondelete="SET NULL"), nullable=True),
            sa.Column("file_key", sa.String(length=100), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("stored_filename", sa.String(length=255), nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(op.f("ix_form_uploads_id"), "form_uploads", ["id"], unique=False)
        op.create_index(op.f("ix_form_uploads_form_id"), "form_uploads", ["form_id"], unique=False)
        op.create_index(op.f("ix_form_uploads_field_id"), "form_uploads", ["field_id"], unique=False)
        op.create_index(op.f("ix_form_uploads_response_id"), "form_uploads", ["response_id"], unique=False)
        op.create_index(op.f("ix_form_uploads_file_key"), "form_uploads", ["file_key"], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "form_uploads" in existing_tables:
        op.drop_table("form_uploads")

    if "form_fields" in existing_tables:
        cols = [c["name"] for c in inspector.get_columns("form_fields")]
        if "conditional_rules" in cols:
            with op.batch_alter_table("form_fields") as batch_op:
                batch_op.drop_column("conditional_rules")
