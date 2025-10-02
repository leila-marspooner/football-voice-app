from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Player, StatsCache
from ..schemas import PlayerStats


router = APIRouter()


@router.get("/players/{player_id}/stats", response_model=PlayerStats)
async def get_player_stats(
    player_id: int,
    match_id: int | None = None,
    session: AsyncSession = Depends(get_session),
):
    player = await session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Try cache first
    stmt = select(StatsCache).where(StatsCache.player_id == player_id)
    if match_id is not None:
        stmt = stmt.where(StatsCache.match_id == match_id)
    result = await session.execute(stmt)
    cached = result.scalars().first()
    if cached:
        return PlayerStats(
            player_id=player_id,
            match_id=match_id,
            stats=cached.stat_json,
            computed_at=cached.computed_at,
        )

    # Minimal placeholder stats; in a real system compute from events
    stats_data = {"goals": 0, "assists": 0}

    cache = StatsCache(
        player_id=player_id,
        match_id=match_id,
        stat_json=stats_data,
        computed_at=datetime.utcnow(),
    )
    session.add(cache)
    await session.commit()

    return PlayerStats(
        player_id=player_id,
        match_id=match_id,
        stats=stats_data,
        computed_at=cache.computed_at,
    )


