// 🐺 LUPO GAMES - Join via Link
// Accesso rapido alla stanza tramite link condiviso

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();
  
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);

  // Verifica che la stanza esista
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const response = await fetch(`/api/rooms?code=${roomCode}`);
        const data = await response.json();
        
        if (data.success) {
          setRoomExists(true);
        } else {
          setRoomExists(false);
          setError('Stanza non trovata');
        }
      } catch (err) {
        setRoomExists(false);
        setError('Errore nella verifica della stanza');
      }
    };

    if (roomCode) {
      checkRoom();
    }
  }, [roomCode]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Inserisci il tuo nome!');
      return;
    }

    if (playerName.trim().length < 2) {
      setError('Il nome deve avere almeno 2 caratteri!');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerName: playerName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Salva i dati del giocatore
        localStorage.setItem('lupo_player', JSON.stringify(data.data.player));
        
        // Vai alla selezione avatar o lobby
        router.push(`/play/${roomCode}`);
      } else {
        setError(data.error || 'Errore durante l\'ingresso');
      }
    } catch (err) {
      setError('Errore di rete');
    } finally {
      setIsJoining(false);
    }
  };

  if (roomExists === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Verifica stanza...</div>
      </div>
    );
  }

  if (roomExists === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-white mb-4">Stanza Non Trovata</h2>
          <p className="text-purple-200 mb-6">
            La stanza <strong>{roomCode}</strong> non esiste o è stata chiusa.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      {/* Stars background */}
      <div className="fixed inset-0 bg-stars pointer-events-none opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-card p-8 max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            className="mb-4"
          >
            <Image src="/logolupo.png" alt="Lupo" width={80} height={80} className="drop-shadow-2xl" />
          </motion.div>
          
          <h1 className="text-4xl font-black text-white mb-2">
            LUPO GAMES
          </h1>
          
          <div className="glass-card inline-block px-6 py-2 mt-4">
            <p className="text-sm text-purple-300">Stanza</p>
            <p className="text-3xl font-black text-white tracking-wider">
              {roomCode}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">
              Il tuo nome
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Es: LupoAlfa"
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border-2 border-white/20 text-white placeholder-white/40 focus:border-purple-400 focus:outline-none transition-all"
              disabled={isJoining}
              autoFocus
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border-2 border-red-400 rounded-lg p-3 text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={isJoining || !playerName.trim()}
            className="btn-primary w-full text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Ingresso...' : '🎮 Entra nel Gioco!'}
          </motion.button>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-purple-300 text-sm">
          <p>📱 Userai il tuo telefono come controller</p>
          <p className="mt-2">🎉 Preparati a divertirti!</p>
        </div>
      </motion.div>
    </div>
  );
}
