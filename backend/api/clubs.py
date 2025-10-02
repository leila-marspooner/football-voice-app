from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db import get_session
from ..models import Club
from ..schemas import ClubIn, ClubOut


router = APIRouter()


@router.post("/clubs", response_model=ClubOut)
async def create_club(payload: ClubIn, session: AsyncSession = Depends(get_session)):
    club = Club(name=payload.name)
    session.add(club)
    await session.commit()
    await session.refresh(club)
    return ClubOut(**club.__dict__)


@router.get("/clubs", response_model=list[ClubOut])
async def list_clubs(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Club))
    return [ClubOut(**c.__dict__) for c in res.scalars().all()]


