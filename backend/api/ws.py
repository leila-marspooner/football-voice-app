from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..ws_manager import ws_manager


router = APIRouter()


@router.websocket("/ws/match/{match_id}")
async def websocket_endpoint(websocket: WebSocket, match_id: int):
    await ws_manager.connect(match_id, websocket)
    try:
        while True:
            # Keep connection alive; we don't expect messages from client in MVP
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(match_id, websocket)


