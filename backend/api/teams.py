from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db import get_session
from backend import models, schemas

router = APIRouter()

@router.get("/{club_id}", response_model=list[schemas.TeamOut])
async def list_teams(club_id: int, session: AsyncSession = Depends(get_session)):
    """Return all teams for a given club"""
    result = await session.execute(
        select(models.Team).where(models.Team.club_id == club_id)
    )
    return result.scalars().all()
