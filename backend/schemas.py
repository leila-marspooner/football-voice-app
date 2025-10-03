from datetime import datetime
from typing import Optional, List, Dict   # <-- add Dict here
from pydantic import BaseModel, Field


# ----------- CLUBS -----------
class ClubIn(BaseModel):
    name: str


class ClubOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        orm_mode = True


# ----------- TEAMS -----------
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

    class Config:
        orm_mode = True


# ----------- COACHES -----------
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

    class Config:
        orm_mode = True


# ----------- PLAYERS -----------
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

    class Config:
        orm_mode = True


# ----------- MATCHES -----------
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

    class Config:
        orm_mode = True


# ----------- LINEUPS -----------
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

    class Config:
        orm_mode = True


# ----------- EVENTS -----------
class EventIn(BaseModel):
    match_id: int                     # <-- add this
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

    class Config:
        orm_mode = True


# ----------- SUMMARIES & STATS -----------
class MatchSummary(BaseModel):
    id: int
    team_id: int
    opponent_name: str
    kickoff_at: datetime
    num_events: int

    class Config:
        orm_mode = True


class PlayerStats(BaseModel):
    player_id: int
    match_id: Optional[int] = None
    stats: dict
    computed_at: datetime

    class Config:
        orm_mode = True

class PlayerStatsOut(BaseModel):
    player_id: int
    player_name: str
    team_id: int
    stats: Dict[str, int]
