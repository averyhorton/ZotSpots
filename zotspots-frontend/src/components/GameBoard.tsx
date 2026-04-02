import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "../hooks/useWebSocket";

interface PlayerResult {
  guess: { lat: number; lng: number } | null;
  distance: number | null;
  score: number;
}

interface RoundStartMsg {
  round: number;
  image: string;
}

interface ResultsMsg {
  round: number;
  results: {
    actual_location: { lat: number; lng: number };
    players: Record<string, PlayerResult>;
  };
}

interface GameOverMsg {
  winner: { id: string; score: number } | null;
  final_scores: Record<string, { name: string; score: number }>;
}

type GamePhase = "waiting" | "playing" | "results" | "game_over";

// ── Props ─────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  ws: WebSocket | null;
  gameId: string;
  playerId: string;
  mode: "singleplayer" | "multiplayer";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameBoard({ ws, gameId, playerId, mode }: GameBoardProps) {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentRound, setCurrentRound] = useState<RoundStartMsg | null>(null);
  const [roundResults, setRoundResults] = useState<ResultsMsg | null>(null);
  const [finalScores, setFinalScores] = useState<GameOverMsg | null>(null);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref so handleMessage always sees current phase without stale closure
  const phaseRef = useRef<GamePhase>("waiting");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "round_start": {
          const data = msg as WSMessage & RoundStartMsg;
          setCurrentRound({ round: data.round, image: data.image });
          setGuess(null);
          setHasGuessed(false);
          setPhase("playing");
          break;
        }
        case "results": {
          const data = msg as WSMessage & ResultsMsg;
          setRoundResults({ round: data.round, results: data.results });
          setPhase("results");
          break;
        }
        case "game_over": {
          const data = msg as WSMessage & GameOverMsg;
          setFinalScores({ winner: data.winner, final_scores: data.final_scores });
          setPhase("game_over");
          break;
        }
        case "error": {
          setError(msg.message ?? "An unknown error occurred.");
          break;
        }
      }
  }, []);

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, handleMessage]);

  const sendMessage = useCallback((msg: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, [ws]);

  function submitGuess() {
    if (!guess || hasGuessed) return;
    sendMessage({ type: "guess", lat: guess.lat, lng: guess.lng });
    setHasGuessed(true);
  }

  function WaitingPanel() {
    return (
      <div className="text-center">
        <p className="font-mono text-muted">Waiting for game to start…</p>
      </div>
    );
  }

  function PlayingPanel() {
    return (
      <div>
        {/* TODO: show currentRound.image, map for guess placement */}
        <p className="font-mono">Round {currentRound?.round}</p>
        <p className="font-mono text-sm text-muted">Image: {currentRound?.image}</p>
        <p className="font-mono text-sm text-muted">
          {hasGuessed ? "Guess submitted — waiting for results…" : "Place your guess on the map."}
        </p>
        <button
          onClick={submitGuess}
          disabled={!guess || hasGuessed}
          className="button1 mt-4"
        >
          Submit Guess
        </button>
      </div>
    );
  }

  function ResultsPanel() {
    return (
      <div>
        {/* TODO: show map with actual location + all player guesses + distances */}
        <h2 className="font-mono text-xl font-bold mb-2">Round {roundResults?.round} Results</h2>
        <pre className="text-xs text-left">{JSON.stringify(roundResults?.results, null, 2)}</pre>
      </div>
    );
  }

  function GameOverPanel() {
    return (
      <div className="text-center">
        {/* TODO: leaderboard, winner banner for multiplayer */}
        <h2 className="font-mono text-2xl font-bold mb-2">Game Over</h2>
        {finalScores?.winner && (
          <p className="font-mono text-lg mb-4">
            Winner: {finalScores.final_scores[finalScores.winner.id]?.name ?? finalScores.winner.id}
            {" "}({finalScores.winner.score} pts)
          </p>
        )}
        <pre className="text-xs text-left">{JSON.stringify(finalScores?.final_scores, null, 2)}</pre>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 font-mono text-sm text-red-700 max-w-md w-full">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-lg border border-border p-8 w-full max-w-2xl">
        {phase === "waiting"   && <WaitingPanel />}
        {phase === "playing"   && <PlayingPanel />}
        {phase === "results"   && <ResultsPanel />}
        {phase === "game_over" && <GameOverPanel />}
      </div>
    </div>
  );
}