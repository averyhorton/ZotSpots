from dataclasses import dataclass, field
import asyncio
import uuid
from typing import Dict, Optional
from game import Game
from config import MAX_POINTS, BASIC_PENALTY, MAX_CAMPUS_DISTANCE

"""
** Game Engine Class **
    This class holds all of the games being played/hosted on ZotSpot. It handles all logic associated with the games
"""
@dataclass
class GameEngine:
    games: Dict[str, Game] = field(default_factory=dict)
    locks: Dict[str, asyncio.Lock] = field(default_factory=dict)

    async def create_game(self) -> str:
        game_id = str(uuid.uuid4())

        game = Game(id=game_id)

        self.games[game_id] = game
        self.locks[game_id] = asyncio.Lock()

        return game_id

    async def get_game(self, game_id: str) -> Optional[Game]:
        return self.games.get(game_id)

    async def join_game(self, game_id: str, player_id: str) -> bool:
        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            return False

        async with lock:
            if player_id in game.players:
                return True

            game.players[player_id] = {
                "score": MAX_POINTS
            }

            return True

    async def start_round(self, game_id: str, actual_location: dict):
        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            return

        async with lock:
            game.phase = "guessing"
            game.actual_location = actual_location
            game.guesses = {}
            game.round_number += 1

    async def submit_guess(self, game_id: str, player_id: str, lat: float, lng: float) -> Optional[dict]:

        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            return None

        async with lock:
            if game.phase != "guessing":
                return None

            if player_id not in game.guesses: # Only accept a guess if the player has not already guessed this round
                game.guesses[player_id] = {
                    "lat": lat,
                    "lng": lng
                }
            else: 
                return None

            if len(game.guesses) == len(game.players):
                results = self.compute_results(game)
                game.phase = "results"
                return results

            return None

    def compute_results(self, game: Game) -> dict:
        results = {
            "actual_location": game.actual_location,
            "players": {}
        }

        for player_id in game.players:
            # If a player didn't guess, penalize them
            if player_id not in game.guesses:
                game.players[player_id]["score"] -= score
                results["players"][player_id] = {
                    "guess": None,
                    "distance": -1,
                    "score": BASIC_PENALTY
                }
                continue
            
            # Otherwise, get their guess and score it
            guess = game.guesses[player_id] 
            distance = self._haversine(
                guess["lat"],
                guess["lng"],
                game.actual_location["lat"],
                game.actual_location["lng"]
            )

            score = self._score_from_distance(distance)

            game.players[player_id]["score"] -= score

            results["players"][player_id] = {
                "guess": guess,
                "distance": distance,
                "score": score
            }

        return results

    def _haversine(self, lat1, lon1, lat2, lon2):
        # Use haversine distance as a basis for scoring, referenced below in _score_from_distance
        import math

        R = 6371e3
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = (
            math.sin(dphi / 2) ** 2 +
            math.cos(phi1) * math.cos(phi2) *
            math.sin(dlambda / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _score_from_distance(self, distance: float) -> int:
        scaled = distance / MAX_CAMPUS_DISTANCE # scale distance down for more accurate points deductions
        scaled = min(scaled, 1)

        penalty = int(MAX_POINTS * (scaled**3))
        return penalty # to be subtracted from their score