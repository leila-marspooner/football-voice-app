from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db import get_session
from backend import models, schemas

router = APIRouter()

@router.get("/", response_model=list[schemas.ClubOut])
async def list_clubs(session: AsyncSession = Depends(get_session)):
    """Return all clubs"""
    result = await session.execute(select(models.Club))
    return result.scalars().all()
