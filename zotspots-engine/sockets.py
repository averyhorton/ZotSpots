from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket) -> bool:
        if game_id not in self.connections:
            self.connections[game_id] = []

        if websocket not in self.connections[game_id]:
            self.connections[game_id].append(websocket)
            return True
        return False

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.connections:
            if websocket in self.connections[game_id]:
                self.connections[game_id].remove(websocket)
        else:
            return

        if not self.connections[game_id]:
            del self.connections[game_id]

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        # Sends a message to just one client
        await websocket.send_json(message)

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