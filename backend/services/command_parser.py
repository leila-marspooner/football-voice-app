# backend/services/command_parser.py
from typing import List, Dict, Optional
import re
from rapidfuzz import process, fuzz
from backend.crud.players import get_team_roster

# Intent keywords (expandable)
INTENT_KEYWORDS = {
    "goal": ["goal", "scored", "scores"],
    "save": ["save", "saved"],
    "tackle": ["tackle", "tackled"],
    "pass": ["pass", "passed", "completion"],
    "shot": ["shot", "shoots", "miss", "on target"],
    "sub": ["sub", "substitute", "in", "out"],
    "corner": ["corner"],
    "foul": ["foul"],
    "assist": ["assist"],
}

# Lowercase stopwords that should not be mistaken as player names
_STOPWORDS = {
    "goal", "save", "tackle", "pass", "shot", "sub", "corner", "foul", "assist",
    "minute", "min", "mins", "vs", "v", "out", "in",
    "the", "a", "an", "and", "then", "from", "to", "for", "at", "on", "off",
    "it", "of", "well", "done", "great"
}


def detect_intent(text: str) -> str:
    """Look for keywords in text and return the event type (e.g. goal, pass)."""
    text_l = text.lower()
    for intent, words in INTENT_KEYWORDS.items():
        if any(w in text_l for w in words):
            return intent
    return "unknown"


def extract_minute(text: str) -> Optional[int]:
    """Find a minute number like 'minute 12' or '12 mins' in the text."""
    m = re.search(r'\b(minute|min|’|\'|)\s*(\d{1,2})\b', text)
    if m:
        return int(m.group(2))
    m2 = re.search(r'\b(\d{1,2})(\'|\s*mins?)\b', text)
    if m2:
        return int(m2.group(1))
    return None


def resolve_name(candidate: str, roster: List[str]) -> Optional[str]:
    """Fuzzy-match a candidate token against roster names."""
    if not candidate or not roster:
        return None
    result = process.extractOne(candidate, roster, scorer=fuzz.token_sort_ratio)
    if result:
        # rapidfuzz returns (match, score, index)
        match, score, *_ = result
        if score >= 75:
            return match
    return None


def _capitalized_tokens(text: str) -> List[str]:
    """
    Return single capitalized words (Tommy, Winston, Logan),
    excluding known stopwords.
    """
    tokens = re.findall(r"\b[A-Z][a-z]+\b", text)
    return [t for t in tokens if t.lower() not in _STOPWORDS]


def parse_transcript(text: str, roster: List[str], opponents: List[str] = []) -> Dict:
    """Turn raw text into a structured event JSON."""
    intent = detect_intent(text)
    minute = extract_minute(text)

    # Candidate player tokens: single capitalized words not in stopwords
    tokens = _capitalized_tokens(text)

    player_raw: Optional[str] = None
    player: Optional[str] = None
    for tok in tokens:
        resolved = resolve_name(tok, roster)
        if resolved:
            player_raw = tok
            player = resolved
            break

    opponent = None
    vs_match = re.search(r'vs\s+([A-Za-z][A-Za-z\s]+)', text, re.I)
    if vs_match:
        opponent_raw = vs_match.group(1).strip()
        maybe = resolve_name(opponent_raw, opponents) if opponents else None
        opponent = maybe or opponent_raw

    return {
        "event_type": intent,
        "player": player,
        "player_raw": player_raw,
        "minute": minute,
        "opponent": opponent,
        "raw_text": text,
    }


async def parse_with_db(text: str, session, team_id: int, opponents: List[str] = []):
    """Fetch roster from DB, parse transcript, and enrich with player_id + position."""
    roster = await get_team_roster(session, team_id)  # [{"id","name","position"}, ...]
    names = [p["name"] for p in roster]
    parsed = parse_transcript(text, names, opponents)

    # Add player_id + position if matched
    if parsed["player"]:
        for p in roster:
            if p["name"] == parsed["player"]:
                parsed["player_id"] = p["id"]
                parsed["position"] = p["position"]
                break

    return parsed
