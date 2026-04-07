// 🐺 LUPO GAMES - Animazione Vittoria Trivia EPICA
// "Chi è il più intelligente del branco?"

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
    // Timeline dell'animazione
    setTimeout(() => setShowConfetti(true), 500);
    setTimeout(() => setShowWinner(true), 1000);
    
    // Chiama onComplete dopo 7 secondi
    if (onComplete) {
      setTimeout(onComplete, 7000);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center overflow-hidden">
      {/* Stars background */}
      <div className="fixed inset-0 bg-stars pointer-events-none" />

      {/* Confetti particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'][Math.floor(Math.random() * 5)],
              }}
              animate={{
                y: [0, window.innerHeight + 50],
                x: [0, (Math.random() - 0.5) * 200],
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

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Trophy animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.3 
          }}
          className="text-9xl mb-8"
        >
          🏆
        </motion.div>

        {/* Winner announcement */}
        {showWinner && (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-6xl sm:text-8xl font-black text-white mb-4 drop-shadow-2xl"
            >
              VITTORIA!
            </motion.h1>

            {/* Winner's pedina */}
            <motion.div
              initial={{ scale: 0, x: -200 }}
              animate={{ scale: 1.5, x: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 10,
                delay: 0.3
              }}
              className="inline-block mb-6"
            >
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className="w-40 h-40 rounded-full flex items-center justify-center text-8xl shadow-2xl border-8 border-yellow-300"
                style={{ 
                  backgroundColor: winner.avatarColor || '#FF6B6B',
                  boxShadow: '0 0 60px rgba(255, 215, 0, 0.8)'
                }}
              >
                {getAvatarEmoji(winner.avatar)}
              </motion.div>
            </motion.div>

            {/* Winner's name */}
            <motion.h2
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-5xl sm:text-7xl font-black text-yellow-300 mb-4 drop-shadow-2xl"
            >
              {winner.playerName}
            </motion.h2>

            {/* Score */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="glass-card inline-block px-12 py-6 mb-8"
            >
              <div className="text-2xl text-purple-200 mb-2">Punteggio Finale</div>
              <div className="text-6xl font-black text-yellow-300">
                {winner.score} punti
              </div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-2xl sm:text-3xl text-purple-200 font-bold"
            >
              Il Sapiente del Branco! 🐺
            </motion.p>
          </>
        )}

        {/* Fireworks effect */}
        {showWinner && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 2, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  repeatDelay: Math.random() * 3
                }}
              >
                <div className="text-6xl">✨</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Glowing rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <div className="w-96 h-96 rounded-full border-4 border-yellow-400" />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 2.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: 0.5,
          }}
        >
          <div className="w-96 h-96 rounded-full border-4 border-pink-400" />
        </motion.div>
      </div>
    </div>
  );
}

// Helper per ottenere l'emoji dell'avatar
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
