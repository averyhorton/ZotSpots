import { useEffect, useState, useCallback } from "react";
import type { WSMessage } from "../hooks/useWebSocket";

interface GameBoardProps {
  ws: WebSocket | null;
  gameId: string;
  playerId: string;
  mode: "singleplayer" | "multiplayer";
}

export default function GameBoard({ ws, gameId, playerId, mode }: GameBoardProps) {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [round, setRound] = useState(0);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [gameOver, setGameOver] = useState(false);

  // Use either the passed WebSocket or ignore if null
  const socket = ws;

  const sendMessage = useCallback(
    (msg: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const msg: WSMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (mode === "singleplayer") {
      sendMessage({ type: "start_game" });
    }
  }, [mode, sendMessage]);

  useEffect(() => {
    messages.forEach((msg) => {
      switch (msg.type) {
        case "round_start":
          setRound(msg.round);
          break;
        case "results":
          setPlayers(msg.results.players);
          break;
        case "game_over":
          setPlayers(msg.final_scores);
          setGameOver(true);
          break;
      }
    });
  }, [messages]);

  const submitGuess = () => sendMessage({ type: "guess", lat: 1, lng: 1 });

  if (gameOver) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Game Over</h2>
        <pre>{JSON.stringify(players, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div>

    </div>
  );
}