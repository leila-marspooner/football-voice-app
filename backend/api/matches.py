from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Event, Match, RawEvent, Player, Lineup
from ..schemas import EventIn, EventOut, MatchSummary, RawTextIn, MatchIn, MatchOut, LineupIn, LineupOut
from ..ws_manager import ws_manager


router = APIRouter()


@router.post("/matches", response_model=MatchOut)
async def create_match(match: MatchIn, session: AsyncSession = Depends(get_session)):
    new_match = Match(
        team_id=match.team_id,
        opponent_name=match.opponent_name,
        kickoff_at=match.kickoff_at,
        competition=match.competition,
        venue=match.venue,
    )
    session.add(new_match)
    await session.commit()
    await session.refresh(new_match)
    return MatchOut(**new_match.__dict__)


@router.get("/matches/{match_id}", response_model=MatchSummary)
async def get_match(match_id: int, session: AsyncSession = Depends(get_session)):
    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    num_events_result = await session.execute(
        select(func.count()).select_from(Event).where(Event.match_id == match_id)
    )
    num_events = int(num_events_result.scalar() or 0)

    return MatchSummary(
        id=match.id,
        team_id=match.team_id,
        opponent_name=match.opponent_name,
        kickoff_at=match.kickoff_at,
        num_events=num_events,
    )


@router.post("/matches/{match_id}/lineups", response_model=LineupOut)
async def add_lineup(
    match_id: int,
    item: LineupIn,
    session: AsyncSession = Depends(get_session),
):
    # ensure player belongs to the team of this match
    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    player = await session.get(Player, item.player_id)
    if not player or player.team_id != match.team_id:
        raise HTTPException(status_code=400, detail="Player must belong to match team")

    lineup = Lineup(
        match_id=match_id,
        player_id=item.player_id,
        position=item.position,
        is_starter=item.is_starter,
    )
    session.add(lineup)
    await session.commit()
    await session.refresh(lineup)
    return LineupOut(**lineup.__dict__)


@router.post("/matches/{match_id}/events", response_model=EventOut)
async def create_event(
    match_id: int,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    # Accept either structured event or raw_text input
    event_payload: Optional[EventIn] = None
    raw_payload: Optional[RawTextIn] = None

    if "raw_text" in payload and isinstance(payload.get("raw_text"), str):
        raw_payload = RawTextIn(**payload)
        raw_event_data: dict[str, Any] = {"raw_text": raw_payload.raw_text}
    else:
        try:
            event_payload = EventIn(**payload)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid event payload") from exc
        raw_event_data = {
            "minute": event_payload.minute,
            "event_type": event_payload.event_type,
            "team_context": event_payload.team_context,
            "player_id": event_payload.player_id,
            "raw_text": event_payload.raw_text,
            "meta_json": event_payload.meta_json,
        }

    # Always store RawEvent
    raw_event = RawEvent(match_id=match_id, payload_json=raw_event_data)
    session.add(raw_event)

    # Optionally store structured Event if provided
    if event_payload is not None:
        # Validate player if provided
        if event_payload.player_id is not None:
            player = await session.get(Player, event_payload.player_id)
            if not player:
                raise HTTPException(status_code=400, detail="player_id not found")
            match = await session.get(Match, match_id)
            if not match:
                raise HTTPException(status_code=404, detail="Match not found")
            if event_payload.team_context != "opponent" and player.team_id != match.team_id:
                raise HTTPException(status_code=400, detail="player must belong to match team or set team_context=opponent")
        event = Event(
            match_id=match_id,
            minute=event_payload.minute,
            event_type=event_payload.event_type,
            team_context=event_payload.team_context,
            player_id=event_payload.player_id,
            raw_text=event_payload.raw_text,
            meta_json=event_payload.meta_json,
        )
        session.add(event)
    else:
        # For raw_text only, create a minimal Event with event_type "raw_text"
        event = Event(
            match_id=match_id,
            minute=0,
            event_type="raw_text",
            team_context="us",
            player_id=None,
            raw_text=raw_event_data["raw_text"],
            meta_json=None,
        )
        session.add(event)

    await session.commit()
    await session.refresh(event)

    event_out = EventOut(
        id=event.id,
        match_id=event.match_id,
        minute=event.minute,
        event_type=event.event_type,
        player_id=event.player_id,
        raw_text=event.raw_text,
        meta_json=event.meta_json,
    )

    # Broadcast to subscribers
    await ws_manager.broadcast_event(match_id, event_out.model_dump())

    return event_out


@router.get("/matches", response_model=list[MatchOut])
async def list_matches(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Match))
    return [MatchOut(**m.__dict__) for m in res.scalars().all()]


