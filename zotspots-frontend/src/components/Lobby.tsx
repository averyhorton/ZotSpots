import { useState, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import type { WSMessage } from "../hooks/useWebSocket";

const WS_URL = "wss://zotspots.onrender.com/ws";

interface LobbyProps {
  setGameId: (id: string) => void;
  playerId: string;
  setMode: (mode: "singleplayer" | "multiplayer") => void;
}

export default function Lobby({ setGameId, playerId, setMode }: LobbyProps) {
  const { messages, sendMessage } = useWebSocket(WS_URL);
  const [inputGameId, setInputGameId] = useState("");

  const createGame = (selectedMode: "singleplayer" | "multiplayer") => {
    setMode(selectedMode);
    sendMessage({ type: "create_game", mode: selectedMode, player_id: playerId });
  };

  const joinGame = () => {
    if (!inputGameId) return;
    sendMessage({ type: "join_game", game_id: inputGameId, player_id: playerId });
  };

  useEffect(() => {
    messages.forEach((msg: WSMessage) => {
      if (msg.type === "game_created") setGameId(msg.game_id);
    });
  }, [messages, setGameId]);

  return (
    <div className="bg-card p-6 rounded shadow-md w-full max-w-lg">
      <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50">
        <img
          src="/PetrGuessr.png"
          alt="PetrGuessr"
          className="mx-auto h-16 object-contain"
        />
      </header>
      <div className="flex gap-2 mb-4">
        <h1 className="text-default">Header</h1> 
        <body className="">body</body>
        <button
          className="button1"
          onClick={() => createGame("singleplayer")}
        >
          Create Singleplayer
        </button>
        <button
          className="button2"
          onClick={() => createGame("multiplayer")}
        >
          Create Multiplayer
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Enter Game ID"
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value)}
          className="input-glow input-default"
        />
        <button
          className="button-default"
          onClick={joinGame}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}