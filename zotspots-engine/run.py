import asyncio
import os
from supabase import create_client
from dotenv import load_dotenv
from typing import List, Dict
from engine import GameEngine
from config import ROUND_DURATION, NUM_ROUNDS, INTER_ROUND_DELAY, TABLE  

async def fetch_random_locations(n: int = 5) -> List[Dict]:
    """
    Fetch n random locations from Supabase using supabase‑py.
    Returns a list of dicts with id, name, lat, lng, image_file.
    """

    # Supabase doesn’t natively support ORDER BY RANDOM() via its API,
    # so we can fetch all IDs and randomly sample them in Python.

    # 1. Load database credentials and boot up client
    load_dotenv()
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)  

    # 2. Get all IDs
    all_ids_response = supabase.from_(TABLE).select("id").execute()

    if all_ids_response.error:
        raise Exception(all_ids_response.error)

    all_ids = [row["id"] for row in all_ids_response.data]

    # 3. Randomly choose n IDs
    import random
    chosen_ids = random.sample(all_ids, min(n, len(all_ids)))

    # 4. Fetch matching rows
    rows_response = supabase.from_(TABLE) \
        .select("id, name, lat, lng, image_file") \
        .in_("id", chosen_ids) \
        .execute()

    if rows_response.error:
        raise Exception(rows_response.error)

    return rows_response.data

async def wait_for_all_guesses(engine: GameEngine, game_id: str):
    game = await engine.get_game(game_id)
    if not game:
        return

    while len(game.guesses) < len(game.players):
        await asyncio.sleep(0.5)

async def run_game(engine: GameEngine, game_id: str):
    game = await engine.get_game(game_id)
    if not game:
        print(f"Game {game_id} not found")
        return

    # Fetch 5 random locations from Supabase
    game.round_locations = await fetch_random_locations(n=NUM_ROUNDS)

    for idx, location in enumerate(game.round_locations):
        game.current_round_index = idx
        game.actual_location = location
        game.phase = "guessing"
        game.guesses.clear() # resets guesses at the beginning of every round

        print(f"Round {idx+1} started: {location['name']}")

        # Wait for all players to submit guesses or timeout
        round_end = asyncio.create_task(asyncio.sleep(ROUND_DURATION))
        all_guesses_submitted = asyncio.create_task(wait_for_all_guesses(engine, game_id))

        done, pending = await asyncio.wait(
            [round_end, all_guesses_submitted],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending: # If any players didn't guess in time, cancel their guesses
            task.cancel()

        # Compute results
        results = engine.compute_results(game)
        game.phase = "results"
        print(f"Round {idx+1} results: {results}")

        # Check if someone won
        winner = await game.check_win()
        if winner:
            print(f"Game Over! Winner: {winner}")
            break

        # TODO: Broadcast results to frontend via WebSocket

        await asyncio.sleep(INTER_ROUND_DELAY)

    print(f"Game {game_id} finished")