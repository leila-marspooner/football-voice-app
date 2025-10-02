"""expand models

Revision ID: 20251001_000002
Revises: 20251001_000001
Create Date: 2025-10-01 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20251001_000002'
down_revision: Union[str, None] = '20251001_000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New tables
    op.create_table(
        'clubs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_table(
        'teams',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('club_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('age_group', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'coaches',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('team_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('role', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'players',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('team_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('position', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_players_team_id', 'players', ['team_id'])

    op.create_table(
        'matches',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('team_id', sa.BigInteger(), nullable=False),
        sa.Column('opponent_name', sa.String(length=255), nullable=False),
        sa.Column('kickoff_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('competition', sa.String(length=100), nullable=True),
        sa.Column('venue', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_matches_team_id', 'matches', ['team_id'])

    op.create_table(
        'events',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('match_id', sa.BigInteger(), nullable=False),
        sa.Column('minute', sa.BigInteger(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('team_context', sa.String(length=20), nullable=False),
        sa.Column('player_id', sa.BigInteger(), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('meta_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_events_match_id', 'events', ['match_id'])

    op.create_table(
        'raw_events',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('match_id', sa.BigInteger(), nullable=False),
        sa.Column('payload_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_raw_events_match_id', 'raw_events', ['match_id'])

    op.create_table(
        'lineups',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('match_id', sa.BigInteger(), nullable=False),
        sa.Column('player_id', sa.BigInteger(), nullable=False),
        sa.Column('position', sa.String(length=20), nullable=True),
        sa.Column('is_starter', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'stats_cache',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.BigInteger(), nullable=True),
        sa.Column('match_id', sa.BigInteger(), nullable=True),
        sa.Column('stat_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('stats_cache')
    op.drop_table('lineups')
    op.drop_index('ix_raw_events_match_id', table_name='raw_events')
    op.drop_table('raw_events')
    op.drop_index('ix_events_match_id', table_name='events')
    op.drop_table('events')
    op.drop_index('ix_matches_team_id', table_name='matches')
    op.drop_table('matches')
    op.drop_index('ix_players_team_id', table_name='players')
    op.drop_table('players')
    op.drop_table('coaches')
    op.drop_table('teams')
    op.drop_table('clubs')


