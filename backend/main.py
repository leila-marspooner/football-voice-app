# backend/main.py
from fastapi import FastAPI
from backend.api import matches, stats, players, teams, events, clubs, dev, ws, transcribe

app = FastAPI(
    title="Football Voice App API",
    version="0.1.0",
)

# Routers
app.include_router(matches.router, tags=["Matches"])
app.include_router(stats.router, tags=["Stats"])
app.include_router(players.router, tags=["Players"])
app.include_router(teams.router, tags=["Teams"])
app.include_router(events.router, tags=["Events"])
app.include_router(clubs.router, tags=["Clubs"])
app.include_router(dev.router, tags=["Dev"])
app.include_router(ws.router, tags=["WebSockets"])  # only if you want it active
app.include_router(transcribe.router, tags=["Transcription"])
