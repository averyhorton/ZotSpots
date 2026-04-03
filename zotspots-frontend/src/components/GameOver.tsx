import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import type { GameOverMsg } from "./GameBoard";

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

const RestartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const MedalIcon = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
    <circle cx="12" cy="12" r="6" fill="rgba(255,255,255,0.2)"/>
  </svg>
);

export interface GameOverPanelProps {
  finalScores: GameOverMsg | null;
  singleplayer?: boolean;
}

const ConfettiParticles = ({ trigger }: { trigger: boolean }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; delay: number; duration: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const prefs = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefs.matches) return;

    const colors = ["#FFD200", "#0064A4", "#FFFFFF", "#4A9FD4"];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600 - 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
      duration: 1.5 + Math.random() * 2
    }));
    setParticles(newParticles);
  }, [trigger]);

  if (particles.length === 0 || !trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            backgroundColor: p.color,
            '--startX': '0px',
            '--startY': '0px',
            '--endX': `${p.x}px`,
            '--endY': `${p.y}px`,
            animation: `confetti-burst ${p.duration}s ease-out ${p.delay}s forwards`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

interface PlayerData { id: string; name: string; score: number; }

const PodiumBar = ({ player, position, finalHeight, delay, isWinner }: { player?: PlayerData, position: number, finalHeight: string, delay: number, isWinner: boolean }) => {
  if (!player) return <div className="w-24 md:w-32 mx-2 opacity-0" />;

  const medalColor = position === 1 ? "#FFD200" : position === 2 ? "#C0C0C0" : "#CD7F32";
  const bgClass = isWinner ? "bg-linear-to-t from-primary-dark via-primary to-accent border-t-2 border-accent/50 shadow-[0_-10px_40px_rgba(255,210,0,0.4)]" : "bg-linear-to-t from-black/80 via-black/60 to-white/10 border-t border-white/20";
  const numberClass = isWinner ? "text-black/30" : "text-white/20";
  
  return (
    <div className="flex flex-col items-center justify-end mx-1 md:mx-3 relative z-10 w-24 md:w-36 h-full">
      {/* Player info fixed height container */}
      <div className="flex flex-col items-center justify-end h-36 mb-2 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.6, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {isWinner && (
             <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 1, filter: "drop-shadow(0 0 15px rgba(255,210,0,0.8))" }}
               transition={{ delay: delay + 1.2, type: "spring" }}
               className="text-accent mb-2"
             >
               <TrophyIcon />
             </motion.div>
          )}
          <div className="flex items-center gap-1.5 mb-1 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
            <MedalIcon color={medalColor} />
            <span className="font-mono font-bold text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-20">{player.name}</span>
          </div>
          <p className={`font-mono font-black ${isWinner ? 'text-2xl text-accent text-glow' : 'text-xl text-white'} tracking-tight`}>
            {player.score.toLocaleString()}
          </p>
        </motion.div>
      </div>
      
      {/* Animated Podium Bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: finalHeight }}
        transition={{ delay, duration: 0.8, type: "spring", stiffness: 60, damping: 15 }}
        className={`w-full rounded-t-xl ${bgClass} relative flex justify-center overflow-hidden shadow-2xl`}
      >
         <span className={`font-black text-6xl md:text-8xl ${numberClass} pointer-events-none select-none mt-4`}>{position}</span>
      </motion.div>
    </div>
  );
};

export default function GameOver({ finalScores, singleplayer = false }: GameOverPanelProps) {
  const isMultiplayer = !singleplayer;
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const navigate = useNavigate();
  
  const players: PlayerData[] = Object.entries(finalScores?.final_scores || {}).map(([id, data]) => ({
    id,
    name: data.name,
    score: data.score
  })).sort((a, b) => b.score - a.score);

  const me = players[0];
  const winner = isMultiplayer ? players[0] : null;

  useEffect(() => {
    if (isMultiplayer && players.length > 0) {
      // 1st place delays finish revealing around ~5s
      const confettiTimer = setTimeout(() => setShowConfetti(true), 4800);
      const remainingTimer = setTimeout(() => setShowRemaining(true), 5500);
      return () => { clearTimeout(confettiTimer); clearTimeout(remainingTimer); };
    } else {
      const remainingTimer = setTimeout(() => setShowRemaining(true), 1200);
      const confettiTimer = setTimeout(() => setShowConfetti(true), 1000);
      return () => { clearTimeout(remainingTimer); clearTimeout(confettiTimer); };
    }
  }, [isMultiplayer, players.length]);

  const handlePlayAgain = () => window.location.reload();
  const handleHome = () => {
    window.location.href = "/";
  };

  const p1 = players[0];
  const p2 = players.length > 1 ? players[1] : undefined;
  const p3 = players.length > 2 ? players[2] : undefined;
  const remainingPlayers = players.slice(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-primary-dark/95 backdrop-blur-xl overflow-hidden scrollbar-hide" style={{ overflowY: 'auto' }}>
      {/* Background UI with Spotlight */}
      <div className="fixed inset-0 min-h-screen z-0">
        <picture aria-hidden="true">
            <source media="(min-width: 768px)" srcSet="/UCI%20Map%20Desktop%20Background.png" />
            <img
                src="/UCI%20Map%20Phone%20Background.png"
                alt="UCI Map Background"
                className="absolute inset-0 w-full h-full object-cover opacity-[0.10] mix-blend-overlay"
            />
        </picture>
        
        {/* Base background */}
        <div className="absolute inset-0 bg-linear-to-b from-primary-dark/90 via-primary-dark/70 to-background/95 z-0" />
        
        {/* Darkening overlay for dramatic effect, fades out */}
        {isMultiplayer && (
           <motion.div 
             initial={{ opacity: 1 }}
             animate={{ opacity: 0 }}
             transition={{ delay: 6.5, duration: 2 }}
             className="absolute inset-0 bg-linear-to-b from-gray-900/95 via-gray-950/98 to-black z-0 pointer-events-none" 
           />
        )}
        
        {/* Spotlight Effect overlaying the podium area, not sure if it's really working but maybe helps */}
        {isMultiplayer && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 2 }}
             className="absolute -bottom-25 left-1/2 -translate-x-1/2 w-200 h-150 pointer-events-none z-0"
             style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.15) 0%, rgba(74,159,212,0.05) 50%, transparent 80%)' }}
           />
        )}
      </div>

      <ConfettiParticles trigger={showConfetti} />
      
      {/* Floating Petr Pins */}
      <img aria-hidden="true" src="/PetrGuessr%20Logo.png" alt="Petr Pin" className="hidden md:block fixed top-[15%] left-[10%] w-20 opacity-30 animate-float z-0 pointer-events-none" style={{ animationDelay: '0s' }} />
      <img aria-hidden="true" src="/PetrGuessr%20Logo.png" alt="Petr Pin" className="hidden md:block fixed bottom-[20%] right-[15%] w-24 opacity-20 animate-float z-0 pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-30 w-full max-w-4xl flex flex-col items-center min-h-full py-10 justify-center">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          {isMultiplayer ? (
            <div className="min-h-35">
              <h2 className="text-sm md:text-base font-mono text-white/50 uppercase tracking-[0.3em] font-bold mb-3">
                Final Standings
              </h2>
              {showConfetti && winner ? (
                 <motion.h1 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tight"
                 >
                   {winner.name} Wins!
                 </motion.h1>
              ) : (
                 <h1 className="text-5xl md:text-7xl font-black text-transparent opacity-0 pointer-events-none" aria-hidden="true">
                   {winner?.name || "Placeholder"} Wins!
                 </h1>
              )}
            </div>
          ) : (
            <>
              <div className="mx-auto w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center mb-4">
                <img src="/PetrGuessr%20Logo.png" alt="Locate Icon" className="w-12 h-12 object-contain" />
              </div>
              <h2 className="text-sm md:text-base font-mono text-white/70 uppercase tracking-[0.2em] font-bold mb-2">
                Singleplayer Match
              </h2>
              <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-xl mb-4 tracking-tight text-glow">
                Final Results
              </h1>
            </>
          )}
        </motion.div>

        {isMultiplayer ? (
          <div className="w-full flex flex-col items-center">
            {/* Podium */}
            <div className="flex items-end justify-center mb-12 h-100 md:h-112.5">
              <PodiumBar player={p2} position={2} finalHeight="45%" delay={2.0} isWinner={false} />
              <PodiumBar player={p1} position={1} finalHeight="75%" delay={3.6} isWinner={true} />
              <PodiumBar player={p3} position={3} finalHeight="30%" delay={0.6} isWinner={false} />
            </div>

            {/* Remaining Players List */}
            <AnimatePresence>
              {showRemaining && remainingPlayers.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl mb-12"
                >
                  <p className="font-mono text-xs text-white/40 uppercase tracking-widest block mb-4 border-b border-white/10 pb-2">
                    Other Players
                  </p>
                  <div className="space-y-2">
                    {remainingPlayers.map((p, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={p.id}
                        className="flex items-center p-3 rounded-lg bg-black/20 border border-white/5"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-mono text-xs font-bold text-white/70 mr-4">
                          {i + 4}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-mono text-base font-bold text-white/90 truncate">{p.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-white/70">
                            {p.score.toLocaleString()} <span className="text-xs font-normal opacity-50">pts</span>
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl mb-8 animate-[slide-up_0.5s_ease-out_forwards]" style={{ animationDelay: '0.4s', opacity: 0 }}>
            <div className="text-center py-6">
              <p className="font-mono text-sm text-white/60 uppercase tracking-widest mb-6">
                Total Score
              </p>
              <div className="inline-block relative">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                <h3 className="relative text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-lg text-glow animate-score-reveal">
                  {me?.score?.toLocaleString() || 0}
                </h3>
              </div>
              <p className="font-mono text-lg text-accent mt-4">
                Points Earned
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <AnimatePresence>
          {showRemaining && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl"
            >
              <button 
                onClick={handlePlayAgain}
                className="flex-1 relative group overflow-hidden px-6 py-4 bg-accent text-black font-extrabold text-lg rounded-xl shadow-lg transition-transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,210,0,0.4)] flex justify-center items-center gap-3 cursor-pointer"
              >
                 <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-12 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                 <RestartIcon />
                 Play Again
              </button>
              
              <button 
                onClick={handleHome}
                className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 font-bold text-lg rounded-xl transition-all duration-300 hover:-translate-y-1 flex justify-center items-center gap-3 backdrop-blur-sm cursor-pointer"
              >
                <HomeIcon />
                Back to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
