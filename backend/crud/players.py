# backend/crud/players.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend import models

async def get_team_roster(session: AsyncSession, team_id: int):
    """
    Return a list of player dicts for a given team.
    """
    result = await session.execute(
        select(models.Player.id, models.Player.name, models.Player.position)
        .where(models.Player.team_id == team_id)
    )
    return [
        {"id": row.id, "name": row.name, "position": row.position}
        for row in result.all()
    ]
