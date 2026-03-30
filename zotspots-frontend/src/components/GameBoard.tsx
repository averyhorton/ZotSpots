import { useEffect, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import type { WSMessage } from "../hooks/useWebSocket";

interface GameBoardProps {
  gameId: string;
  playerId: string;
  mode: "singleplayer" | "multiplayer";
}

export default function GameBoard({ gameId, playerId, mode }: GameBoardProps) {
  const { messages, sendMessage } = useWebSocket("wss://zotspots.onrender.com/ws");
  const [round, setRound] = useState(0);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (mode === "singleplayer") {
      sendMessage({ type: "start_game" });
    }
  }, [mode, sendMessage]);

  useEffect(() => {
    messages.forEach((msg: WSMessage) => {
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
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
      <h1 className="text-xl font-bold mb-4">Round {round+1}</h1>
      <pre>{JSON.stringify(players, null, 2)}</pre>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        onClick={submitGuess}
      >
        Submit Guess
      </button>
    </div>
  );
}