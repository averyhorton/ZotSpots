# main.py
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from engine import GameEngine
from sockets import manager
from run import run_game
from config import DEBUG

app = FastAPI()
engine = GameEngine()

# Allow CORS for frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://petrguessr-ucirvine.web.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await websocket.accept()
    except Exception:
        return # failed to connect
    player_id = None # Active Player ID for the websocket
    game_id = None # Active Game ID for the websocket
    game_task = None # Active task for the game
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "create_game":
                if DEBUG:
                    print(f"DEBUG:  Creating game...")
                mode = data.get("mode", "singleplayer")
                game_id = await engine.create_game(mode)
                game = engine.get_game(game_id)
                connected = await manager.connect(game_id, websocket)
                if not connected:
                    if DEBUG:
                        print(f"ERROR:  Failed to connect to newly created game.")
                    await engine.kill_lobby(game_id)
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_connection",
                        "message": "Creation of game lobby failed."
                    })
                    continue
                game.mode = mode
                player_id = data.get("playerId")
                joined = await engine.join_game(game_id, player_id, websocket)
                if not joined:
                    if DEBUG:
                        print(f"ERROR:  Failed to join newly created game.")
                    continue
                
                if DEBUG:
                    print(f"DEBUG:  Game created successfully!")
                await manager.send_personal_message(websocket, {
                    "type": "game_created",
                    "game_id": game_id,
                    "isSingleplayer": mode == "singleplayer",
                    "code": game.get_code()
                })
            elif msg_type == "join_game":
                if DEBUG:
                    print(f"DEBUG:  Attempting to join game...")
                code = data.get("code")
                player_id = data.get("playerId")
                game_id = engine.find_game(code)
                if not game_id:
                    if DEBUG:
                        print(f"ERROR:  Invalid game code provided.")
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_code",
                        "message": "Lobby join failed."
                    })
                    continue

                joined = await manager.connect(game_id, websocket)
                game = engine.get_game(game_id)
                print(f"connections after join: {manager.connections}")
                if not joined:
                    if DEBUG:
                        print(f"ERROR:  Connection dropped while attempting to connect.")
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "bad_connection",
                        "message": "Failed to connect."
                    })
                    continue
                
                joined_lobby = await engine.join_game(game_id, player_id, websocket)
                print(f"join_game: code={code}, game_id={game_id}, player_id={player_id}")
                if not joined_lobby:
                    # Error messaging is handled in join_game
                    continue

                if DEBUG:
                    print(f"DEBUG:  Successfully joined game!")
                await manager.send_personal_message(websocket, {
                    "type": "game_joined",
                    "code": game.get_code(),
                    "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                })
                await manager.broadcast(game_id, {
                        "type": "lobby_updated",
                        "event": "player_joined",
                        "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                    })
            elif msg_type == "player_update":
                temp_player_id = data.get("playerId")
                if DEBUG:
                    print(f"DEBUG:  Updating player {temp_player_id}...")
                name = data.get("name", "")
                game = engine.get_game(game_id)
                if game and player_id in game.players:
                    game.players[temp_player_id]["name"] = name # adds player name to their dict, which also holds their score
                    if DEBUG:
                        print(f"DEBUG:  Updating player {temp_player_id} completed successfully!")
                    await manager.broadcast(game_id, {
                        "type": "lobby_updated",
                        "event": "player_updated",
                        "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                    })
                    continue
                if DEBUG:
                    print(f"ERROR:  Player {temp_player_id} does not exist, and cannot be updated.")
            elif msg_type == "start_game":
                if DEBUG:
                    print(f"DEBUG:  Starting game {game_id}...")
                await manager.broadcast(game_id, {
                    "type": "start",
                    "gameId": game_id
                })
                game = engine.get_game(game_id)
                if game_id and game.phase == "waiting":
                    game_task = asyncio.create_task(run_game_task(game_id))
                else:
                    if DEBUG:
                        print(f"ERROR: Game {game_id} cannot be started.")
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "no_game",
                        "message": "You must create or join a game before starting."
                    })
            elif msg_type == "guess":
                if DEBUG:
                    print(f"DEBUG:  Player {player_id} submitting guess...")
                if not game_id or not player_id:
                    if DEBUG:
                        print(f"ERROR:  Player {player_id} submitted guess without being in a game.")
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
                    if DEBUG:
                        print(f"ERROR:  Player {player_id} submitted empty guess.")
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "reason": "invalid_guess",
                        "message": "A valid lat/lng must be provided."
                    })
                    continue
                results = await engine.submit_guess(game_id, player_id, lat, lng)
                if DEBUG:
                    print(f"DEBUG:  Player {player_id} submitted guess successfully!")
            elif msg_type == "disconnect":
                if DEBUG:
                    print(f"DEBUG:  Player {player_id} is disconnecting...")
                if game.phase == "waiting":
                    if DEBUG:
                        print(f"DEBUG:  Player {player_id} is in lobby, leaving gracefully...")
                    # If we are in the lobby, allow quits and rejoins
                    del game.players[player_id]
                    if not game.players:
                        await engine.kill_lobby(game_id)
                        continue
                    await manager.broadcast(game_id, {
                        "type": "lobby_updated",
                        "event": "player_updated",
                        "players": [{"id": pid, "name": game.players[pid].get("name", "")} for pid in game.players]
                    })
                    manager.disconnect(game_id, websocket)
                    if DEBUG:
                        print(f"DEBUG:  Player {player_id} left lobby.")
                    continue
                if game_task:
                    if DEBUG:
                        print(f"DEBUG:  Player {player_id} is in active game, killing lobby...")
                    # if we are in main game execution, leaving should kill the lobby
                    game_task.cancel()
                    try:
                        await game_task
                    except Exception:
                        raise
                    finally:
                        if DEBUG:
                            print(f"DEBUG:  Ending game...")
                        game = engine.get_game(game_id)
                        if game:
                            await manager.broadcast(game_id, {
                                "type": "game_over",
                                "final_scores": game.players if game else None
                            })
                            await engine.kill_lobby(game_id)
                manager.disconnect(game_id, websocket)
                if DEBUG:
                    print(f"DEBUG:  Game ended and cleaned up successfully.")
                break
    except WebSocketDisconnect:
        # Handle unexpected disconnects
        if game_task:
            game_task.cancel()
            try:
                await game_task
            except Exception:
                if DEBUG:
                    print("ERROR:   Exception caught during socket main loop, exiting...")
            finally:
                game = engine.get_game(game_id)
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
        if DEBUG:
            print(f"DEBUG:  Running main game task...")
        await run_game(engine, game_id)
    except asyncio.CancelledError:
        # If cancelled, let the calling websocket handler handle cleanup
        if DEBUG:
            print("ERROR:   Game cancelled during execution.")
