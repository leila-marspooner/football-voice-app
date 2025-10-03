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
    Delete all rows from events, matches, players, teams, and clubs tables.
    Then automatically repopulate with demo data.
    """
    from datetime import datetime

    # Delete in the right order for foreign keys (child tables first)
    tables_to_delete = [
        "events",
        "matches", 
        "players",
        "teams",
        "clubs"
    ]
    
    for table in tables_to_delete:
        await session.execute(text(f"DELETE FROM {table};"))
    
    # Commit deletions
    await session.commit()

    # Now repopulate with demo data (same logic as /seed)
    # --- Club ---
    club = models.Club(name="Winchester FC")
    session.add(club)
    await session.flush()  # Get club ID

    # --- Team ---
    team = models.Team(
        club_id=club.id,
        name="U9 Reds",
        age_group="U9"
    )
    session.add(team)
    await session.flush()  # Get team ID

    # --- Players ---
    players_data = [
        ("Winston", "Striker"),
        ("Tommy", "Keeper"),
        ("Logan", "Defence"),
    ]
    players = []
    for name, position in players_data:
        player = models.Player(
            team_id=team.id,
            name=name,
            position=position
        )
        session.add(player)
        await session.flush()  # Get player ID
        players.append(player)

    # --- Match ---
    match = models.Match(
        team_id=team.id,
        opponent_name="Stoneham FC",
        kickoff_at=datetime.fromisoformat("2025-10-04T10:00:00Z"),  # 2025-10-04T10:00:00Z
        competition="League",
        venue="Home Ground"
    )
    session.add(match)
    await session.flush()  # Get match ID

    # Commit all changes before returning
    await session.commit()

    return {
        "status": "ok",
        "match_id": match.id,
        "player_ids": [player.id for player in players]
    }


@router.post("/seed")
async def seed(session: AsyncSession = Depends(get_session)):
    """
    Seed demo data:
    - 1 club (Winchester FC)
    - 1 team (U9 Reds) linked to the club
    - 3 players (Winston, Tommy, Logan) linked to the team
    - 1 match vs Stoneham FC with kickoff date/time, competition = League, venue = Home Ground
    """
    from datetime import datetime

    # --- Club ---
    club = models.Club(name="Winchester FC")
    session.add(club)
    await session.flush()  # Get club ID

    # --- Team ---
    team = models.Team(
        club_id=club.id,
        name="U9 Reds",
        age_group="U9"
    )
    session.add(team)
    await session.flush()  # Get team ID

    # --- Players ---
    players_data = [
        ("Winston", "Striker"),
        ("Tommy", "Keeper"),
        ("Logan", "Defence"),
    ]
    players = []
    for name, position in players_data:
        player = models.Player(
            team_id=team.id,
            name=name,
            position=position
        )
        session.add(player)
        await session.flush()  # Get player ID
        players.append(player)

    # --- Match ---
    match = models.Match(
        team_id=team.id,
        opponent_name="Stoneham FC",
        kickoff_at=datetime.fromisoformat("2025-10-04T10:00:00Z"),  # 2025-10-04T10:00:00Z
        competition="League",
        venue="Home Ground"
    )
    session.add(match)
    await session.flush()  # Get match ID

    # Commit all changes before returning
    await session.commit()

    return {
        "status": "ok",
        "match_id": match.id,
        "player_ids": [player.id for player in players]
    }
