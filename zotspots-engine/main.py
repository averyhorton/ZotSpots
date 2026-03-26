# main.py
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from engine import GameEngine
from sockets import manager
from run import run_game

app = FastAPI()
engine = GameEngine()

# Allow CORS for frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: REPLACE ME WITH FIREBASE DOMAIN
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    player_id = None
    game_id = None
    game_task = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "create_game":
                mode = data.get("mode", "singleplayer")
                game_id = await engine.create_game()
                game = await engine.get_game(game_id)
                game.mode = mode
                player_id = data.get("player_id")
                await engine.join_game(game_id, player_id)
                await manager.send_personal_message(websocket, {
                    "type": "game_created",
                    "game_id": game_id
                })

                # Start the game loop in background
                game_task = asyncio.create_task(run_game_task(game_id))

            elif msg_type == "join_game":
                game_id = data.get("game_id")
                player_id = data.get("player_id")
                joined = await engine.join_game(game_id, player_id)
                await manager.send_personal_message(websocket, {
                    "type": "join_result",
                    "success": joined
                })
                if joined:
                    await manager.broadcast(game_id, {
                        "type": "player_joined",
                        "player_id": player_id
                    })

            elif msg_type == "guess":
                if not game_id or not player_id:
                    continue
                lat = data.get("lat")
                lng = data.get("lng")
                results = await engine.submit_guess(game_id, player_id, lat, lng)
                # The engine already broadcasts results, no need to send again here
                pass

            elif msg_type == "disconnect":
                if game_task:
                    game_task.cancel()
                    try:
                        await game_task
                    except asyncio.CancelledError:
                        await manager.broadcast(game_id, {
                            "type": "game_cancelled",
                            "reason": "player_left",
                            "final_scores": (await engine.get_game(game_id)).players if await engine.get_game(game_id) else None
                        })
                        await engine.remove_player(game_id, player_id)
                break

    except WebSocketDisconnect:
        # Handle unexpected disconnects
        if game_task:
            game_task.cancel()
            try:
                await game_task
            except asyncio.CancelledError:
                await manager.broadcast(game_id, {
                    "type": "game_cancelled",
                    "reason": "player_left",
                    "final_scores": (await engine.get_game(game_id)).players if await engine.get_game(game_id) else None
                })
                await engine.kill_lobby(game_id, player_id)
        await manager.disconnect(websocket)


# Background wrapper to run engine game loop
async def run_game_task(game_id: str):
    try:
        await run_game(engine, game_id)
    except asyncio.CancelledError:
        # If cancelled, let the calling websocket handler handle cleanup
        raise
