from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db import get_session
from ..models import Team
from ..schemas import TeamIn, TeamOut


router = APIRouter()


@router.post("/teams", response_model=TeamOut)
async def create_team(payload: TeamIn, session: AsyncSession = Depends(get_session)):
    team = Team(club_id=payload.club_id, name=payload.name, age_group=payload.age_group)
    session.add(team)
    await session.commit()
    await session.refresh(team)
    return TeamOut(**team.__dict__)


@router.get("/teams", response_model=list[TeamOut])
async def list_teams(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Team))
    return [TeamOut(**t.__dict__) for t in res.scalars().all()]


