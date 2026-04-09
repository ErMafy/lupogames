'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const GAMES = [
  { emoji: '🧠', name: 'La Corsa del Sapere', color: 'from-blue-500 to-cyan-400' },
  { emoji: '💬', name: 'Continua la Frase', color: 'from-pink-500 to-rose-400' },
  { emoji: '🕵️', name: 'Chi è Stato?', color: 'from-purple-500 to-violet-400' },
  { emoji: '🗑️', name: 'Swipe Trash', color: 'from-orange-500 to-amber-400' },
  { emoji: '⚖️', name: 'Il Tribunale', color: 'from-red-600 to-orange-500' },
  { emoji: '💣', name: 'La Bomba', color: 'from-gray-600 to-red-600' },
  { emoji: '🌡️', name: 'Termometro', color: 'from-cyan-500 to-blue-500' },
  { emoji: '🐑', name: 'Mente di Gregge', color: 'from-green-500 to-emerald-400' },
  { emoji: '🦎', name: 'Il Camaleonte', color: 'from-lime-500 to-green-500' },
  { emoji: '⚡', name: 'Spacca-Stanza', color: 'from-yellow-500 to-orange-500' },
  { emoji: '📝', name: 'Colloquio Disperato', color: 'from-violet-500 to-fuchsia-500' },
];

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />;
}

function MarqueeRow({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  const items = direction === 'left' ? GAMES : [...GAMES].reverse();
  return (
    <div className="relative overflow-hidden py-2">
      <div
        className={`flex gap-3 ${
          direction === 'left' ? 'animate-[marquee_40s_linear_infinite]' : 'animate-[marquee-reverse_40s_linear_infinite]'
        }`}
        style={{ width: 'max-content' }}
      >
        {[...items, ...items].map((g, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r ${g.color} bg-opacity-10 border border-white/[0.08] backdrop-blur-sm shrink-0`}
            style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))` }}
          >
            <span className="text-xl">{g.emoji}</span>
            <span className="text-sm font-semibold text-white/80 whitespace-nowrap">{g.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-stars" />
        <div className="text-7xl animate-bounce relative z-10">🐺</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase().slice(0, 4));
      setActiveTab('join');
    }
  }, [searchParams]);

  const handleCreateRoom = useCallback(async () => {
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
  }, [hostName, router]);

  const handleJoinRoom = useCallback(async () => {
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
        setError(data.error || "Errore nell'entrare nella stanza");
      }
    } catch {
      setError('Errore di connessione. Riprova!');
    } finally {
      setIsJoining(false);
    }
  }, [joinCode, playerName, router]);

  return (
    <div className={`min-h-screen relative overflow-hidden transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-stars" />

      {/* Ambient glow orbs */}
      <GlowOrb className="w-[500px] h-[500px] -top-40 -left-40 bg-purple-600/20" />
      <GlowOrb className="w-[400px] h-[400px] top-1/3 -right-32 bg-pink-600/15" />
      <GlowOrb className="w-[350px] h-[350px] bottom-20 left-1/4 bg-blue-600/10" />

      {/* ─── HERO ─── */}
      <section className="relative z-10 flex flex-col items-center pt-16 sm:pt-24 pb-10 px-4">
        {/* Wolf icon with animated ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 scale-[1.6] rounded-full bg-gradient-to-tr from-purple-500/30 via-pink-500/20 to-transparent blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/30 border border-white/10 flex items-center justify-center backdrop-blur-sm animate-float">
            <span className="text-5xl sm:text-6xl drop-shadow-lg">🐺</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-center leading-[0.9]">
          <span className="text-gradient">LUPO</span>
          <span className="text-gradient-gold ml-2 sm:ml-4">GAMES</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-purple-200/60 font-medium text-center max-w-xs sm:max-w-sm">
          La piattaforma party game definitiva.
          <br className="hidden sm:block" />
          <span className="text-white/90 font-bold">11 minigiochi.</span>{' '}
          <span className="text-white/90 font-bold">Zero installazioni.</span>
        </p>

        {/* Stat pills */}
        <div className="flex items-center gap-2 sm:gap-3 mt-6 flex-wrap justify-center">
          {[
            { value: '11', label: 'Giochi' },
            { value: '2-15', label: 'Giocatori' },
            { value: '0€', label: 'Costo' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm"
            >
              <span className="text-lg sm:text-xl font-black text-gradient">{s.value}</span>
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── GAME MARQUEE ─── */}
      <section className="relative z-10 py-4 overflow-hidden opacity-60">
        <MarqueeRow direction="left" />
        <MarqueeRow direction="right" />
      </section>

      {/* ─── ACTION CARD ─── */}
      <section className="relative z-10 px-4 py-8 sm:py-12 flex justify-center">
        <div className="w-full max-w-md">
          {/* Glass container */}
          <div className="relative rounded-3xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
            {/* Top shimmer edge */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

            <div className="p-6 sm:p-8">
              {/* Tab Switcher */}
              <div className="flex mb-6 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setActiveTab('join'); setError(null); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                      : 'text-white/35 hover:text-white/60'
                  }`}
                >
                  🎮 Entra
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('host'); setError(null); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'host'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                      : 'text-white/35 hover:text-white/60'
                  }`}
                >
                  📺 Crea Stanza
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center text-sm font-medium animate-shake">
                  {error}
                </div>
              )}

              {/* Join form */}
              {activeTab === 'join' && (
                <div className="space-y-4 animate-fade-in-up">
                  <div>
                    <label className="block text-white/40 text-[11px] font-semibold mb-1.5 uppercase tracking-widest">
                      Codice Stanza
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="ABCD"
                      className="input-lupo text-center text-2xl sm:text-3xl tracking-[0.35em] font-black uppercase"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[11px] font-semibold mb-1.5 uppercase tracking-widest">
                      Il tuo Nome
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Come ti chiami?"
                      className="input-lupo"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={isJoining}
                    className="btn-lupo w-full text-base py-4"
                  >
                    {isJoining ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Entro...
                      </span>
                    ) : (
                      '🚀 Entra nella Stanza'
                    )}
                  </button>
                </div>
              )}

              {/* Host form */}
              {activeTab === 'host' && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/[0.06] border border-purple-400/10">
                    <span className="text-xl">📺</span>
                    <p className="text-purple-200/70 text-xs font-medium leading-snug">
                      Apri questa pagina su un <span className="text-white/90 font-bold">PC o TV</span> per il tabellone principale.
                    </p>
                  </div>
                  <div>
                    <label className="block text-white/40 text-[11px] font-semibold mb-1.5 uppercase tracking-widest">
                      Il tuo Nome
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Tu sei il Game Master!"
                      className="input-lupo"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                    className="btn-lupo w-full text-base py-4"
                  >
                    {isCreating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Creo...
                      </span>
                    ) : (
                      '✨ Crea Nuova Stanza'
                    )}
                  </button>
                  <p className="text-white/25 text-[11px] text-center font-medium">
                    Riceverai un codice da condividere con gli amici
                  </p>
                </div>
              )}
            </div>

            {/* Bottom shimmer edge */}
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-10 px-4 py-10 sm:py-16">
        <h2 className="text-center text-xl sm:text-2xl font-black text-white/90 mb-8">
          Come funziona
        </h2>
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { step: '01', icon: '📱', title: 'Crea o Entra', desc: 'Un codice di 4 lettere' },
            { step: '02', icon: '🎭', title: 'Scegli Avatar', desc: 'Personalizza il tuo alter ego' },
            { step: '03', icon: '🎉', title: 'Gioca!', desc: '11 minigiochi folli' },
          ].map((item) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
            >
              <span className="absolute -top-2.5 left-3 text-[10px] font-black text-purple-400/50 bg-[#0A0A1B] px-1.5 uppercase tracking-widest">
                {item.step}
              </span>
              <div className="text-3xl sm:text-4xl mb-2">{item.icon}</div>
              <p className="text-white/90 font-bold text-xs sm:text-sm">{item.title}</p>
              <p className="text-white/35 text-[10px] sm:text-xs mt-0.5 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 pb-10 pt-6 text-center">
        <div className="flex items-center justify-center gap-4 text-white/25 text-xs font-medium mb-3">
          <span>📱 No app</span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span>⚡ Real-time</span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span>🎉 100% Gratis</span>
        </div>
        <p className="text-white/15 text-[10px] font-medium tracking-widest uppercase">
          Lupo Games &copy; {new Date().getFullYear()} &middot; made by thewolf
        </p>
      </footer>
    </div>
  );
}
