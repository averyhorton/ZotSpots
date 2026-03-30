import { useState } from "react";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId] = useState<string>(
    `player-${Math.floor(Math.random() * 10000)}`
  );
  const [mode, setMode] = useState<"singleplayer" | "multiplayer" | null>(null);

  return (
    <div className="min-h-screen flex justify-center items-center p-4 bg-gray-100">
      {!gameId ? (
        <Lobby setGameId={setGameId} playerId={playerId} setMode={setMode} />
      ) : (
        <GameBoard gameId={gameId} playerId={playerId} mode={mode!} />
      )}
    </div>
  );
}