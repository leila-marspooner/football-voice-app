from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..db import get_session
from ..models import Event, Match, Player
from ..schemas import EventIn, EventOut

router = APIRouter()


@router.post("/", response_model=EventOut)
async def create_event(event: EventIn, session: AsyncSession = Depends(get_session)):
    # validate match
    match = await session.get(Match, event.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # validate player if given
    if event.player_id is not None:
        player = await session.get(Player, event.player_id)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        if player.team_id != match.team_id:
            raise HTTPException(
                status_code=400,
                detail="Player must belong to the match team"
            )

    db_event = Event(
        match_id=event.match_id,
        player_id=event.player_id,
        minute=event.minute,
        event_type=event.event_type,
        raw_text=event.raw_text,
        meta_json=event.meta_json,
    )
    session.add(db_event)
    await session.commit()
    await session.refresh(db_event)
    return EventOut(**db_event.__dict__)


@router.get("/match/{match_id}", response_model=list[EventOut])
async def list_events_for_match(match_id: int, session: AsyncSession = Depends(get_session)):
    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    result = await session.execute(
        select(Event).where(Event.match_id == match_id).order_by(Event.minute)
    )
    return [EventOut(**e.__dict__) for e in result.scalars().all()]
