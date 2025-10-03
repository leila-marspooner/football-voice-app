# backend/api/dev.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from backend.db import get_session
from backend import models

router = APIRouter()


@router.post("/reset")
async def reset(session: AsyncSession = Depends(get_session)):
    """
    ⚠️ DEVELOPMENT ONLY:
    Truncate all tables (except alembic_version).
    Wipes out all data so you can reseed clean.
    """
    tables = [
        "lineups",
        "events",
        "raw_events",
        "stats_cache",
        "players",
        "coaches",
        "matches",
        "teams",
        "clubs",
    ]
    for table in tables:
        await session.execute(text(f"TRUNCATE {table} RESTART IDENTITY CASCADE;"))
    await session.commit()
    return {"status": "reset complete"}


@router.post("/seed")
async def seed(session: AsyncSession = Depends(get_session)):
    """
    Seed initial test data:
    - Clubs: Winchester City FC, Littleton FC, Stoneham FC
    - Teams: Reds (U9), Thunderchiefs (U9), Panthers (U9)
    - Players: 7 players in Reds
    Safe to re-run: won't create duplicates.
    """

    # --- Clubs ---
    clubs_data = ["Winchester City FC", "Littleton FC", "Stoneham FC"]
    clubs = {}
    for name in clubs_data:
        result = await session.execute(select(models.Club).where(models.Club.name == name))
        club = result.scalars().first()
        if not club:
            club = models.Club(name=name)
            session.add(club)
            await session.flush()
        clubs[name] = club

    # --- Teams ---
    teams_data = {
        "Winchester City FC": ("Reds", "U9"),
        "Littleton FC": ("Thunderchiefs", "U9"),
        "Stoneham FC": ("Panthers", "U9"),
    }
    teams = {}
    for club_name, (team_name, age_group) in teams_data.items():
        result = await session.execute(
            select(models.Team).where(
                models.Team.name == team_name, models.Team.club_id == clubs[club_name].id
            )
        )
        team = result.scalars().first()
        if not team:
            team = models.Team(
                club_id=clubs[club_name].id, name=team_name, age_group=age_group
            )
            session.add(team)
            await session.flush()
        teams[team_name] = team

    # --- Players (only for Winchester Reds) ---
    players_data = [
        ("Winston", "Striker"),
        ("Tommy", "Keeper"),
        ("Tom", "Midfield"),
        ("Kip", "Defence"),
        ("Leo", "Winger"),
        ("Alex", "Midfield"),
        ("Logan", "Defence"),
    ]
    players = []
    for name, position in players_data:
        result = await session.execute(
            select(models.Player).where(
                models.Player.name == name, models.Player.team_id == teams["Reds"].id
            )
        )
        player = result.scalars().first()
        if not player:
            player = models.Player(team_id=teams["Reds"].id, name=name, position=position)
            session.add(player)
            await session.flush()
        players.append(player)

    await session.commit()

    return {
        "clubs": {name: club.id for name, club in clubs.items()},
        "teams": {name: team.id for name, team in teams.items()},
        "players": [p.name for p in players],
    }
