import { useState, useEffect, useRef } from "react";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";
import { v4 as uuidv4 } from "uuid";

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId] = useState<string>(uuidv4());
  const [mode, setMode] = useState<"singleplayer" | "multiplayer" | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.RENDER_URL);
    console.log(ws)
    wsRef.current = ws;

    ws.onopen = () => console.log("WebSocket connected");
    ws.onerror = (e) => console.error("WebSocket error", e);
    ws.onclose = () => console.log("WebSocket closed");

    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-center p-4">
      {!gameId ? (
        <Lobby
          ws={wsRef.current}
          playerId={playerId}
          onGameStart={(id, mode) => {
            setGameId(id);
            setMode(mode);
          }}
      />
      ) : (
        <GameBoard ws={wsRef.current} gameId={gameId} playerId={playerId} mode={mode!} />
      )}
    </div>
  );
}