import asyncio
import pytest
from httpx import AsyncClient

from backend.main import app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.anyio
async def test_seed_and_crud_flow():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Seed
        r = await ac.post("/api/dev/seed")
        assert r.status_code == 200, r.text
        data = r.json()
        team_id = data["team_id"]
        match_id = data["match_id"]

        # Clubs
        rc = await ac.get("/api/clubs")
        assert rc.status_code == 200
        assert len(rc.json()) >= 1

        # Teams
        rt = await ac.get("/api/teams")
        assert rt.status_code == 200
        assert any(t["id"] == team_id for t in rt.json())

        # Players
        rp = await ac.get("/api/players")
        assert rp.status_code == 200
        players = rp.json()
        assert len(players) >= 14
        player_id = players[0]["id"]

        # Create event with our player (valid)
        e_payload = {"minute": 1, "event_type": "shot", "player_id": player_id}
        re = await ac.post(f"/api/matches/{match_id}/events", json=e_payload)
        assert re.status_code == 200, re.text
        assert re.json()["event_type"] == "shot"

        # Create event with invalid player (should fail unless team_context=opponent)
        bad_payload = {"minute": 2, "event_type": "foul", "player_id": 999999}
        reb = await ac.post(f"/api/matches/{match_id}/events", json=bad_payload)
        assert reb.status_code == 400

        # Opponent context with no player OK
        opp_payload = {"minute": 3, "event_type": "corner", "team_context": "opponent"}
        reo = await ac.post(f"/api/matches/{match_id}/events", json=opp_payload)
        assert reo.status_code == 200

        # Match summary reflects events count
        rm = await ac.get(f"/api/matches/{match_id}")
        assert rm.status_code == 200
        assert rm.json()["num_events"] >= 2


