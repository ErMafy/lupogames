// 🐺 LUPO GAMES - Lobby Pre-Game
// Dove i giocatori aspettano che l'host inizi il gioco

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  avatar: string | null;
  avatarColor: string | null;
  isHost: boolean;
  isConnected: boolean;
}

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room')?.toUpperCase();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

  // Load player data
  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const storedPlayer = localStorage.getItem('lupo_player');
        if (!storedPlayer) {
          router.push('/');
          return;
        }

        const playerData = JSON.parse(storedPlayer);
        setPlayer(playerData);

        // Fetch room data
        const response = await fetch(`/api/rooms?code=${roomCode}`);
        const data = await response.json();
        
        if (data.success) {
          setRoomData(data.data);
          setPlayers(data.data.players || []);
        }
      } catch (err) {
        setError('Errore nel caricamento della stanza');
      } finally {
        setIsLoading(false);
      }
    };

    if (roomCode) {
      loadPlayerData();
    }
  }, [roomCode, router]);

  const onRealtimeGame = useCallback(
    (eventName: string) => {
      if (eventName === 'game-started' && roomCode) {
        router.push(`/play/${roomCode}`);
      }
    },
    [roomCode, router]
  );

  usePresenceChannel({
    roomCode: roomCode ?? '',
    playerId: player?.id ?? '',
    playerName: player?.name ?? '',
    isHost: Boolean(player?.isHost),
    onGameEvent: onRealtimeGame,
  });

  // Listen for game start
  useEffect(() => {
    if (!roomCode) return;

    const handleGameStarted = (data: any) => {
      // Tutti vanno al controller mobile
      router.push(`/play/${roomCode}`);
    };

    // Poll room status
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms?code=${roomCode}`);
        const data = await response.json();
        
        if (data.success && data.data.room?.status === 'PLAYING') {
          handleGameStarted({});
        }
        
        if (data.success) {
          setPlayers(data.data.players || []);
        }
      } catch (err) {
        console.error('Error polling room:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, router]);

  const startGame = async () => {
    if (!player?.isHost) return;
    // Tutti vanno al controller, anche l'host
    router.push(`/play/${roomCode}`);
  };

  const shareInviteLink = () => {
    const link = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(link);
    alert('Link copiato! Condividilo con i tuoi amici 🐺');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-white mb-4">{error || 'Stanza non trovata'}</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      {/* Stars background */}
      <div className="fixed inset-0 bg-stars pointer-events-none opacity-50" />
      
      <div className="relative z-10 max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <div className="text-7xl">🐺</div>
          </motion.div>
          
          <h1 className="text-5xl font-black text-white mb-4 drop-shadow-2xl">
            LUPO GAMES
          </h1>
          
          {/* Room Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card inline-block px-8 py-4 mb-6"
          >
            <p className="text-sm text-purple-300 mb-1">Codice Stanza</p>
            <p className="text-5xl font-black text-white tracking-wider">
              {roomCode}
            </p>
          </motion.div>

          {/* Share button */}
          <div className="mb-8">
            <button
              onClick={shareInviteLink}
              className="btn-secondary flex items-center gap-2 mx-auto"
            >
              <span>📤</span>
              <span>Condividi Link</span>
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Giocatori nella Lobby ({players.length})
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {players.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    glass-card p-4 text-center
                    ${p.isHost ? 'ring-2 ring-yellow-400' : ''}
                  `}
                >
                  {p.isHost && (
                    <div className="text-xs font-bold text-yellow-400 mb-1">
                      👑 HOST
                    </div>
                  )}
                  
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-4xl border-2 border-white/20"
                    style={{ backgroundColor: p.avatarColor || '#FF6B6B' }}
                  >
                    {getAvatarEmoji(p.avatar)}
                  </div>
                  
                  <div className="text-white font-medium text-sm truncate">
                    {p.name}
                  </div>
                  
                  <div className={`
                    w-2 h-2 rounded-full mx-auto mt-2
                    ${p.isConnected ? 'bg-green-400' : 'bg-red-400'}
                  `} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center">
          {player?.isHost ? (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="btn-primary text-2xl px-12 py-6"
              >
                🎮 Inizia il Gioco!
              </motion.button>
              
              <p className="text-purple-300 text-sm mt-4">
                📱 Giocherai dal tuo telefono come tutti gli altri!
              </p>
            </>
          ) : (
            <div className="glass-card inline-block px-8 py-4">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="text-purple-300 text-xl"
              >
                In attesa che l'host inizi...
              </motion.div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-12 text-center text-purple-300 text-sm">
          <p>💡 Assicurati che tutti abbiano scelto un avatar prima di iniziare!</p>
          <p className="mt-2">📱 I giocatori useranno il loro telefono come controller</p>
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    }>
      <LobbyContent />
    </Suspense>
  );
}

// Helper per ottenere l'emoji dell'avatar
function getAvatarEmoji(avatarName: string | null): string {
  if (!avatarName) return '🐺';
  
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
