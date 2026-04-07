// 🐺 LUPO GAMES - Waiting for Next Game
// Pagina di attesa dopo che l'host termina il gioco

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room');
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animazione dei puntini
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      {/* Stars background */}
      <div className="fixed inset-0 bg-stars pointer-events-none opacity-50" />
      
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Lupo animato che corre */}
        <motion.div
          animate={{
            x: [0, 50, 0, -50, 0],
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-9xl mb-8"
        >
          🐺
        </motion.div>

        {/* Titolo */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl font-black text-white mb-6 drop-shadow-2xl"
        >
          Attendi il Prossimo Gioco{dots}
        </motion.h1>

        {/* Sottotitolo */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl sm:text-2xl text-purple-200 mb-12"
        >
          L'host sta scegliendo il prossimo gioco!
        </motion.p>

        {/* Room code se disponibile */}
        {roomCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-card inline-block px-8 py-4 mb-8"
          >
            <p className="text-sm text-purple-300 mb-1">Stanza</p>
            <p className="text-4xl font-black text-white tracking-wider">
              {roomCode}
            </p>
          </motion.div>
        )}

        {/* Animazione pulsante */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-purple-300 text-lg"
        >
          Preparati...
        </motion.div>

        {/* Particelle decorative */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    }>
      <WaitingContent />
    </Suspense>
  );
}
