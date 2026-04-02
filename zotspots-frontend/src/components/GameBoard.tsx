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

interface GameBoardProps {
  ws: WebSocket | null;
  gameId: string;
  playerId: string;
  mode: "singleplayer" | "multiplayer";
}

export default function GameBoard({ ws, gameId, playerId, mode }: GameBoardProps) {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentRound, setCurrentRound] = useState<RoundStartMsg | null>(null);
  const [roundResults, setRoundResults] = useState<ResultsMsg | null>(null);
  const [finalScores, setFinalScores] = useState<GameOverMsg | null>(null);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panoRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

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
      <div>
        <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50">
          <img src="/PetrGuessr.png" alt="PetrGuessr" className="mx-auto h-16 object-contain" />
        </header>
      <div className="text-center">
        <p className="font-mono text-muted">Waiting for game to start…</p>
      </div>
      </div>
    );
  }

  function PlayingPanel() {
    useEffect(() => {
      if (!panoRef.current || !currentRound?.image) return;
  
      // Destroy previous viewer if it exists
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      
      console.log("Loading panorama:", currentRound.image);
      viewerRef.current = (window as any).pannellum.viewer(panoRef.current, {
        type: "equirectangular",
        panorama: `/${currentRound.image}`,
        autoLoad: true,
        showControls: false,
      });
      console.log("Finished loading!");

      return () => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
      };
    }, [currentRound?.image]);
  
    return (
      <div>
        {/* Panorama container */}
        <div className="relative w-screen h-screen">
          <div
            ref={panoRef}
            className="absolute inset-0"
          />
        </div>

        <div className="relative z-10 pointer-events-none">
          <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50 pointer-events-auto">
            <img src="/PetrGuessr.png" alt="PetrGuessr" className="mx-auto h-16 object-contain" />
          </header>
          <p className="font-mono mt-20">Round {currentRound?.round}</p>
          <p className="font-mono text-sm text-muted mt-2">
            {hasGuessed
              ? "Guess submitted — waiting for results…"
              : "Place your guess on the map."}
          </p>
          <div className="pointer-events-auto">
            <button
              onClick={submitGuess}
              disabled={!guess || hasGuessed}
              className="button1 mt-4"
            >
              Submit Guess
            </button>
          </div>
        </div>
      </div>
    );
  }

  function ResultsPanel() {
    return (
      <div>
        {/* TODO: display players/scores in header */}
        <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50">
          <img src="/PetrGuessr.png" alt="PetrGuessr" className="mx-auto h-16 object-contain" />
        </header>
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 font-mono text-sm text-red-700 max-w-md w-full">
          ⚠️ {error}
        </div>
      )}

      <div>
        {phase === "waiting"   && <WaitingPanel />}
        {phase === "playing"   && <PlayingPanel />}
        {phase === "results"   && <ResultsPanel />}
        {phase === "game_over" && <GameOverPanel />}
      </div>
    </div>
  );
}