from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db import get_session
from ..models import Player
from ..schemas import PlayerIn, PlayerOut


router = APIRouter()


@router.post("/players", response_model=PlayerOut)
async def create_player(payload: PlayerIn, session: AsyncSession = Depends(get_session)):
    player = Player(team_id=payload.team_id, name=payload.name, position=payload.position)
    session.add(player)
    await session.commit()
    await session.refresh(player)
    return PlayerOut(**player.__dict__)


@router.get("/players", response_model=list[PlayerOut])
async def list_players(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Player))
    return [PlayerOut(**p.__dict__) for p in res.scalars().all()]


