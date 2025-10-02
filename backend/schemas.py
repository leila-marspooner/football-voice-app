from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ClubIn(BaseModel):
    name: str


class ClubOut(BaseModel):
    id: int
    name: str
    created_at: datetime


class TeamIn(BaseModel):
    club_id: int
    name: str
    age_group: Optional[str] = None


class TeamOut(BaseModel):
    id: int
    club_id: int
    name: str
    age_group: Optional[str] = None
    created_at: datetime


class CoachIn(BaseModel):
    team_id: int
    name: str
    role: Optional[str] = None


class CoachOut(BaseModel):
    id: int
    team_id: int
    name: str
    role: Optional[str] = None
    created_at: datetime


class PlayerIn(BaseModel):
    team_id: int
    name: str
    position: Optional[str] = None


class PlayerOut(BaseModel):
    id: int
    team_id: int
    name: str
    position: Optional[str] = None
    created_at: datetime


class MatchIn(BaseModel):
    team_id: int
    opponent_name: str
    kickoff_at: datetime
    competition: Optional[str] = None
    venue: Optional[str] = None


class MatchOut(BaseModel):
    id: int
    team_id: int
    opponent_name: str
    kickoff_at: datetime
    competition: Optional[str] = None
    venue: Optional[str] = None
    created_at: datetime


class LineupIn(BaseModel):
    player_id: int
    position: Optional[str] = None
    is_starter: bool = False


class LineupOut(BaseModel):
    id: int
    match_id: int
    player_id: int
    position: Optional[str] = None
    is_starter: bool
    created_at: datetime


class EventIn(BaseModel):
    minute: int = Field(ge=0)
    event_type: str
    team_context: str = Field(default="us")
    player_id: Optional[int] = None
    raw_text: Optional[str] = None
    meta_json: Optional[dict] = None


class RawTextIn(BaseModel):
    raw_text: str


class EventOut(BaseModel):
    id: int
    match_id: int
    minute: int
    event_type: str
    team_context: str
    player_id: Optional[int] = None
    raw_text: Optional[str] = None
    meta_json: Optional[dict] = None


class MatchSummary(BaseModel):
    id: int
    team_id: int
    opponent_name: str
    kickoff_at: datetime
    num_events: int


class PlayerStats(BaseModel):
    player_id: int
    match_id: Optional[int] = None
    stats: dict
    computed_at: datetime


