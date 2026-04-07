from dataclasses import dataclass, field
import asyncio
import uuid
import math
from typing import Dict, Optional
from game import Game
from config import STARTING_SCORE, MAX_CAMPUS_DISTANCE, PERFECT_GUESS_THRESHOLD, DEBUG
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

    def get_game(self, game_id: str) -> Optional[Game]:
        return self.games.get(game_id, None)

    def find_game(self, code: str) -> str:
        # Utilized when joining a game
        return self.code_game_mapping.get(code, None)

    async def join_game(self, game_id: str, player_id: str, websocket) -> bool:
        game = self.games.get(game_id)
        lock = self.locks.get(game_id)

        if not game or not lock:
            if DEBUG:
                print(f"ERROR:  [FAILED WITHIN ENGINE.PY] Game ID does not map to a lobby.")
            await manager.send_personal_message(websocket, {
                "type": "error",
                "reason": "no_game",
                "message": "Game ID associated with the given code is not valid/does not exist."
            })
            return False

        async with lock:
            if game.phase != "waiting":
                if DEBUG:
                    print(f"ERROR:  Cannot join game in progress")
                await manager.send_personal_message(websocket, {
                    "type": "error",
                    "reason": "game_in_progress",
                    "message": "Cannot join game that has already started."
                })
                return False
            
            if len(game.players) >= 2: # currently, we cap games at 2 players
                if DEBUG:
                    print(f"ERROR:  Cannot join a full lobby.")
                await manager.send_personal_message(websocket, {
                    "type": "error",
                    "reason": "lobby_full",
                    "message": "Cannot join game with a full lobby"
                })
                return False
        
            if player_id in game.players:
                return True

            game.players[player_id] = {
                "score": STARTING_SCORE
            }

            return True

    async def kill_lobby(self, game_id: str):
        # since removing a player kills a lobby, just kill the lobby
        game = self.games.get(game_id)
        code = game.get_code()
        lock = self.locks.get(game_id)
        if not game or not lock:
            if DEBUG:
                print(f"DEBUG:  No game to kill.")
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
            if DEBUG:
                print(f"ERROR:  No game to start.")
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
            if DEBUG:
                print(f"ERROR:  No game to guess in.")
            return

        async with lock:
            if game.phase != "guessing":
                if DEBUG:
                    print(f"ERROR:  Couldn't process guess within guessing period.")
                return

            if player_id not in game.guesses: # Only accept a guess if the player has not already guessed this round
                game.guesses[player_id] = {
                    "lat": lat,
                    "lng": lng
                }
                await manager.broadcast(game_id, {
                    "type": "guess_processed",
                    "playerId": player_id,
                    "name": game.players[player_id]["name"]
                })

    def compute_results(self, game: Game) -> dict:
        if game.phase == "results":
            raise Exception("compute_results called multiple times in same round")
        results = {
            "actual_location": {"lat": game.actual_location["lat"], "lng": game.actual_location["lng"]},
            "players": {}
        }

        for player_id in game.players:
            # If a player didn't guess, they receive 0 points
            if player_id not in game.guesses:
                if DEBUG:
                    print(f"DEBUG:  Player {player_id} did not guess, granting 0 points...")
                results["players"][player_id] = {
                    "guess": None,
                    "distance": None,
                    "score": game.players[player_id]["score"],
                    "is_perfect": False
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

            if distance > MAX_CAMPUS_DISTANCE:
                bearing = self._calculate_bearing(
                    game.actual_location["lat"],
                    game.actual_location["lng"],
                    guess["lat"],
                    guess["lng"]
                )
                new_lat, new_lng = self._calculate_destination(
                    game.actual_location["lat"],
                    game.actual_location["lng"],
                    bearing,
                    MAX_CAMPUS_DISTANCE
                )
                guess["lat"] = new_lat
                guess["lng"] = new_lng
                distance = MAX_CAMPUS_DISTANCE

            is_perfect = distance <= PERFECT_GUESS_THRESHOLD
            round_score = 1000 if is_perfect else max(0, int(1000 * (1 - (distance / MAX_CAMPUS_DISTANCE))))
            game.players[player_id]["score"] += round_score

            results["players"][player_id] = {
                "guess": guess,
                "distance": distance,
                "score": game.players[player_id]["score"],
                "is_perfect": is_perfect
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

    def _calculate_bearing(self, lat1, lng1, lat2, lng2):
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        d_lng = lng2 - lng1
        y = math.sin(d_lng) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lng)
        return math.atan2(y, x)

    def _calculate_destination(self, lat1, lng1, bearing, distance):
        R = 6371e3
        d = distance / R
        lat1, lng1 = map(math.radians, [lat1, lng1])
        
        lat2 = math.asin(math.sin(lat1) * math.cos(d) +
                         math.cos(lat1) * math.sin(d) * math.cos(bearing))
        lng2 = lng1 + math.atan2(math.sin(bearing) * math.sin(d) * math.cos(lat1),
                                 math.cos(d) - math.sin(lat1) * math.sin(lat2))
                                 
        return math.degrees(lat2), math.degrees(lng2)

    def encode(self, length=6) -> str:
        # Creates a joinable code for a game
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))