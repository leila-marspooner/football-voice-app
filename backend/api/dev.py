from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Club, Team, Player, Match, Lineup


router = APIRouter()


@router.post("/dev/seed")
async def seed(session: AsyncSession = Depends(get_session)):
    club = Club(name="Sample Club")
    session.add(club)
    await session.flush()

    team = Team(club_id=club.id, name="U10", age_group="U10")
    session.add(team)
    await session.flush()

    players = [Player(team_id=team.id, name=f"Player {i+1}") for i in range(14)]
    session.add_all(players)
    await session.flush()

    match = Match(
        team_id=team.id,
        opponent_name="Opponents",
        kickoff_at=datetime.utcnow() + timedelta(days=1),
        competition="Friendly",
        venue="Home Ground",
    )
    session.add(match)
    await session.flush()

    # No lineup entries yet (empty lineup)

    await session.commit()
    return {"club_id": club.id, "team_id": team.id, "match_id": match.id, "players": [p.id for p in players]}


