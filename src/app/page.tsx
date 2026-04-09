'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="bg-stars" />
        <div className="text-6xl animate-bounce relative z-10">🐺</div>
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
    if (!hostName.trim()) { setError('Inserisci il tuo nome!'); return; }
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
        setError(data.error || 'Errore nella creazione');
      }
    } catch { setError('Errore di connessione.'); }
    finally { setIsCreating(false); }
  }, [hostName, router]);

  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim() || !playerName.trim()) { setError('Compila tutti i campi!'); return; }
    setIsJoining(true);
    setError(null);
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: joinCode.trim().toUpperCase(), playerName: playerName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('lupo_player', JSON.stringify(data.data.player));
        localStorage.setItem('lupo_room', JSON.stringify(data.data.room));
        router.push(`/play/${data.data.room.code}`);
      } else {
        setError(data.error || "Errore nell'entrare");
      }
    } catch { setError('Errore di connessione.'); }
    finally { setIsJoining(false); }
  }, [joinCode, playerName, router]);

  return (
    <div className={`min-h-[100dvh] flex flex-col relative overflow-hidden transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-stars" />
      <GlowOrb className="w-[400px] h-[400px] -top-32 -left-32 bg-purple-600/20" />
      <GlowOrb className="w-[300px] h-[300px] top-1/2 -right-24 bg-pink-600/15" />

      {/* ─── CONTENT ─── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 pt-[max(2rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))]">

        {/* ── TOP: Brand ── */}
        <div className="flex flex-col items-center pt-2">
          {/* Wolf + Title inline-ish */}
          <div className="relative mb-1">
            <div className="absolute inset-0 scale-[1.8] rounded-full bg-gradient-to-tr from-purple-500/25 via-pink-500/15 to-transparent blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/30 border border-white/10 flex items-center justify-center backdrop-blur-sm animate-float">
              <span className="text-3xl drop-shadow-lg">🐺</span>
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tight leading-none">
            <span className="text-gradient">LUPO</span>
            <span className="text-gradient-gold ml-2">GAMES</span>
          </h1>

          <p className="mt-1.5 text-[13px] text-purple-200/50 font-medium text-center">
            <span className="text-white/80 font-bold">11 giochi</span> · 2-15 giocatori · gratis
          </p>
        </div>

        {/* ── MIDDLE: Action Card ── */}
        <div className="w-full max-w-sm my-4">
          <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

            <div className="p-5">
              {/* Tabs */}
              <div className="flex mb-4 p-0.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setActiveTab('join'); setError(null); }}
                  className={`flex-1 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-300 ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  🎮 Entra
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('host'); setError(null); }}
                  className={`flex-1 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-300 ${
                    activeTab === 'host'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  📺 Crea Stanza
                </button>
              </div>

              {error && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center text-xs font-medium animate-shake">
                  {error}
                </div>
              )}

              {/* Join */}
              {activeTab === 'join' && (
                <div className="space-y-3 animate-fade-in-up">
                  <div>
                    <label className="block text-white/35 text-[10px] font-semibold mb-1 uppercase tracking-widest">Codice Stanza</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="ABCD"
                      className="input-lupo text-center text-2xl tracking-[0.35em] font-black uppercase !py-3"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-white/35 text-[10px] font-semibold mb-1 uppercase tracking-widest">Il tuo Nome</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Come ti chiami?"
                      className="input-lupo !py-3 text-sm"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    />
                  </div>
                  <button type="button" onClick={handleJoinRoom} disabled={isJoining} className="btn-lupo w-full text-sm !py-3.5">
                    {isJoining ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Entro...</span> : '🚀 Entra nella Stanza'}
                  </button>
                </div>
              )}

              {/* Host */}
              {activeTab === 'host' && (
                <div className="space-y-3 animate-fade-in-up">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-400/10">
                    <span className="text-lg">📺</span>
                    <p className="text-purple-200/60 text-[11px] font-medium leading-snug">
                      Usa un <span className="text-white/80 font-bold">PC/TV</span> per il tabellone.
                    </p>
                  </div>
                  <div>
                    <label className="block text-white/35 text-[10px] font-semibold mb-1 uppercase tracking-widest">Il tuo Nome</label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Game Master"
                      className="input-lupo !py-3 text-sm"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    />
                  </div>
                  <button type="button" onClick={handleCreateRoom} disabled={isCreating} className="btn-lupo w-full text-sm !py-3.5">
                    {isCreating ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Creo...</span> : '✨ Crea Nuova Stanza'}
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-400/25 to-transparent" />
          </div>
        </div>

        {/* ── BOTTOM: Footer ── */}
        <div className="text-center pb-1">
          <p className="text-white/15 text-[10px] font-medium tracking-widest uppercase">
            made by thewolf
          </p>
        </div>
      </div>
    </div>
  );
}
