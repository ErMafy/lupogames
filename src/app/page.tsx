// 🐺 LUPO GAMES - Homepage PREMIUM
// Il punto di partenza per serate LEGGENDARIE!

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Particelle decorative animate - valori deterministici per evitare hydration mismatch
const PARTICLES = [
  { w: 15, h: 12, l: 20, t: 30, c: '#8B5CF6', d: 6.5, dl: 1.2 },
  { w: 22, h: 18, l: 45, t: 15, c: '#EC4899', d: 7.8, dl: 2.5 },
  { w: 10, h: 14, l: 70, t: 55, c: '#3B82F6', d: 8.2, dl: 0.8 },
  { w: 18, h: 20, l: 85, t: 25, c: '#F59E0B', d: 6.9, dl: 3.1 },
  { w: 12, h: 16, l: 30, t: 70, c: '#8B5CF6', d: 7.4, dl: 1.8 },
  { w: 20, h: 15, l: 60, t: 85, c: '#EC4899', d: 8.6, dl: 4.2 },
  { w: 14, h: 22, l: 10, t: 45, c: '#3B82F6', d: 7.1, dl: 0.5 },
  { w: 16, h: 12, l: 92, t: 60, c: '#F59E0B', d: 6.3, dl: 2.8 },
  { w: 24, h: 20, l: 55, t: 40, c: '#8B5CF6', d: 9.0, dl: 1.5 },
  { w: 11, h: 18, l: 25, t: 90, c: '#EC4899', d: 7.7, dl: 3.8 },
  { w: 19, h: 14, l: 78, t: 12, c: '#3B82F6', d: 8.4, dl: 0.3 },
  { w: 13, h: 21, l: 40, t: 65, c: '#F59E0B', d: 6.8, dl: 2.1 },
];

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: p.w,
            height: p.h,
            left: `${p.l}%`,
            top: `${p.t}%`,
            background: `linear-gradient(135deg, ${p.c}, transparent)`,
            animation: `float ${p.d}s ease-in-out infinite`,
            animationDelay: `${p.dl}s`,
          }}
        />
      ))}
    </div>
  );
}

// Anelli decorativi rotanti
function DecorativeRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <div 
        className="absolute w-[600px] h-[600px] border border-purple-500/10 rounded-full animate-rotate-slow"
        style={{ animationDuration: '40s' }}
      />
      <div 
        className="absolute w-[800px] h-[800px] border border-pink-500/10 rounded-full animate-rotate-slow"
        style={{ animationDuration: '60s', animationDirection: 'reverse' }}
      />
      <div 
        className="absolute w-[1000px] h-[1000px] border border-blue-500/5 rounded-full animate-rotate-slow"
        style={{ animationDuration: '80s' }}
      />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('join');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateRoom = async () => {
    if (!hostName.trim()) {
      setError('Inserisci il tuo nome, campione!');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: hostName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('lupo_player', JSON.stringify(data.data.hostPlayer));
        localStorage.setItem('lupo_room', JSON.stringify(data.data.room));
        router.push(`/host/${data.data.room.code}`);
      } else {
        setError(data.error || 'Errore nella creazione della stanza');
      }
    } catch {
      setError('Errore di connessione. Riprova!');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim() || !playerName.trim()) {
      setError('Inserisci sia il codice che il tuo nome!');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: joinCode.trim().toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('lupo_player', JSON.stringify(data.data.player));
        localStorage.setItem('lupo_room', JSON.stringify(data.data.room));
        router.push(`/play/${data.data.room.code}`);
      } else {
        setError(data.error || 'Errore nell\'entrare nella stanza');
      }
    } catch {
      setError('Errore di connessione. Riprova!');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Background effects */}
      <div className="bg-stars" />
      <FloatingParticles />
      <DecorativeRings />
      
      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center w-full max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo Premium */}
        <div className="text-center mb-10">
          <div className="relative inline-block animate-float">
            {/* Glow effect dietro il logo */}
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-30 animate-gradient" />
            
            <h1 className="relative text-7xl sm:text-9xl font-black text-white drop-shadow-2xl">
              <span className="inline-block hover:scale-110 transition-transform cursor-default">🐺</span>
            </h1>
            
            <h2 className="relative text-5xl sm:text-6xl font-black tracking-tight">
              <span className="text-gradient">LUPO</span>
            </h2>
            
            <h3 className="relative text-3xl sm:text-4xl font-bold mt-1">
              <span className="text-gradient-gold">GAMES</span>
            </h3>
          </div>
          
          <p className="text-purple-200/80 mt-6 text-lg font-medium tracking-wide">
            Party games per serate <span className="text-gradient font-bold">LEGGENDARIE</span> 🎮
          </p>
        </div>

        {/* Card Premium */}
        <div className="glass-card glass-card-hover w-full p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          {/* Tab Switcher Premium */}
          <div className="flex mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => { setActiveTab('join'); setError(null); }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">🎮</span>
              Gioca
            </button>
            <button
              onClick={() => { setActiveTab('host'); setError(null); }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'host'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">📺</span>
              Crea Stanza
            </button>
          </div>

          {/* Errore Animato */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-center font-medium animate-shake backdrop-blur-sm">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          {/* Form Join */}
          {activeTab === 'join' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <label className="block text-purple-200/90 text-sm font-semibold mb-3 uppercase tracking-wider">
                  Codice Stanza
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="LUPO"
                  className="input-lupo text-center text-3xl tracking-[0.3em] font-black uppercase"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-purple-200/90 text-sm font-semibold mb-3 uppercase tracking-wider">
                  Il tuo Nome
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Come ti chiami?"
                  className="input-lupo text-lg"
                  maxLength={20}
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className="btn-lupo w-full text-xl py-5"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Entro...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🚀 Entra nella Stanza
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Form Host */}
          {activeTab === 'host' && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-purple-200/90 font-medium">
                  <span className="text-2xl mr-2">📺</span>
                  Apri questa pagina sul <span className="text-gradient font-bold">PC o TV</span> per il tabellone!
                </p>
              </div>
              <div>
                <label className="block text-purple-200/90 text-sm font-semibold mb-3 uppercase tracking-wider">
                  Il tuo Nome (Host)
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Tu sei il Game Master!"
                  className="input-lupo text-lg"
                  maxLength={20}
                />
              </div>
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="btn-lupo w-full text-xl py-5"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Creo la Stanza...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    ✨ Crea Nuova Stanza
                  </span>
                )}
              </button>
              <p className="text-purple-300/50 text-sm text-center font-medium">
                Riceverai un codice di 4 lettere da condividere 🔐
              </p>
            </div>
          )}
        </div>

        {/* Footer Premium */}
        <div className="mt-10 text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-4 text-purple-300/60 text-sm font-medium">
            <span className="flex items-center gap-1">
              <span>👥</span> 2-15 giocatori
            </span>
            <span className="w-1 h-1 bg-purple-500/40 rounded-full" />
            <span className="flex items-center gap-1">
              <span>📱</span> No app
            </span>
            <span className="w-1 h-1 bg-purple-500/40 rounded-full" />
            <span className="flex items-center gap-1">
              <span>🎉</span> 100% divertimento
            </span>
          </div>
          <p className="text-purple-400/30 text-xs mt-4 font-medium tracking-wider">
            LUPO GAMES © {new Date().getFullYear()} • made by thewolf
          </p>
        </div>
      </div>
    </div>
  );
}
