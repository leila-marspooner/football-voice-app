# backend/api/matches.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db import get_session
from backend import models
from backend.services.command_parser import parse_with_db

router = APIRouter()

@router.post("/matches/{match_id}/events/raw")
async def create_event_from_raw_text(
    match_id: int,
    raw_text: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Accept raw transcript text (e.g. 'Goal Winston minute 12'),
    parse it into structured event JSON, and save as Event in DB.
    """

    # 1. Get the match to know team_id + opponent
    match = await session.get(models.Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # 2. Parse the raw text into structured event
    parsed = await parse_with_db(
        raw_text,
        session,
        team_id=match.team_id,
        opponents=[match.opponent_name] if match.opponent_name else [],
    )

    if not parsed["event_type"] or parsed["event_type"] == "unknown":
        raise HTTPException(status_code=400, detail=f"Could not parse event: {raw_text}")

    # 3. Map player name to player_id if available
    player_id = parsed.get("player_id")

    # 4. Create and save Event row
    event = models.Event(
        match_id=match_id,
        minute=parsed["minute"],
        event_type=parsed["event_type"],
        player_id=player_id,
        raw_text=raw_text,
        meta_json=parsed,  # keep full parser output for review/edit
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)

    return {
        "id": event.id,
        "match_id": event.match_id,
        "event_type": event.event_type,
        "player_id": event.player_id,
        "minute": event.minute,
        "raw_text": event.raw_text,
        "parsed": parsed,
    }