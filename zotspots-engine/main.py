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
    try:
        await websocket.accept()
    except Exception:
        return # failed to connect
    player_id = None
    game_id = None
    game_task = None
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "create_game":
                mode = data.get("mode", "singleplayer")
                game_id = await engine.create_game(mode)
                game = await engine.get_game(game_id)
                connected = await manager.connect(game_id, websocket)
                if not connected:
                    await engine.kill_lobby(game_id)
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_connection",
                        "message": "Creation of game lobby failed."
                    })
                    continue
                game.mode = mode
                player_id = data.get("player_id")
                joined = await engine.join_game(game_id, player_id, websocket)
                if not joined:
                    continue

                await manager.send_personal_message(websocket, {
                    "type": "game_created",
                    "game_id": game_id,
                    "isSingleplayer": mode == "singleplayer",
                    "code": game.get_code()
                })
            elif msg_type == "join_game":
                code = data.get("code")
                player_id = data.get("player_id")
                game_id = await engine.find_game(code)
                if not game_id:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_code",
                        "message": "Lobby join failed."
                    })
                    continue

                joined = await manager.connect(game_id, websocket)
                print(f"connections after join: {manager.connections}")
                if not joined:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_connection",
                        "message": "Failed to connect."
                    })
                    continue
                
                joined_lobby = await engine.join_game(game_id, player_id, websocket)
                print(f"join_game: code={code}, game_id={game_id}, player_id={player_id}")
                if not joined_lobby:
                    continue

                print(f"broadcasting lobby_updated to game_id={game_id}")
                await manager.send_personal_message(websocket, {
                    "type": "game_joined",
                    "code": game.get_code(),
                    "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                })
                await manager.broadcast(game_id, {
                        "type": "lobby_updated",
                        "event": "player_joined",
                        "player_id": player_id
                    })
            elif msg_type == "player_update":
                player_id = data.get("player_id")
                name = data.get("name", "")
                game = await engine.get_game(game_id)
                if game and player_id in game.players:
                    game.players[player_id]["name"] = name # adds player name to their dict, which also holds their score
                    await manager.broadcast(game_id, {
                        "type": "lobby_updated",
                        "event": "player_updated",
                        "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                    })
            elif msg_type == "start_game":
                game = await engine.get_game(game_id)
                if game_id and game.phase == "waiting":
                    game_task = asyncio.create_task(run_game_task(game_id))
                else:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "no_game",
                        "message": "You must create or join a game before starting."
                    })
            elif msg_type == "guess":
                if not game_id or not player_id:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "no_game",
                        "message": "You must create or join a game before guessing."
                    })
                    continue
                lat = data.get("lat")
                lng = data.get("lng")
                if not lat or not lng: # lat/lng will never legitimately be 0 in our geography, so falsy check is intentional
                    # if we are not passed coordinates, invalidate the guess
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "invalid_guess",
                        "message": "A valid lat/lng must be provided."
                    })
                    continue
                results = await engine.submit_guess(game_id, player_id, lat, lng)
            elif msg_type == "disconnect":
                if game_task:
                    game_task.cancel()
                    try:
                        await game_task
                    except Exception:
                        raise
                    finally:
                        game = await engine.get_game(game_id)
                        if game:
                            await manager.broadcast(game_id, {
                                "type": "game_over",
                                "final_scores": game.players if game else None
                            })
                            await engine.kill_lobby(game_id)
                manager.disconnect(game_id, websocket)
                break
    except WebSocketDisconnect:
        # Handle unexpected disconnects
        if game_task:
            game_task.cancel()
            try:
                await game_task
            except Exception:
                print("Exception caught during socket main loop, exiting...")
            finally:
                game = await engine.get_game(game_id)
                if game:
                    await manager.broadcast(game_id, {
                        "type": "game_over",
                        "final_scores": game.players if game else None
                    })
                    await engine.kill_lobby(game_id)
        manager.disconnect(game_id, websocket)

# Background wrapper to run engine game loop
async def run_game_task(game_id: str):
    try:
        await run_game(engine, game_id)
    except asyncio.CancelledError:
        # If cancelled, let the calling websocket handler handle cleanup
        raise
