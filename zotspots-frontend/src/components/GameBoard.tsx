import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "../hooks/useWebSocket";
import GuessMap from "./GuessMap";
import ResultsMap from "./ResultsMap";

interface PlayerResult {
  guess: { lat: number; lng: number } | null;
  distance: number | null;
  score: number;
}

interface RoundStartMsg {
  round: number;
  image: string;
  players: Record<string, { name: string }>;
}

interface GuessProcessedMsg {
  playerId: string;
  name: string;
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

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

type GamePhase = "waiting" | "playing" | "results" | "game_over";

interface ScoreHeaderProps {
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer?: boolean;
  pulsing?: boolean;
}

function Emblem({ name, color = "blue" }: { name: string; color?: "blue" | "yellow" }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm shrink-0 ${color === "yellow" ? "bg-yellow-400 text-black" : "bg-blue-500 text-white"}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ScoreHeader({ left, right, singleplayer = false, pulsing }: ScoreHeaderProps) {
  if (singleplayer) {
    return (
      <header className={`w-full bg-card shadow-sm py-3 fixed top-0 left-0 z-50 pointer-events-auto ${pulsing ? "yellow-pulse-once" : ""}`}>
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Emblem name={left.name} />
            <div className="flex flex-col">
              <span className="font-mono text-xs text-muted truncate">{left.name}</span>
              <span className="font-mono text-lg font-bold leading-tight">{left.score}</span>
            </div>
          </div>
          <img src="/PetrGuessr.png" alt="PetrGuessr" className="h-12 object-contain" />
        </div>
      </header>
    );
  }

  return (
    <header className={`w-full bg-card shadow-sm py-3 fixed top-0 left-0 z-50 pointer-events-auto ${pulsing ? "yellow-pulse-once" : ""}`}>
      <div className="flex items-center justify-between px-6">
        {/* Left player (current player) */}
        <div className="flex items-center gap-2 w-36">
          <Emblem name={left.name} color="blue"/>
          <div className="flex flex-col">
            <span className="font-mono text-xs text-muted truncate">{left.name}</span>
            <span className="font-mono text-lg font-bold leading-tight">{left.score}</span>
          </div>
        </div>

        {/* Logo divider */}
        <img src="/PetrGuessr.png" alt="PetrGuessr" className="h-12 object-contain" />

        {/* Right player (opponent) */}
        <div className="flex items-center gap-2 w-36 justify-end">
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs text-muted truncate">{right.name}</span>
            <span className="font-mono text-lg font-bold leading-tight">{right.score}</span>
          </div>
          <Emblem name={right.name} color="yellow"/>
        </div>
      </div>
    </header>
  );
}

interface WaitingPanelProps {
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer?: boolean;
  onDisconnect: () => void;
}

interface PlayingPanelProps {
  currentRound: RoundStartMsg | null;
  timeLeft: number;
  guess: { lat: number; lng: number } | null;
  onGuess: (latlng: { lat: number; lng: number }) => void;
  hasGuessed: boolean;
  submitGuess: () => void;
  panoRef: React.RefObject<HTMLDivElement | null>;
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer?: boolean;
  onDisconnect: () => void;
  pulsing: boolean;
}

interface ResultsPanelProps {
  roundResults: ResultsMsg | null;
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer?: boolean;
}

interface GameOverPanelProps {
  finalScores: GameOverMsg | null;
  singleplayer?: boolean;
}

function WaitingPanel({ left, right, singleplayer = false}: WaitingPanelProps) {
  return (
    <div>
      <ScoreHeader left={left} right={right} singleplayer={singleplayer}/>
      <div className="text-center">
        <p className="font-mono text-muted">Waiting for game to start…</p>
      </div>
    </div>
  );
}

function PlayingPanel({
  currentRound,
  timeLeft,
  guess,
  hasGuessed,
  onGuess,
  submitGuess,
  panoRef,
  left,
  right,
  singleplayer,
  onDisconnect,
  pulsing
}: PlayingPanelProps) {
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!panoRef.current || !currentRound?.image) return;

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
      <div className="relative w-screen h-screen">
        <div ref={panoRef} className="absolute inset-0" />
      </div>
      {/* UI Overlay */}
      <div className="relative z-10 pointer-events-none">
        <ScoreHeader left={left} right={right} singleplayer={singleplayer} pulsing={pulsing}/>
        <div className="fixed top-20 left-2 z-50 pointer-events-none">
          <p
            className={`font-mono text-2xl px-4 py-2 rounded-lg bg-black/60 text-white ${
              timeLeft <= 5 ? "text-red-400" : ""
            }`}
          >
            ⏱️ {timeLeft}s
          </p>
        </div>
        <div className="fixed top-20 right-2 z-50 pointer-events-auto">
          <button
            onClick={onDisconnect}
            className="w-9 h-9 p-5 flex items-center justify-center rounded-lg bg-black/60 text-red-500 hover:bg-red-600 hover:text-white transition-colors font-bold text-2xl"
          >
            ✕
          </button>
        </div>
        
      </div>
      <div className="pointer-events-auto">
        <GuessMap guess={guess} onGuess={onGuess} />
        <div className="fixed bottom-1 right-3 z-50" style={{ width: 400 }}>
          <button
            onClick={submitGuess}
            disabled={!guess || hasGuessed}
            className="fixed bottom-1 right-3 z-50 w-64 py-5 sm:w-80 md:w-96 font-black text-3xl rounded-lg transition-colors
              bg-blue-500 text-white hover:bg-blue-600 hover:text-glow
              disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {hasGuessed ? "Guess submitted!" : "Submit Guess 📍"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ roundResults, left, right, singleplayer = false }: ResultsPanelProps) {
  if (!roundResults) return null;

  return (
    <div className="relative w-screen h-screen">
      {/* Fullscreen map */}
      <ResultsMap
        actualLocation={roundResults.results.actual_location}
        results={roundResults.results.players}
        left={left}
        right={right}
        singleplayer={singleplayer}
      />
      {/* Score header overlaid on top */}
      <div className="fixed top-0 left-0 w-full" style={{ zIndex: 1001 }}>
        <ScoreHeader left={left} right={right} singleplayer={singleplayer} />
      </div>
    </div>
  );
}

function GameOverPanel({ finalScores, singleplayer = false }: GameOverPanelProps) {
  return (
    <div className="text-center">
      {/* TODO: leaderboard, winner banner for multiplayer */}
      <h2 className="font-mono text-2xl font-bold mb-2">Game Over</h2>
      {finalScores?.winner && (
        <p className="font-mono text-lg mb-4">
          Winner:{" "}
          {finalScores.final_scores[finalScores.winner.id]?.name ?? finalScores.winner.id}
          {" "}({finalScores.winner.score} pts)
        </p>
      )}
      <pre className="text-xs text-left">{JSON.stringify(finalScores?.final_scores, null, 2)}</pre>
    </div>
  );
}

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
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, { name: string }>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [pulsing, setPulsing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const panoRef = useRef<HTMLDivElement | null>(null);

  // Ref so handleMessage always sees current phase without stale closure
  const phaseRef = useRef<GamePhase>("waiting");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Countdown timer — lives here so it doesn't affect PlayingPanel's identity
  useEffect(() => {
    if (phase !== "playing") return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleMessage = useCallback((event: MessageEvent) => {
    const msg: WSMessage = JSON.parse(event.data);

    switch (msg.type) {
      case "round_start": {
        const data = msg as WSMessage & RoundStartMsg;
        setCurrentRound({ round: data.round, image: data.image, players: data.players });
        setPlayers(data.players);
        // Seed scores at 5000 on the first round only
        setScores((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return Object.fromEntries(Object.keys(data.players).map((id) => [id, 5000]));
        });
        setGuess(null);
        setHasGuessed(false);
        setTimeLeft(30);
        setPhase("playing");
        break;
      }
      case "guess_processed":
        console.log("Received guess!")
        const data = msg as WSMessage & GuessProcessedMsg;
        if (data.playerId !== playerId) {
          setNotification(`${data.name} has guessed!`);
          setTimeout(() => setNotification(null), 3000);
        }
        break;
      case "results": {
        const data = msg as WSMessage & ResultsMsg;
        setRoundResults({ round: data.round, results: data.results });
        // Update scores from results payload
        setScores((prev) => {
          const next = { ...prev };
          for (const [id, result] of Object.entries(data.results.players)) {
            next[id] = result.score;
          }
          return next;
        });
        setTimeout(() => setPhase("results"), 500);
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

  const singleplayer = mode === "singleplayer";

  const sendMessage = useCallback((msg: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, [ws]);

  const submitGuess = useCallback(() => {
    if (!guess || hasGuessed) return;
    sendMessage({ type: "guess", lat: guess.lat, lng: guess.lng });
    setHasGuessed(true);
  }, [guess, hasGuessed, sendMessage]);

  function handleSubmit() {
    setPulsing(true);
    submitGuess();
    setTimeout(() => setPulsing(false), 600);
  }

  // Derive left (self) and right (opponent) for the score header
  const opponentId = Object.keys(players).find((id) => id !== playerId) ?? "";
  const left: PlayerInfo = {
    id: playerId,
    name: players[playerId]?.name ?? "You",
    score: scores[playerId] ?? 5000,
  };
  const right: PlayerInfo = {
    id: opponentId,
    name: players[opponentId]?.name ?? "Opponent",
    score: scores[opponentId] ?? 5000,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 font-mono text-sm text-red-700 max-w-md w-full">
          ⚠️ {error}
        </div>
      )}

      {notification && (
        <div className="fixed top-20 left-1/2  z-50
          bg-black/70 text-white font-mono text-sm px-5 py-2 rounded-full
          shadow-lg animate-fade-in-down">
          🎯 {notification}
        </div>
      )}

      <div>
        {phase === "waiting" && <WaitingPanel 
          left={left} 
          right={right} 
          singleplayer={singleplayer}
          onDisconnect={() => {
            window.location.href = "/play";
          }}
        />}
        {phase === "playing" && (
          <PlayingPanel
            currentRound={currentRound}
            timeLeft={timeLeft}
            guess={guess}
            hasGuessed={hasGuessed}
            onGuess={setGuess}
            submitGuess={handleSubmit}
            panoRef={panoRef}
            left={left}
            right={right}
            singleplayer={singleplayer}
            onDisconnect={() => {
              window.location.href = "/play";
            }}
            pulsing={pulsing}
          />
        )}
        {phase === "results" && <ResultsPanel roundResults={roundResults} left={left} right={right} singleplayer={singleplayer}/>}
        {phase === "game_over" && <GameOverPanel finalScores={finalScores} singleplayer={singleplayer}/>}
      </div>
    </div>
  );
}