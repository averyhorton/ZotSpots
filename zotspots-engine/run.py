import asyncio
import random
from typing import List, Dict
from engine import GameEngine
from config import ROUND_DURATION, NUM_ROUNDS, INTER_ROUND_DELAY, TABLE, SUPABASE
from sockets import manager

async def fetch_random_locations(n: int = 5) -> List[Dict]:
    """
    Fetch n random locations from Supabase using supabase‑py.
    Returns a list of dicts with id, name, lat, lng, image_file.
    """

    # Supabase doesn’t natively support ORDER BY RANDOM() via its API,
    # so we can fetch all IDs and randomly sample them in Python. 

    # 1. Get all IDs
    all_ids_response = SUPABASE.from_(TABLE).select("id").execute()
    all_ids = [row["id"] for row in all_ids_response.data]

    # 2. Randomly choose n IDs
    chosen_ids = random.sample(all_ids, min(n, len(all_ids)))

    # 3. Fetch matching rows
    rows_response = SUPABASE.from_(TABLE) \
        .select("id, name, lat, lng, image_file") \
        .in_("id", chosen_ids) \
        .execute()
    
    return rows_response.data

async def wait_for_all_guesses(engine: GameEngine, game_id: str):
    game = engine.get_game(game_id)
    lock = engine.locks.get(game_id)

    if not game or not lock:
        return

    while True:
        async with lock: # negligible delay compared to timer
            if len(game.guesses) >= len(game.players):
                return
        await asyncio.sleep(0.5)

async def run_game(engine: GameEngine, game_id: str):
    game = engine.get_game(game_id)
    lock = engine.locks.get(game_id)
    if not game or not lock:
        print(f"Game {game_id} not found")
        return


    # Fetch 5 random locations from Supabase
    try:
        round_locations = await fetch_random_locations(n=NUM_ROUNDS)
    except Exception as e:
        print(f"Failed to fetch locations: {e}")
        return
    
    winner = None
    for idx, location in enumerate(round_locations):
        try:
            # Wrap each round in a try block in case we get an error
            await engine.start_round(game_id, location) # cleans up the last round and begins the next

            # Broadcast round start to frontend
            await manager.broadcast(game_id, {
                "type": "round_start",
                "round": idx + 1,
                "image": location["image_file"]
            })

            # Wait for all players to submit guesses or timeout
            round_end = asyncio.create_task(asyncio.sleep(ROUND_DURATION))
            all_guesses_submitted = asyncio.create_task(wait_for_all_guesses(engine, game_id))

            done, pending = await asyncio.wait(
                [round_end, all_guesses_submitted],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending: # If any players didn't guess in time, cancel their guesses
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # Compute results
            async with lock:
                results = engine.compute_results(game)

                # Set game phase to results to prevent double computation in race
                game.phase = "results"

                # Broadcast results of round to frontend
                await manager.broadcast(game_id, {
                    "type": "results",
                    "round": idx + 1,
                    "results": results
                })

            # Check if someone won
            winner = game.check_win()
            if winner != None: 
                break
            await asyncio.sleep(INTER_ROUND_DELAY)
        except Exception as e:
            await manager.broadcast(game_id, {
                    "type": "error",
                    "reason": "critical_failure",
                    "message": f"Exception thrown: {e}"
                })
            break

    # Broadcast results to frontend
    await manager.broadcast(game_id, {
        "type": "game_over",
        "winner": {"id": winner[0], "score": winner[1]["score"]} if winner else None, # could be None for singleplayer or tie
        "final_scores": game.players
    })

    # clean up the lobby and remove from memory
    await engine.kill_lobby(game_id)