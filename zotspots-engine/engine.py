from dataclasses import dataclass, field
import asyncio
from game import Game

@dataclass
class GameEngine:
    games: dict[str, Game] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)