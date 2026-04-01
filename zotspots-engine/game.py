from dataclasses import dataclass, field
from typing import Dict, Optional, List


@dataclass
class Game:
    id: str  # unique game ID
    code: str # Joinable game ID if multiplayer
    players: Dict[str, dict] = field(default_factory=dict)  # player_id → info, e.g., {"score": 0}
    guesses: Dict[str, dict] = field(default_factory=dict)  # player_id → {"lat": float, "lng": float}. Dynamically resets after each round
    actual_location: Optional[dict] = None  # {"lat": float, "lng": float} for current round. Dynamically resets after each round
    phase: str = "waiting"  # can be "waiting", "guessing", "results". Waiting is the status when we are in a lobby but not a game.
    round_number: int = 0
    mode: str = "multiplayer" # can be singleplayer or multiplayer depending on the lobby

    def check_win(self) -> Optional[tuple[str, dict]]:
        if self.mode == "singleplayer":
            return None # Nobody wins in singleplayer!
        if len(self.players) != 2:
            raise Exception("Currently only supports 2-player games") # Only handle 2-player games for now; may scale upwards from 2 eventually

        # Extract players
        (p1_id, p1_data), (p2_id, p2_data) = list(self.players.items())

        # Both at or below 0 → who has more remaining score wins
        if p1_data["score"] <= 0 and p2_data["score"] <= 0:
            if p1_data["score"] == p2_data["score"]:
                return None  # tie
            return (p1_id, p1_data) if p1_data["score"] > p2_data["score"] else (p2_id, p2_data)
        elif p1_data["score"] <= 0:
            return (p2_id, p2_data)
        elif p2_data["score"] <= 0:
            return (p1_id, p1_data)

        # Nobody has lost yet
        return None
    
    def get_id(self) -> str:
        return self.id
    
    def get_code(self) -> str:
        return self.code if self.mode == "multiplayer" else None