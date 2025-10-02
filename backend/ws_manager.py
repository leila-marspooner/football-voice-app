from typing import Dict, Set
from fastapi import WebSocket


class MatchWebSocketManager:
    def __init__(self) -> None:
        self.match_id_to_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, match_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.match_id_to_connections.setdefault(match_id, set()).add(websocket)

    def disconnect(self, match_id: int, websocket: WebSocket) -> None:
        connections = self.match_id_to_connections.get(match_id)
        if connections and websocket in connections:
            connections.remove(websocket)
            if not connections:
                self.match_id_to_connections.pop(match_id, None)

    async def broadcast_event(self, match_id: int, message: dict) -> None:
        connections = list(self.match_id_to_connections.get(match_id, set()))
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                # Best-effort: drop failed connections
                self.disconnect(match_id, ws)


ws_manager = MatchWebSocketManager()


