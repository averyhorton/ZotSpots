import { useState, useEffect, useCallback } from "react";

type LobbyMode = "home" | "singleplayer" | "multiplayer-create" | "multiplayer-join" | "waiting";
type MultiplayerRole = "host" | "guest" | null;

interface Player {
  id: string;
  name: string;
  ready: boolean;
}

interface LobbyState {
  code: string;
  players: Player[];
  role: MultiplayerRole;
  isSingleplayer: boolean;
}

interface LobbyScreenProps {
  ws: WebSocket | null;
  wsStatus: "connecting" | "open" | "error" | "closed"; 
  playerId: string;
  onGameStart: (gameId: string, mode: "singleplayer" | "multiplayer") => void;
}

function GlowDivider() {
  return (
    <div className="w-full flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-linear-to-r from-transparent to-primary/40" />
      <span className="text-primary/60 font-mono text-xs tracking-widest">✦</span>
      <div className="flex-1 h-px bg-linear-to-l from-transparent to-primary/40" />
    </div>
  );
}

function PlayerSlot({
  player,
  isYou,
  isEmpty,
  maxPlayers,
}: {
  player?: Player;
  isYou?: boolean;
  isEmpty?: boolean;
  maxPlayers: number;
}) {
  if (isEmpty) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-card/30">
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted text-lg">
          ?
        </div>
        <span className="font-mono text-sm text-muted italic">
          {maxPlayers === 1 ? "You" : "Waiting for player…"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
        player?.name
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card/30"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-mono font-bold transition-colors ${
          player?.name ? "bg-primary text-white" : "bg-border text-muted"
        }`}
      >
        {player?.name ? player.name[0].toUpperCase() : "?"}
      </div>
      <div className="flex-1 text-left">
        <p className="font-mono text-sm text-foreground">
          {player?.name || <span className="text-muted italic">Unnamed player</span>}
          {isYou && (
            <span className="ml-2 text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded font-mono">
              you
            </span>
          )}
        </p>
      </div>
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          player?.name ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-border"
        }`}
      />
    </div>
  );
}

export default function LobbyScreen({ ws, wsStatus, playerId, onGameStart }: LobbyScreenProps) {
  const [mode, setMode] = useState<LobbyMode>("home");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [lobby, setLobby] = useState<LobbyState | null>(null);

  const wsReady = wsStatus === "open";
  const wsError = wsStatus === "error" || wsStatus === "closed";

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "game_created": {
          setLobby({
            code: msg.code,
            players: [{ id: playerId, name: "", ready: false }],
            role: msg.isSingleplayer ? null : "host",
            isSingleplayer: msg.isSingleplayer,
          });
          setMode("waiting");
          break;
        }
        case "player_joined": {
          setLobby((prev) =>
            prev
              ? {
                  ...prev,
                  players: [...prev.players, { id: msg.playerId, name: "", ready: false }],
                }
              : prev
          );
          break;
        }
        case "lobby_updated": {
          setLobby((prev) =>
            prev
              ? {
                  ...prev,
                  players: prev.players.map((p) =>
                    p.id === msg.playerId ? { ...p, name: msg.name } : p
                  ),
                }
              : prev
          );
          break;
        }
        case "round_start":
          onGameStart(msg.gameId, lobby?.isSingleplayer ? "singleplayer" : "multiplayer");
          break;
        case "game_cancelled":
          setLobby(null);
          setMode("home");
          break;
        case "error":
          if (msg.code === "bad_connection") {
            setJoinError("Could not connect. Check your code and try again.");
          } else {
            setJoinError(msg.detail || "An error occurred.");
          }
          break;
      }
    },
    [playerId, onGameStart]
  );

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, handleMessage]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function send(payload: object) {
    ws?.send(JSON.stringify(payload));
  }

  function createSingleplayer() {
    send({ type: "create_game", mode: "singleplayer", playerId: playerId });
    if (ws) {
      setLobby({
        code: "......",
        players: [{ id: playerId, name: "", ready: false }],
        role: null,
        isSingleplayer: true,
      });
      setMode("waiting");
    }
  }

  function createMultiplayer() {
    send({ type: "create_game", mode: "multiplayer", playerId: playerId });
    if (ws) {
      setLobby({
        code: "......",
        players: [{ id: playerId, name: "", ready: false }],
        role: "host",
        isSingleplayer: false,
      });
      setMode("waiting");
    }
  }

  function joinMultiplayer() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError("Please enter a valid lobby code.");
      return;
    }
    send({ type: "join_game", code, playerId: playerId });
    if (ws) {
      setLobby({
        code,
        players: [
          { id: "host-demo", name: "Host", ready: true },
          { id: playerId, name: "", ready: false },
        ],
        role: "guest",
        isSingleplayer: false,
      });
      setMode("waiting");
    }
  }

  function setName() {
    const name = playerName.trim();
    if (!name) {
      setNameError("Please enter a name.");
      return;
    }
    if (name.length > 16) {
      setNameError("Name must be 16 characters or fewer.");
      return;
    }
    setNameError("");
    send({ type: "player_update", playerId: playerId, name });
    setLobby((prev) =>
      prev
        ? {
            ...prev,
            players: prev.players.map((p) =>
              p.id === playerId ? { ...p, name } : p
            ),
          }
        : prev
    );
  }

  function startGame() {
    send({ type: "start_game" });
    if (ws) onGameStart("null", "singleplayer");
  }

  function leaveLobby() {
    send({ type: "disconnect", playerId: playerId });
    setLobby(null);
    setMode("home");
    setPlayerName("");
    setJoinCode("");
    setJoinError("");
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const me = lobby?.players.find((p) => p.id === playerId);
  const maxPlayers = lobby?.isSingleplayer ? 1 : 2;
  const allNamed = lobby?.players.every((p) => p.name) ?? false;
  const lobbyFull = (lobby?.players.length ?? 0) >= maxPlayers;
  const canStart =
    allNamed && lobbyFull && (lobby?.role === "host" || lobby?.isSingleplayer);

  // If we are still waiting on the server spinning up, let the user know
  if (!wsReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50">
          <img src="/PetrGuessr.png" alt="PetrGuessr" className="mx-auto h-16 object-contain" />
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-10 text-center max-w-sm w-full mx-4">
            <div className="h-1.5 w-full bg-linear-to-r from-primary via-primary-light to-accent rounded-t-sm -mt-10 mb-8" />
            {wsError ? (
              <>
                <p className="text-3xl mb-4">⚠️</p>
                <p className="font-mono font-bold text-foreground mb-1">Connection failed</p>
                <p className="font-mono text-xs text-muted">
                  The server may be unavailable. Please refresh and try again.
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-4 animate-bounce">🔄</p>
                <p className="font-mono font-bold text-foreground mb-1">Waking up the server…</p>
                <p className="font-mono text-xs text-muted">
                  Server spins down after inactivity. This usually takes 30–60 seconds.
                </p>
                <div className="mt-6 flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full bg-card shadow-sm py-4 fixed top-0 left-0 z-50">
        <img
          src="/PetrGuessr.png"
          alt="PetrGuessr"
          className="mx-auto h-16 object-contain"
        />
      </header>

      <main className="flex-1 flex items-center justify-center pt-28 pb-12 px-4">
        <div className="w-full max-w-md">
          {mode === "home" && (
            <div className="animate-[fade-in_0.5s_ease-out_forwards]">
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="h-1.5 w-full bg-linear-to-r from-primary via-primary-light to-accent" />

                <div className="p-8">
                  <h2 className="font-mono text-2xl font-bold text-foreground mb-1 text-glow tracking-tight">
                    Select Mode
                  </h2>
                  <p className="font-mono text-sm text-muted mb-8">
                    How do you want to play?
                  </p>

                  <button
                    onClick={createSingleplayer}
                    className="w-full group relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 p-5 text-left transition-all duration-300 hover:bg-primary hover:shadow-[0_0_20px_rgba(0,100,164,0.3)] mb-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🎓</span>
                      <div>
                        <p className="font-mono font-bold text-foreground group-hover:text-white text-base transition-colors">
                          Singleplayer
                        </p>
                        <p className="font-mono text-xs text-muted group-hover:text-primary-foreground/70 transition-colors mt-0.5">
                          How well do you know UCI?
                        </p>
                      </div>
                    </div>
                  </button>

                  <GlowDivider />

                  <button
                    onClick={() => setMode("multiplayer-create")}
                    className="w-full group relative overflow-hidden rounded-xl border-2 border-accent bg-accent/5 p-5 text-left transition-all duration-300 hover:bg-accent hover:shadow-[0_0_20px_rgba(255,210,0,0.3)] mb-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🏟️</span>
                      <div>
                        <p className="font-mono font-bold text-foreground text-base group-hover:text-accent-foreground transition-colors">
                          Multiplayer - Create Lobby
                        </p>
                        <p className="font-mono text-xs text-muted group-hover:text-accent-foreground/70 transition-colors mt-0.5">
                          Host a multiplayer match
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("multiplayer-join")}
                    className="w-full group relative overflow-hidden rounded-xl border-2 border-border bg-card p-5 text-left transition-all duration-300 hover:border-primary-light hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🔗</span>
                      <div>
                        <p className="font-mono font-bold text-foreground text-base">
                          Multiplayer -  Join Lobby
                        </p>
                        <p className="font-mono text-xs text-muted mt-0.5">
                          Enter a code to join a friend
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "multiplayer-create" && (
            <div className="animate-[fade-in_0.4s_ease-out_forwards]">
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="h-1.5 w-full bg-linear-to-r from-accent via-accent-light to-accent-dark" />
                <div className="p-8">
                  <button
                    onClick={() => setMode("home")}
                    className="font-mono text-xs text-muted hover:text-primary transition-colors mb-6 flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h2 className="font-mono text-2xl text-glow font-bold text-foreground mb-1 tracking-tight">
                    Create Lobby
                  </h2>
                  <p className="font-mono text-sm text-muted mb-8">
                    Host a 1v1 match — share your code with a friend.
                  </p>

                  <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 mb-6 text-left">
                    <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
                      Lobby Info
                    </p>
                    <ul className="space-y-1.5">
                      {["Max 2 players (you + 1 friend)", "Both players must set a name to start", "The host controls the start button"].map((item) => (
                        <li key={item} className="font-mono text-sm text-foreground flex items-start gap-2">
                          <span className="text-accent mt-0.5">✦</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button onClick={createMultiplayer} className="button2 w-full text-center">
                    Create Lobby →
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "multiplayer-join" && (
            <div className="animate-[fade-in_0.4s_ease-out_forwards]">
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="h-1.5 w-full bg-linear-to-r from-primary-light via-primary to-primary-dark" />
                <div className="p-8">
                  <button
                    onClick={() => { setMode("home"); setJoinError(""); }}
                    className="font-mono text-xs text-muted hover:text-primary transition-colors mb-6 flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h2 className="font-mono text-2xl font-bold text-foreground mb-1 tracking-tight">
                    Join Lobby
                  </h2>
                  <p className="font-mono text-sm text-muted mb-8">
                    Enter the code your friend shared with you.
                  </p>

                  <label className="font-mono text-xs text-muted uppercase tracking-widest block mb-2 text-left">
                    Lobby Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setJoinError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && joinMultiplayer()}
                    placeholder="e.g. AB12CD"
                    maxLength={8}
                    className="input-default input-glow text-center text-xl tracking-[0.3em] uppercase mb-1"
                  />
                  {joinError && (
                    <p className="font-mono text-xs text-red-500 mb-4 text-left">{joinError}</p>
                  )}

                  <div className="mt-4">
                    <button onClick={joinMultiplayer} className="button1 w-full text-center">
                      Join Game →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "waiting" && lobby && (
            <div className="animate-[fade-in_0.4s_ease-out_forwards]">
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="h-1.5 w-full bg-linear-to-r from-primary via-primary-light to-accent" />
                <div className="p-8">

                  <div className="flex items-start justify-between mb-6">
                    <div className="text-left">
                      <h2 className="font-mono text-xl font-bold text-foreground tracking-tight">
                        {lobby.isSingleplayer ? "Singleplayer Lobby" : "Multiplayer Lobby"}
                      </h2>
                      <p className="font-mono text-xs text-muted mt-0.5">
                        {lobby.isSingleplayer
                          ? "Set your name and start when ready."
                          : lobby.role === "host"
                          ? "Share your code — then start when both players are named."
                          : "Waiting for the host to start the game…"}
                      </p>
                    </div>
                    <button
                      onClick={leaveLobby}
                      className="font-mono text-xs text-muted hover:text-red-500 transition-colors mt-1"
                    >
                      ✕ Leave
                    </button>
                  </div>

                  {lobby && !lobby.isSingleplayer && (
                    <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                      <div className="text-left">
                        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">
                          Lobby Code
                        </p>
                        <p className="font-mono text-2xl font-bold text-primary tracking-[0.25em]">
                          {lobby.code}
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(lobby.code)}
                        title="Copy code"
                        className="font-mono text-xs text-primary hover:text-accent transition-colors border border-primary/30 rounded-lg px-3 py-2 hover:bg-accent/10"
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  <GlowDivider />

                  <div className="text-left mb-4">
                    <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
                      Players ({lobby.players.length}/{maxPlayers})
                    </p>
                    <div className="space-y-2">
                      {lobby.players.map((p) => (
                        <PlayerSlot
                          key={p.id}
                          player={p}
                          isYou={p.id === playerId}
                          maxPlayers={maxPlayers}
                        />
                      ))}
                      {Array.from({ length: maxPlayers - lobby.players.length }).map((_, i) => (
                        <PlayerSlot key={`empty-${i}`} isEmpty maxPlayers={maxPlayers} />
                      ))}
                    </div>
                  </div>

                  <GlowDivider />

                  {!me?.name ? (
                    <div className="text-left">
                      <label className="font-mono text-xs text-muted uppercase tracking-widest block mb-2">
                        Your Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={playerName}
                          onChange={(e) => { setPlayerName(e.target.value); setNameError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && setName()}
                          placeholder="Enter your name…"
                          maxLength={16}
                          className="input-default input-glow flex-1 mb-0"
                        />
                        <button onClick={setName} className="button1 whitespace-nowrap">
                          Set →
                        </button>
                      </div>
                      {nameError && (
                        <p className="font-mono text-xs text-red-500 mt-1">{nameError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 text-left mb-4">
                      <span className="text-green-500 text-lg">✓</span>
                      <div>
                        <p className="font-mono text-sm font-bold text-green-700">
                          Playing as <span className="text-primary">{me.name}</span>
                        </p>
                        <button
                          onClick={() => setLobby((prev) => prev ? { ...prev, players: prev.players.map((p) => p.id === playerId ? { ...p, name: "" } : p) } : prev)}
                          className="font-mono text-xs text-muted hover:text-primary transition-colors"
                        >
                          Change name
                        </button>
                      </div>
                    </div>
                  )}

                  {(lobby.isSingleplayer || lobby.role === "host") && (
                    <button
                      onClick={startGame}
                      disabled={!canStart}
                      className={`w-full font-mono font-bold py-3 rounded-xl transition-all duration-300 mt-4 text-base tracking-wide ${
                        canStart
                          ? "bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] shadow-[0_0_20px_rgba(0,100,164,0.25)] cursor-pointer"
                          : "bg-border text-muted cursor-not-allowed opacity-60"
                      }`}
                    >
                      {canStart
                        ? "▶ Start Game"
                        : !me?.name
                        ? "Set your name to continue"
                        : !lobbyFull
                        ? "Waiting for players…"
                        : "All players must set a name"}
                    </button>
                  )}

                  {lobby.role === "guest" && (
                    <div className="mt-4 font-mono text-sm text-muted text-center animate-pulse-subtle">
                      Waiting for host to start…
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
