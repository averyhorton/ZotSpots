from dataclasses import dataclass, field
import asyncio
import uuid
import math
from typing import Dict, Optional
from game import Game
from config import MAX_POINTS, BASIC_PENALTY, MAX_CAMPUS_DISTANCE
from sockets import manager
import secrets
import string

"""
** Game Engine Class **
    This class holds all of the games being played/hosted on ZotSpot. It handles all logic associated with the games
"""
@dataclass
class GameEngine:
    games: Dict[str, Game] = field(default_factory=dict)
    code_game_mapping: Dict[str, str] = field(default_factory=dict)
    locks: Dict[str, asyncio.Lock] = field(default_factory=dict)

    async def create_game(self, mode: str) -> str:
        game_id = str(uuid.uuid4())

        code = None
        if mode == "multiplayer":
            while True: # create unique code
                code = self.encode()
                if code not in self.code_game_mapping:
                    break
        game = Game(id=game_id, code=code, mode=mode)

        self.games[game_id] = game
        self.code_game_mapping[code] = game_id
        self.locks[game_id] = asyncio.Lock()

        return game_id

    async def get_game(self, game_id: str) -> Optional[Game]:
        return self.games.get(game_id, None)

    async def find_game(self, code: str) -> str:
        # Utilized when joining a game
        return self.get_game(self.code_game_mapping.get(code, None))

    async def join_game(self, game_id: str, player_id: str) -> bool:
        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            return False

        async with lock:
            if game.phase != "waiting":
                return False
            
            if len(game.players) >= 2: # currently, we cap games at 2 players
                return False
        
            if player_id in game.players:
                return True

            game.players[player_id] = {
                "score": MAX_POINTS
            }

            return True

    async def kill_lobby(self, game_id: str):
        # since removing a player kills a lobby, just kill the lobby
        game = self.games.get(game_id)
        code = game.get_code()
        lock = self.locks.get(game_id)
        if not game or not lock:
            return None  # nothing to do

        async with lock:
            # delete game and lock from memory
            del self.games[game_id]
            del self.code_game_mapping[code]
        del self.locks[game_id]

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

    async def submit_guess(self, game_id: str, player_id: str, lat: float, lng: float):
        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            return

        async with lock:
            if game.phase != "guessing":
                return

            if player_id not in game.guesses: # Only accept a guess if the player has not already guessed this round
                game.guesses[player_id] = {
                    "lat": lat,
                    "lng": lng
                }

    def compute_results(self, game: Game) -> dict:
        if game.phase == "results":
            raise Exception("compute_results called multiple times in same round")
        results = {
            "actual_location": game.actual_location,
            "players": {}
        }

        for player_id in game.players:
            # If a player didn't guess, penalize them
            if player_id not in game.guesses:
                game.players[player_id]["score"] -= BASIC_PENALTY
                results["players"][player_id] = {
                    "guess": None,
                    "distance": -1,
                    "score": game.players[player_id]["score"]
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

            penalty = self._score_from_distance(distance)

            game.players[player_id]["score"] -= penalty

            results["players"][player_id] = {
                "guess": guess,
                "distance": distance,
                "score": game.players[player_id]["score"]
            }

        return results

    def _haversine(self, lat1, lng1, lat2, lng2):
        # Use haversine distance as a basis for scoring, referenced below in _score_from_distance
        R = 6371e3
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)

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

    def encode(self, length=6) -> str:
        # Creates a joinable code for a game
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))