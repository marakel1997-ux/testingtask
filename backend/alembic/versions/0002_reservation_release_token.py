"""add reservation release token

Revision ID: 0002_reservation_release_token
Revises: 0001_initial
Create Date: 2026-03-13 00:30:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0002_reservation_release_token'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reservations', sa.Column('release_token', sa.String(length=64), nullable=True))
    op.execute("UPDATE reservations SET release_token = md5(random()::text || clock_timestamp()::text || id::text)")
    op.alter_column('reservations', 'release_token', nullable=False)
    op.create_index(op.f('ix_reservations_release_token'), 'reservations', ['release_token'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_reservations_release_token'), table_name='reservations')
    op.drop_column('reservations', 'release_token')
