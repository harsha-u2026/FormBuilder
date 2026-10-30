"""theme and view count additions

Revision ID: 0003_theme_and_views
Revises: 0002_phase2
Create Date: 2026-10-15 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0003_theme_and_views'
down_revision: Union[str, None] = '0002_phase2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "forms" in existing_tables:
        cols = [c["name"] for c in inspector.get_columns("forms")]
        if "theme_settings" not in cols:
            op.add_column("forms", sa.Column("theme_settings", sa.JSON(), nullable=True))
        if "view_count" not in cols:
            op.add_column("forms", sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "forms" in existing_tables:
        cols = [c["name"] for c in inspector.get_columns("forms")]
        with op.batch_alter_table("forms") as batch_op:
            if "theme_settings" in cols:
                batch_op.drop_column("theme_settings")
            if "view_count" in cols:
                batch_op.drop_column("view_count")
