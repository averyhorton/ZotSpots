import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Lobby from "./Lobby";
import Home from "./Home";
import GameBoard from "./GameBoard";

type WsStatus = "connecting" | "open" | "error" | "closed";

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId] = useState<string>(uuidv4());
  const [mode, setMode] = useState<"singleplayer" | "multiplayer" | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");

  useEffect(() => {
    let socket: WebSocket;
    let cancelled = false;
  
    function connect() {
      socket = new WebSocket(import.meta.env.VITE_RENDER_URL);
      setWsStatus("connecting");
  
      socket.onopen = () => {
        if (cancelled) return;
        console.log("WebSocket connected");
        setWsStatus("open");
        setWs(socket);
      };
  
      socket.onerror = () => {
        if (cancelled) return;
        console.error("WebSocket error");
        setWsStatus("connecting"); // keep showing spinner, not error
      };
  
      socket.onclose = () => {
        if (cancelled) return;
        console.log("WebSocket closed, retrying in 3s…");
        setWsStatus("connecting");
        setTimeout(connect, 3000); // retry after 3 seconds
      };
    }
  
    connect();
  
    return () => {
      cancelled = true;
      socket?.close();
    };
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
              wsStatus={wsStatus}
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