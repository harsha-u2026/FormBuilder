"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. users table
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
        op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # 2. forms table
    if "forms" not in existing_tables:
        op.create_table(
            "forms",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("title", sa.String(length=255), nullable=False, server_default="Untitled Form"),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("theme_color", sa.String(length=50), nullable=False, server_default="#6366f1"),
            sa.Column("submit_button_text", sa.String(length=50), nullable=False, server_default="Submit"),
            sa.Column("success_message", sa.Text(), nullable=False, server_default="Thank you! Your response has been recorded."),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(op.f("ix_forms_id"), "forms", ["id"], unique=False)
        op.create_index(op.f("ix_forms_owner_id"), "forms", ["owner_id"], unique=False)

    # 3. form_fields table
    if "form_fields" not in existing_tables:
        op.create_table(
            "form_fields",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("form_id", sa.Integer(), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("field_type", sa.String(length=50), nullable=False, server_default="text"),
            sa.Column("label", sa.String(length=255), nullable=False, server_default="Untitled Question"),
            sa.Column("placeholder", sa.String(length=255), nullable=True),
            sa.Column("help_text", sa.Text(), nullable=True),
            sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("options", sa.JSON(), nullable=True),
            sa.Column("validation_rules", sa.JSON(), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(op.f("ix_form_fields_id"), "form_fields", ["id"], unique=False)
        op.create_index(op.f("ix_form_fields_form_id"), "form_fields", ["form_id"], unique=False)

    # 4. form_responses table
    if "form_responses" not in existing_tables:
        op.create_table(
            "form_responses",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("form_id", sa.Integer(), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("answers", sa.JSON(), nullable=False),
            sa.Column("respondent_ip", sa.String(length=100), nullable=True),
        )
        op.create_index(op.f("ix_form_responses_id"), "form_responses", ["id"], unique=False)
        op.create_index(op.f("ix_form_responses_form_id"), "form_responses", ["form_id"], unique=False)


def downgrade() -> None:
    op.drop_table("form_responses")
    op.drop_table("form_fields")
    op.drop_table("forms")
    op.drop_table("users")
