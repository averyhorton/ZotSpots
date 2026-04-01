import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Lobby from "./Lobby";
import Home from "./Home";
import GameBoard from "./GameBoard";

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId] = useState<string>(uuidv4());
  const [mode, setMode] = useState<"singleplayer" | "multiplayer" | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_RENDER_URL);

    ws.onopen = () => console.log("WebSocket connected");
    ws.onerror = (e) => console.error("WebSocket error", e);
    ws.onclose = () => console.log("WebSocket closed");

    setWs(ws);

    return () => ws.close();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/play"
        element={
          !gameId ? (
            <Lobby
              ws={ws}
              playerId={playerId}
              onGameStart={(id, mode) => {
                setGameId(id);
                setMode(mode);
              }}
            />
          ) : (
            <GameBoard ws={ws} gameId={gameId} playerId={playerId} mode={mode!} />
          )
        }
      />
    </Routes>
  );
}