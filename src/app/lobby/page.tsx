// 🐺 LUPO GAMES - Lobby Pre-Game
// Dove i giocatori aspettano che l'host inizi il gioco

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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

const GAME_INFO: { emoji: string; title: string; subtitle: string }[] = [
  { emoji: '🧠', title: 'La Corsa del Sapere', subtitle: 'Quiz • 10 domande • 30 sec' },
  { emoji: '💬', title: 'Continua la Frase', subtitle: '5 round • 45+45 sec' },
  { emoji: '🕵️', title: 'Chi è Stato?', subtitle: '5 round • 45+45 sec' },
  { emoji: '🗑️', title: 'Swipe Trash', subtitle: '5 round • 20 sec' },
  { emoji: '⚖️', title: 'Il Tribunale del Popolo', subtitle: '5 round • 30+20+20 sec' },
  { emoji: '💣', title: 'La Bomba', subtitle: '5 round • 30 sec' },
  { emoji: '🌡️', title: 'Il Termometro del Disagio', subtitle: '5 round • 25 sec' },
  { emoji: '🐑', title: 'Mente di Gregge', subtitle: '5 round • 25 sec' },
  { emoji: '🦎', title: 'Il Camaleonte', subtitle: '5 round • 30+8+25 sec' },
  { emoji: '⚡', title: 'Lo Spacca-Stanza', subtitle: '5 round • 30+25 sec' },
  { emoji: '📝', title: 'Colloquio Disperato', subtitle: '3 round • 40+30+25 sec' },
];

const GAME_DETAILS: Record<string, string> = {
  'La Corsa del Sapere': 'Rispondi a domande di cultura generale prima degli altri! 4 opzioni, 1 risposta giusta, 30 secondi per decidere. Più sei veloce, più punti guadagni!',
  'Continua la Frase': 'Ti diamo l\'inizio di una frase assurda e tu la completi. Poi tutti votano la risposta più divertente.',
  'Chi è Stato?': 'Uno scrive un segreto anonimo. Gli altri devono indovinare chi l\'ha scritto. Bluffa o confessa!',
  'Swipe Trash': 'Il termometro dell\'indignazione! Concetti controversi, vota SÌ o NO. Chi vota con la maggioranza prende punti.',
  'Il Tribunale del Popolo': 'Una domanda infame, tutti votano in segreto. Chi prende più voti diventa l\'Imputato e deve difendersi!',
  'La Bomba': 'La patata bollente digitale! Hai la bomba? Scrivi una parola nella categoria e passala. Chi ce l\'ha quando esplode perde!',
  'Il Termometro del Disagio': 'Un concetto, uno slider da 0 a 100. Più ti avvicini alla media del gruppo, più punti fai.',
  'Mente di Gregge': 'Una categoria, una risposta. Solo chi scrive la stessa cosa della maggioranza prende punti.',
  'Il Camaleonte': 'Tutti conoscono la parola segreta tranne il Camaleonte. Scrivi un indizio senza farti scoprire!',
  'Lo Spacca-Stanza': 'Completa un dilemma e tutti votano. Fai più punti se spacchi il gruppo esattamente a metà!',
  'Colloquio Disperato': 'Rispondi a domande, poi le parole vengono mischiate. Crea la frase migliore e vota!',
};

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room')?.toUpperCase();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; emoji: string } | null>(null);

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
    const url = `${window.location.origin}/?join=${roomCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Lupo Games', text: `Unisciti alla mia stanza su Lupo Games! Codice: ${roomCode}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copiato! Condividilo con i tuoi amici 🐺');
      }).catch(() => {});
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
      {/* Stars background */}
      <div className="fixed inset-0 bg-stars pointer-events-none opacity-50" />
      
      <div className="relative z-10 max-w-4xl mx-auto pt-6">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Image src="/logolupo.png" alt="Lupo" width={120} height={120} className="drop-shadow-2xl" />
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

        {/* Game Cards — solo info, non avviabili */}
        <div className="glass-card p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
            <span>🎯</span> Giochi Disponibili
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {GAME_INFO.map(g => (
              <button key={g.title} type="button" onClick={() => setInfoModal(g)}
                className="glass-card p-3 text-center active:scale-95 transition-transform hover:bg-white/[0.06]">
                <div className="text-2xl mb-1">{g.emoji}</div>
                <div className="text-white font-bold text-[11px] leading-tight">{g.title}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{g.subtitle}</div>
              </button>
            ))}
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

      {/* Game Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={() => setInfoModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-[24px] p-[1px]" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-purple-500/50 via-white/[0.08] to-pink-500/30" />
            <div className="relative rounded-[23px] bg-[#0c0c20]/97 backdrop-blur-2xl overflow-hidden p-6">
              <button type="button" onClick={() => setInfoModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/40 text-sm active:scale-90 transition-transform">✕</button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/15 border border-white/[0.08] flex items-center justify-center text-3xl mb-4">{infoModal.emoji}</div>
              <h3 className="text-white font-black text-lg mb-3 pr-8">{infoModal.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{GAME_DETAILS[infoModal.title] || ''}</p>
            </div>
          </div>
        </div>
      )}
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
