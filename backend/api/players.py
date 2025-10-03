from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db import get_session
from backend import models, schemas

router = APIRouter()

@router.get("/{team_id}", response_model=list[schemas.PlayerOut])
async def list_players(team_id: int, session: AsyncSession = Depends(get_session)):
    """Return all players for a given team"""
    result = await session.execute(
        select(models.Player).where(models.Player.team_id == team_id)
    )
    return result.scalars().all()
