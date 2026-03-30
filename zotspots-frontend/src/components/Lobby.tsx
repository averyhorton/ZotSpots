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
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
      <div className="flex gap-2 mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => createGame("singleplayer")}
        >
          Create Singleplayer
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
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
          className="border p-2 rounded w-full mb-2"
        />
        <button
          className="bg-gray-700 text-white px-4 py-2 rounded w-full"
          onClick={joinGame}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}