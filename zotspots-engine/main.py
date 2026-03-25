# main.py or endpoints.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from engine import GameEngine
from sockets import manager

app = FastAPI()
engine = GameEngine()

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "join":
                player_id = data["player_id"]
                success = await engine.join_game(game_id, player_id)
                await manager.broadcast(game_id, {
                    "type": "player_joined",
                    "player_id": player_id,
                    "success": success
                })

            elif event_type == "submit_guess":
                player_id = data["player_id"]
                lat = data["lat"]
                lng = data["lng"]
                result = await engine.submit_guess(game_id, player_id, lat, lng)
                # no broadcast needed here; engine.run_game() will broadcast results

    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)
        await manager.broadcast(game_id, {
            "type": "player_left",
            "message": f"A player disconnected"
        })