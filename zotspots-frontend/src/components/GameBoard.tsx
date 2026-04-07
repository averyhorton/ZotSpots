import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "../hooks/useWebSocket";
import GuessMap from "./GuessMap";
import ResultsMap from "./ResultsMap";
import GameOver, { ConfettiParticles } from "./GameOver";
import { motion, AnimatePresence } from "motion/react";

interface PlayerResult {
  guess: { lat: number; lng: number } | null;
  distance: number | null;
  score: number;
  is_perfect?: boolean;
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

export interface GameOverMsg {
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
  roundResults?: ResultsMsg | null;
  leftGuessed?: boolean;
  rightGuessed?: boolean;
  leftPulsing?: boolean;
  rightPulsing?: boolean;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(2)}km away`;
}

function Emblem({ name, color = "blue" }: { name: string; color?: "blue" | "yellow" }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm shrink-0 ${color === "yellow" ? "bg-yellow-400 text-black" : "bg-blue-500 text-white"}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Checkmark({ guessed, pulsing }: { guessed: boolean; pulsing: boolean }) {
  return (
    <span className={`text-lg leading-none transition-colors ${
      !guessed
        ? "text-gray-400"
        : pulsing
        ? "text-green-400 check-pulse"
        : "text-green-400 check-glow"
    }`}>
      ✓
    </span>
  );
}

function ScoreHeader({
  left,
  right,
  singleplayer = false,
  pulsing,
  roundResults,
  leftGuessed = false,
  rightGuessed = false,
  leftPulsing = false,
  rightPulsing = false,
}: ScoreHeaderProps) {
  if (singleplayer) {
    return (
      <header className={`w-full bg-card shadow-sm py-3 fixed top-0 left-0 z-50 pointer-events-auto ${pulsing ? "yellow-pulse-once" : ""}`}>
        <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-2 w-36">
          <Emblem name={left.name} color="blue" />

          <div className="flex flex-col items-start">
            <span className="font-mono text-xs text-muted truncate">
              {left.name}
            </span>

            <div className="flex flex-col items-start relative">
              <span className="font-mono text-lg font-bold leading-tight text-center">
                {left.score}
              </span>
              <div className="absolute -right-5 top-1/2 -translate-y-1/2">
                <Checkmark guessed={leftGuessed} pulsing={leftPulsing} />
              </div>
            </div>

            {roundResults && (
              <span
                className={`font-mono text-xs ${
                  roundResults.results.players[left.id]?.distance != null
                    ? "text-green-400"
                    : "text-red-500"
                }`}
              >
                {roundResults.results.players[left.id]?.distance != null
                  ? formatDistance(roundResults.results.players[left.id].distance!)
                  : "Didn't Guess!"}
              </span>
            )}
          </div>
        </div>
          <img src="/PetrGuessr.png" alt="PetrGuessr" className="h-16 object-contain" />
        </div>
      </header>
    );
  }

  return (
    <header className={`w-full bg-card shadow-sm py-3 fixed top-0 left-0 z-50 pointer-events-auto ${pulsing ? "yellow-pulse-once" : ""}`}>
      <div className="flex items-center justify-between px-6">
        {/* Left player (current player) */}
        <div className="flex items-center gap-2 w-36">
        <Emblem name={left.name} color="blue" />
        <div className="flex flex-col items-start">
          <span className="font-mono text-xs text-muted truncate">
            {left.name}
          </span>
          <div className="flex flex-col items-start relative">
            <span className="font-mono text-lg font-bold leading-tight text-center">
              {left.score}
            </span>
            <div className="absolute -right-5 top-1/2 -translate-y-1/2">
              <Checkmark guessed={leftGuessed} pulsing={leftPulsing} />
            </div>
          </div>
          <div>
            {roundResults && (
              <span
                className={`font-mono text-xs ${
                  roundResults.results.players[left.id]?.distance != null
                    ? "text-green-400"
                    : "text-red-500"
                }`}
              >
                {roundResults.results.players[left.id]?.distance != null
                  ? formatDistance(roundResults.results.players[left.id].distance!)
                  : "Didn't Guess!"}
              </span>
            )}
          </div>
        </div>
      </div>

        {/* Logo divider */}
        <img src="/PetrGuessr.png" alt="PetrGuessr" className="h-16 object-contain" />

        {/* Right player (opponent) */}
        <div className="flex items-center justify-end gap-2 w-36">
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs text-muted truncate">{right.name}</span>
            <div className="flex flex-col items-end relative">
              <span className="font-mono text-lg font-bold leading-tight text-center">
                {right.score}
              </span>
              <div className="absolute -left-5 top-1/2 -translate-y-1/2">
                <Checkmark guessed={rightGuessed} pulsing={rightPulsing} />
              </div>
            </div>
            <div>
              {roundResults && (
                <span className={`font-mono text-xs ${
                  roundResults.results.players[right.id]?.distance != null
                    ? "text-green-400"
                    : "text-red-500"
                }`}>
                  {roundResults.results.players[right.id]?.distance != null
                    ? formatDistance(roundResults.results.players[right.id].distance!)
                    : "Didn't Guess!"}
                </span>
              )}
            </div>
          </div>
          <Emblem name={right.name} color="yellow" />
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
  leftGuessed: boolean;
  rightGuessed: boolean;
  leftPulsing: boolean;
  rightPulsing: boolean;
}

interface ResultsPanelProps {
  roundResults: ResultsMsg | null;
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer?: boolean;
  isPerfectGuess?: boolean;
}

const PerfectGuessBanner = ({ show }: { show: boolean }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 28 } }}
          exit={{ y: -80, opacity: 0, transition: { duration: 0.3 } }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <div className="relative px-8 py-3 rounded-2xl overflow-hidden shadow-2xl">
            {/* blurred gold bg only around the pill */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md rounded-2xl border border-yellow-400/40" />
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 40px 4px rgba(255,210,0,0.45)" }} />
            <p className="relative font-black text-2xl md:text-3xl tracking-tight whitespace-nowrap" style={{ color: "#FFD200", textShadow: "0 0 20px rgba(255,210,0,0.9)" }}>
              ⭐ Perfect Guess! &nbsp;<span className="text-white/80 font-bold text-xl">+1000 pts</span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface GameOverPanelProps {
  finalScores: GameOverMsg | null;
  singleplayer?: boolean;
}

function WaitingPanel({ left, right, singleplayer = false }: WaitingPanelProps) {
  return (
    <div>
      <ScoreHeader left={left} right={right} singleplayer={singleplayer} />
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
  pulsing,
  leftGuessed,
  rightGuessed,
  leftPulsing,
  rightPulsing,
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
    <div className="fixed inset-0 z-0 bg-background overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div ref={panoRef} className="absolute inset-0" />
      </div>
      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <ScoreHeader
          left={left}
          right={right}
          singleplayer={singleplayer}
          pulsing={pulsing}
          leftGuessed={leftGuessed}
          rightGuessed={rightGuessed}
          leftPulsing={leftPulsing}
          rightPulsing={rightPulsing}
        />
        <div className="fixed top-24 left-2 z-50 pointer-events-none">
          <p
            className={`font-mono text-2xl px-4 py-2 rounded-lg bg-black/60 ${
              timeLeft <= 5 ? "text-red-400" : "text-white"
            }`}
          >
            ⏱️ {timeLeft}s
          </p>
        </div>
        <div className="fixed top-24 right-2 z-50 pointer-events-auto">
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

function ResultsPanel({ roundResults, left, right, singleplayer = false, isPerfectGuess }: ResultsPanelProps) {
  if (!roundResults) return null;

  return (
    <div className="fixed inset-0 z-0 bg-background overflow-hidden">
      <ResultsMap
        actualLocation={roundResults.results.actual_location}
        results={roundResults.results.players}
        left={left}
        right={right}
        singleplayer={singleplayer}
      />
      <div className="fixed top-0 left-0 w-full" style={{ zIndex: 1001 }}>
        <ScoreHeader left={left} right={right} singleplayer={singleplayer} roundResults={roundResults} />
      </div>
      {/* Confetti: fixed so it layers over the map */}
      {isPerfectGuess && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9998] flex items-center justify-center">
          <ConfettiParticles trigger={!!isPerfectGuess} />
        </div>
      )}
      <PerfectGuessBanner show={!!isPerfectGuess} />
    </div>
  );
}

function GameOverPanel({ finalScores, singleplayer = false }: GameOverPanelProps) {
  return <GameOver finalScores={finalScores} singleplayer={singleplayer} />;
}

interface GameBoardProps {
  ws: WebSocket | null;
  playerId: string;
  mode: "singleplayer" | "multiplayer";
}

export default function GameBoard({ ws, playerId, mode }: GameBoardProps) {
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
  const [opponentHasGuessed, setOpponentHasGuessed] = useState(false);
  const [opponentGuessPulse, setOpponentGuessPulse] = useState(false);
  const [isPerfectGuess, setIsPerfectGuess] = useState(false);
  const panoRef = useRef<HTMLDivElement | null>(null);
  const resultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseRef = useRef<GamePhase>("waiting");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Countdown timer
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
        setScores((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return Object.fromEntries(Object.keys(data.players).map((id) => [id, 0]));
        });
        setGuess(null);
        setHasGuessed(false);
        setIsPerfectGuess(false); // Reset perfect flag
        setOpponentHasGuessed(false);
        setOpponentGuessPulse(false);
        setTimeLeft(30);
        setPhase("playing");
        break;
      }
      case "guess_processed": {
        const data = msg as WSMessage & GuessProcessedMsg;
        if (data.playerId !== playerId) {
          setOpponentHasGuessed(true);
          setOpponentGuessPulse(true);
          setTimeout(() => setOpponentGuessPulse(false), 600);
          setNotification(`${data.name} has guessed!`);
          setTimeout(() => setNotification(null), 3000);
        }
        break;
      }
      case "results": {
        const data = msg as WSMessage & ResultsMsg;
        setRoundResults({ round: data.round, results: data.results });
        if (data.results.players[playerId]?.is_perfect) {
          setIsPerfectGuess(true);
        }
        setScores((prev) => {
          const next = { ...prev };
          for (const [id, result] of Object.entries(data.results.players)) {
            next[id] = result.score;
          }
          return next;
        });
        // Store the timeout so game_over can cancel it
        resultsTimeoutRef.current = setTimeout(() => setPhase("results"), 500);
        break;
      }
      case "game_over": {
        // Cancel any pending phase("results") transition
        if (resultsTimeoutRef.current) {
          clearTimeout(resultsTimeoutRef.current);
          resultsTimeoutRef.current = null;
        }
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

  const opponentId = Object.keys(players).find((id) => id !== playerId) ?? "";
  const left: PlayerInfo = {
    id: playerId,
    name: players[playerId]?.name ?? "You",
    score: scores[playerId] ?? 0,
  };
  const right: PlayerInfo = {
    id: opponentId,
    name: players[opponentId]?.name ?? "Opponent",
    score: scores[opponentId] ?? 0,
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden z-0">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 font-mono text-sm text-red-700 max-w-md w-full">
          ⚠️ {error}
        </div>
      )}

      {notification && (
        <div className="fixed top-20 left-1/2 z-50
          bg-black/70 text-white font-mono text-sm px-5 py-2 rounded-full
          shadow-lg animate-fade-in-down">
          🎯 {notification}
        </div>
      )}

      <div>
        {phase === "waiting" && (
          <WaitingPanel
            left={left}
            right={right}
            singleplayer={singleplayer}
            onDisconnect={() => { window.location.href = "/play"; }}
          />
        )}
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
            onDisconnect={() => { window.location.href = "/play"; }}
            pulsing={pulsing}
            leftGuessed={hasGuessed}
            rightGuessed={opponentHasGuessed}
            leftPulsing={pulsing}
            rightPulsing={opponentGuessPulse}
          />
        )}
        {phase === "results" && (
          <ResultsPanel roundResults={roundResults} left={left} right={right} singleplayer={singleplayer} isPerfectGuess={isPerfectGuess} />
        )}
        {phase === "game_over" && (
          <GameOverPanel finalScores={finalScores} singleplayer={singleplayer} />
        )}
      </div>
    </div>
  );
}
