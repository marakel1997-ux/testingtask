"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-03-13 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'wishlists',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=True),
        sa.Column('event_date', sa.Date(), nullable=True),
        sa.Column('public_id', sa.String(length=32), nullable=False),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )
    op.create_index(op.f('ix_wishlists_owner_id'), 'wishlists', ['owner_id'], unique=False)
    op.create_index(op.f('ix_wishlists_public_id'), 'wishlists', ['public_id'], unique=True)

    op.create_table(
        'wishlist_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('wishlist_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('product_url', sa.String(length=1024), nullable=True),
        sa.Column('image_url', sa.String(length=1024), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('amount_collected', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('is_reserved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_fully_funded', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_reason', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wishlist_id'], ['wishlists.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_wishlist_items_wishlist_id'), 'wishlist_items', ['wishlist_id'], unique=False)

    op.create_table(
        'reservations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('wishlist_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('anonymous_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wishlist_item_id'], ['wishlist_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reservations_wishlist_item_id'), 'reservations', ['wishlist_item_id'], unique=False)
    op.create_index(
        'ux_reservations_active_item',
        'reservations',
        ['wishlist_item_id'],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        'contributions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('wishlist_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wishlist_item_id'], ['wishlist_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contributions_wishlist_item_id'), 'contributions', ['wishlist_item_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_contributions_wishlist_item_id'), table_name='contributions')
    op.drop_table('contributions')
    op.drop_index('ux_reservations_active_item', table_name='reservations')
    op.drop_index(op.f('ix_reservations_wishlist_item_id'), table_name='reservations')
    op.drop_table('reservations')
    op.drop_index(op.f('ix_wishlist_items_wishlist_id'), table_name='wishlist_items')
    op.drop_table('wishlist_items')
    op.drop_index(op.f('ix_wishlists_public_id'), table_name='wishlists')
    op.drop_index(op.f('ix_wishlists_owner_id'), table_name='wishlists')
    op.drop_table('wishlists')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
