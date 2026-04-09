'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const GAMES = [
  { emoji: '🧠', name: 'Trivia' },
  { emoji: '💬', name: 'Completa la Frase' },
  { emoji: '🕵️', name: 'Chi è Stato?' },
  { emoji: '🗑️', name: 'Swipe Trash' },
  { emoji: '⚖️', name: 'Il Tribunale' },
  { emoji: '💣', name: 'La Bomba' },
  { emoji: '🌡️', name: 'Termometro' },
  { emoji: '🐑', name: 'Mente di Gregge' },
  { emoji: '🦎', name: 'Camaleonte' },
  { emoji: '⚡', name: 'Spacca-Stanza' },
  { emoji: '📝', name: 'Colloquio' },
];

function MarqueeRow({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  const items = direction === 'left' ? GAMES : [...GAMES].reverse();
  return (
    <div className="relative overflow-hidden py-1.5">
      <div
        className={`flex gap-2.5 ${
          direction === 'left' ? 'animate-[marquee_35s_linear_infinite]' : 'animate-[marquee-reverse_35s_linear_infinite]'
        }`}
        style={{ width: 'max-content' }}
      >
        {[...items, ...items].map((g, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shrink-0"
          >
            <span className="text-base">{g.emoji}</span>
            <span className="text-[11px] font-semibold text-white/60 whitespace-nowrap">{g.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [view, setView] = useState<'home' | 'join' | 'host'>('home');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase().slice(0, 4));
      setView('join');
    }
  }, [searchParams]);

  const handleCreateRoom = useCallback(async () => {
    if (!hostName.trim()) { setError('Inserisci il tuo nome!'); return; }
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: hostName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('lupo_player', JSON.stringify(data.data.hostPlayer));
        localStorage.setItem('lupo_room', JSON.stringify(data.data.room));
        router.push(`/host/${data.data.room.code}`);
      } else { setError(data.error || 'Errore nella creazione'); }
    } catch { setError('Errore di connessione.'); }
    finally { setIsCreating(false); }
  }, [hostName, router]);

  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim() || !playerName.trim()) { setError('Compila tutti i campi!'); return; }
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: joinCode.trim().toUpperCase(), playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('lupo_player', JSON.stringify(data.data.player));
        localStorage.setItem('lupo_room', JSON.stringify(data.data.room));
        router.push(`/play/${data.data.room.code}`);
      } else { setError(data.error || "Errore nell'entrare"); }
    } catch { setError('Errore di connessione.'); }
    finally { setIsJoining(false); }
  }, [joinCode, playerName, router]);

  return (
    <div className={`min-h-[100dvh] flex flex-col relative overflow-hidden transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-stars" />
      <div className="absolute w-[400px] h-[400px] -top-32 -left-32 rounded-full blur-3xl bg-purple-600/20 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] bottom-0 -right-24 rounded-full blur-3xl bg-pink-600/15 pointer-events-none" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">

        {/* ── LOGO ── */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative">
            <div className="absolute inset-0 scale-125 blur-2xl bg-purple-500/20 rounded-full animate-pulse pointer-events-none" />
            <Image
              src="/logolupo.png"
              alt="Lupo Games"
              width={220}
              height={220}
              className="relative drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* ── MARQUEE ── */}
        <div className="w-screen -mx-4 opacity-50 my-2">
          <MarqueeRow direction="left" />
          <MarqueeRow direction="right" />
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center">

          {/* HOME VIEW — Two big buttons */}
          {view === 'home' && (
            <div className="space-y-3 animate-fade-in-up">
              <button
                type="button"
                onClick={() => { setView('join'); setError(null); }}
                className="w-full group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-r from-purple-600/80 to-pink-600/80 p-5 text-left transition-all duration-300 active:scale-[0.98] shadow-xl shadow-purple-900/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-active:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl shrink-0">
                    🎮
                  </div>
                  <div>
                    <p className="text-white font-black text-lg leading-tight">Entra in una Stanza</p>
                    <p className="text-white/60 text-xs font-medium mt-0.5">Hai un codice? Unisciti ai tuoi amici</p>
                  </div>
                  <div className="ml-auto text-white/40 text-xl">›</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setView('host'); setError(null); }}
                className="w-full group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-5 text-left transition-all duration-300 active:scale-[0.98] shadow-xl shadow-black/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-active:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/20 flex items-center justify-center text-2xl shrink-0">
                    👑
                  </div>
                  <div>
                    <p className="text-white font-black text-lg leading-tight">Crea Stanza</p>
                    <p className="text-white/50 text-xs font-medium mt-0.5">Diventa l&apos;Host e scegli i giochi</p>
                  </div>
                  <div className="ml-auto text-white/30 text-xl">›</div>
                </div>
              </button>

              <p className="text-center text-white/20 text-[10px] font-medium pt-1">
                2-15 giocatori · nessuna app · 100% gratis
              </p>
            </div>
          )}

          {/* JOIN VIEW */}
          {view === 'join' && (
            <div className="animate-fade-in-up">
              <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <button type="button" onClick={() => { setView('home'); setError(null); }} className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 text-sm active:scale-95 transition-transform">
                      ‹
                    </button>
                    <h2 className="text-white font-black text-base">Entra in una Stanza</h2>
                  </div>

                  {error && (
                    <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center text-xs font-medium animate-shake">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/35 text-[10px] font-semibold mb-1 uppercase tracking-widest">Codice Stanza</label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                        placeholder="ABCD"
                        className="input-lupo text-center text-2xl tracking-[0.35em] font-black uppercase !py-3"
                        maxLength={4}
                        autoFocus
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
                      {isJoining ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Entro...</span> : '🚀 Entra'}
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-400/25 to-transparent" />
              </div>
            </div>
          )}

          {/* HOST VIEW */}
          {view === 'host' && (
            <div className="animate-fade-in-up">
              <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <button type="button" onClick={() => { setView('home'); setError(null); }} className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 text-sm active:scale-95 transition-transform">
                      ‹
                    </button>
                    <h2 className="text-white font-black text-base">Crea Stanza</h2>
                  </div>

                  {error && (
                    <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center text-xs font-medium animate-shake">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-400/10">
                      <span className="text-lg">📺</span>
                      <p className="text-amber-200/60 text-[11px] font-medium leading-snug">
                        Apri su <span className="text-white/80 font-bold">PC/TV</span> per il tabellone.
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
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                      />
                    </div>
                    <button type="button" onClick={handleCreateRoom} disabled={isCreating} className="btn-lupo w-full text-sm !py-3.5">
                      {isCreating ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Creo...</span> : '👑 Crea la Stanza'}
                    </button>
                    <p className="text-white/20 text-[10px] text-center font-medium">
                      Riceverai un codice di 4 lettere da condividere
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center pt-3 pb-1">
          <p className="text-white/15 text-[10px] font-medium tracking-widest uppercase">
            made by thewolf
          </p>
        </div>
      </div>
    </div>
  );
}
