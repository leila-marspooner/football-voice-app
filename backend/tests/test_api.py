import asyncio
import os
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.main import app
from backend.db import async_engine, AsyncSessionLocal
from backend.models import Base, Team, Match


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True, scope="session")
async def setup_db():
    # Use the configured DB (assumed test DB). Create tables then drop after.
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture()
async def session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture()
async def sample_match(session: AsyncSession):
    home = Team(name="Home FC")
    away = Team(name="Away FC")
    session.add_all([home, away])
    await session.flush()
    match = Match(home_team_id=home.id, away_team_id=away.id)
    session.add(match)
    await session.commit()
    await session.refresh(match)
    return match


@pytest.mark.anyio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.anyio
async def test_create_event_and_get_match(sample_match: Match):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"minute": 5, "event_type": "goal", "player_id": None}
        r = await ac.post(f"/api/matches/{sample_match.id}/events", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["event_type"] == "goal"

        r2 = await ac.get(f"/api/matches/{sample_match.id}")
        assert r2.status_code == 200
        assert r2.json()["num_events"] >= 1


