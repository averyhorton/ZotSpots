from typing import Dict, List
from fastapi import WebSocket
from config import DEBUG

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket) -> bool:
        if game_id not in self.connections:
            if DEBUG:
                print(f"DEBUG:  Game ID {game_id} is not active, activating...")
            self.connections[game_id] = []

        if websocket not in self.connections[game_id]:
            self.connections[game_id].append(websocket)
            if DEBUG:
                print(f"DEBUG:  Websocket {websocket} added to connections.")
            return True
        if DEBUG:
            print(f"DEBUG:  Websocket {websocket} already present in connections.")
        return False

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.connections:
            if websocket in self.connections[game_id]:
                self.connections[game_id].remove(websocket)
        else:
            if DEBUG:
                print(f"DEBUG:  Websocket {websocket} is not active.")
            return

        if not self.connections[game_id]:
            del self.connections[game_id]

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        # Sends a message to just one client
        try:
            await websocket.send_json(message)
        except:
            if DEBUG:
                print(f"ERROR:  Failed to send personal message to websocket {websocket}.")
            return

    async def broadcast(self, game_id: str, message: dict):
        if DEBUG:
            print(f"DEBUG:  Broadcasting to {game_id}: {len(self.connections.get(game_id, []))} connections, type={message.get('type')}")
        if game_id not in self.connections:
            return

        dead = []

        for ws in self.connections[game_id]:
            try:
                await ws.send_json(message)
            except Exception as e:
                if DEBUG:
                    print(f"ERROR:  Failed to send to ws: {e}\nERROR:   Killing websocket...")
                dead.append(ws)

        for ws in dead:
            self.connections[game_id].remove(ws)

manager = ConnectionManager()