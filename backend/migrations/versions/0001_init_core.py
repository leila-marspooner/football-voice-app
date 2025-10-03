"""init core

Revision ID: 0001
Revises: 
Create Date: 2025-10-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clubs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "teams",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("club_id", sa.BigInteger, sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("age_group", sa.String(50)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "coaches",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.BigInteger, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(100)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "players",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.BigInteger, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("position", sa.String(50)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_players_team_id", "players", ["team_id"])

    op.create_table(
        "matches",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.BigInteger, sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("opponent_name", sa.String(255), nullable=False),
        sa.Column("kickoff_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("competition", sa.String(100)),
        sa.Column("venue", sa.String(200)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_matches_team_id", "matches", ["team_id"])

    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.BigInteger, sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("minute", sa.BigInteger, nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("team_context", sa.String(20), nullable=False, server_default="us"),
        sa.Column("player_id", sa.BigInteger, sa.ForeignKey("players.id")),
        sa.Column("raw_text", sa.Text),
        sa.Column("meta_json", postgresql.JSONB),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_events_match_id", "events", ["match_id"])

    op.create_table(
        "raw_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.BigInteger, sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("payload_json", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_raw_events_match_id", "raw_events", ["match_id"])

    op.create_table(
        "lineups",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.BigInteger, sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("player_id", sa.BigInteger, sa.ForeignKey("players.id"), nullable=False),
        sa.Column("position", sa.String(20)),
        sa.Column("is_starter", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "stats_cache",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("player_id", sa.BigInteger, sa.ForeignKey("players.id")),
        sa.Column("match_id", sa.BigInteger, sa.ForeignKey("matches.id")),
        sa.Column("stat_json", postgresql.JSONB, nullable=False),
        sa.Column(
            "computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("stats_cache")
    op.drop_table("lineups")
    op.drop_index("ix_raw_events_match_id", table_name="raw_events")
    op.drop_table("raw_events")
    op.drop_index("ix_events_match_id", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_matches_team_id", table_name="matches")
    op.drop_table("matches")
    op.drop_index("ix_players_team_id", table_name="players")
    op.drop_table("players")
    op.drop_table("coaches")
    op.drop_table("teams")
    op.drop_table("clubs")
