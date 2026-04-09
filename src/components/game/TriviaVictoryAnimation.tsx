'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VictoryAnimationProps {
  winner: {
    playerId: string;
    playerName: string;
    avatar: string;
    avatarColor?: string;
    score: number;
    trackPosition: number;
  };
  allPlayers: Array<{
    playerId: string;
    playerName: string;
    avatar: string;
    score: number;
    trackPosition: number;
  }>;
  onComplete?: () => void;
}

export function TriviaVictoryAnimation({ winner, allPlayers, onComplete }: VictoryAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowConfetti(true), 500);
    setTimeout(() => setShowWinner(true), 1000);
    
    if (onComplete) {
      setTimeout(onComplete, 7000);
    }
  }, [onComplete]);

  const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 bg-stars pointer-events-none" />

      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(60)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'][Math.floor(Math.random() * 5)],
              }}
              animate={{
                y: [0, typeof window !== 'undefined' ? window.innerHeight + 50 : 900],
                x: [0, (Math.random() - 0.5) * 150],
                rotate: [0, Math.random() * 720],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center px-4 w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          className="text-6xl mb-3"
        >
          🏆
        </motion.div>

        {showWinner && (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-black text-white mb-2 drop-shadow-2xl"
            >
              VITTORIA!
            </motion.h1>

            {/* Winner avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.3 }}
              className="mb-3"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 5, 0], scale: [1, 1.05, 1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl border-4 border-yellow-300 mx-auto"
                style={{
                  backgroundColor: winner.avatarColor || '#FF6B6B',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)'
                }}
              >
                {getAvatarEmoji(winner.avatar)}
              </motion.div>
            </motion.div>

            {/* Winner name */}
            <motion.h2
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-black text-yellow-300 mb-2 drop-shadow-2xl"
            >
              {winner.playerName}
            </motion.h2>

            {/* Score card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="glass-card inline-block px-8 py-3 mb-4"
            >
              <div className="text-sm text-purple-200 mb-0.5">Punteggio Finale</div>
              <div className="text-3xl font-black text-yellow-300">
                {winner.score} punti
              </div>
            </motion.div>

            {/* Leaderboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="w-full"
            >
              <div className="glass-card p-3 space-y-1.5">
                {sortedPlayers.slice(0, 5).map((p, i) => (
                  <div key={p.playerId} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ${i === 0 ? 'bg-yellow-500/15 border border-yellow-400/20' : 'bg-white/[0.03]'}`}>
                    <span className="text-sm font-black text-white/40 w-5 text-center">
                      {i === 0 ? '👑' : `${i + 1}`}
                    </span>
                    <span className="text-lg">{getAvatarEmoji(p.avatar)}</span>
                    <span className={`text-sm font-bold flex-1 text-left truncate ${i === 0 ? 'text-yellow-300' : 'text-white/70'}`}>
                      {p.playerName}
                    </span>
                    <span className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-white/50'}`}>
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-base text-purple-200 font-bold mt-3"
            >
              Il Sapiente del Branco! 🐺
            </motion.p>
          </>
        )}

        {/* Sparkles */}
        {showWinner && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + Math.random() * 70}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  repeatDelay: Math.random() * 3
                }}
              >
                <div className="text-3xl">✨</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Glowing ring */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-64 h-64 rounded-full border-2 border-yellow-400/50" />
        </motion.div>
      </div>
    </div>
  );
}

function getAvatarEmoji(avatarName: string): string {
  const avatars: Record<string, string> = {
    'Lupo': '🐺',
    'Pecora': '🐑',
    'Maiale': '🐷',
    'Volpe': '🦊',
    'Orso': '🐻',
    'Leone': '🦁',
    'Tigre': '🐯',
    'Panda': '🐼',
    'Coniglio': '🐰',
    'Gatto': '🐱',
    'Cane': '🐶',
    'Unicorno': '🦄',
    'Drago': '🐲',
    'Gufo': '🦉',
    'Pinguino': '🐧',
  };
  return avatars[avatarName] || '🐺';
}
