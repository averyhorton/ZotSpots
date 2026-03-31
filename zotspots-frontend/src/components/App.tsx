import { useState } from "react";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";
import { v4 as uuidv4 } from "uuid";

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId] = useState<string>(uuidv4());
  const [mode, setMode] = useState<"singleplayer" | "multiplayer" | null>(null);

  return (
    <div className="min-h-screen flex justify-center items-center p-4">
      {!gameId ? (
        <Lobby setGameId={setGameId} playerId={playerId} setMode={setMode} />
      ) : (
        <GameBoard gameId={gameId} playerId={playerId} mode={mode!} />
      )}
    </div>
  );
}