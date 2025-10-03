from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..db import get_session
from ..models import Player, Event
from ..schemas import PlayerStatsOut

router = APIRouter(tags=["Stats"])


@router.get("/players/{player_id}/stats", response_model=PlayerStatsOut)
async def get_player_stats(player_id: int, session: AsyncSession = Depends(get_session)):
    # validate player
    player = await session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # aggregate events for this player
    result = await session.execute(
        select(Event.event_type, func.count())
        .where(Event.player_id == player_id)
        .group_by(Event.event_type)
    )

    rows = result.all()
    stats = {event_type: count for event_type, count in rows}

    return PlayerStatsOut(
        player_id=player.id,
        player_name=player.name,
        team_id=player.team_id,
        stats=stats,
    )
