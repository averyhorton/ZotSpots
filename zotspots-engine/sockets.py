from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()

        if game_id not in self.connections:
            self.connections[game_id] = []

        self.connections[game_id].append(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.connections:
            if websocket in self.connections[game_id]:
                self.connections[game_id].remove(websocket)

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.connections:
            return

        dead = []

        for ws in self.connections[game_id]:
            try:
                await ws.send_json(message)
            except:
                dead.append(ws)

        for ws in dead:
            self.connections[game_id].remove(ws)


manager = ConnectionManager()