'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const GAMES = [
  { emoji: '🧠', name: 'Trivia', desc: 'Rispondi a domande di cultura generale prima degli altri. Più sei veloce, più punti guadagni. 4 opzioni, 1 risposta giusta, 30 secondi per decidere!' },
  { emoji: '💬', name: 'Completa la Frase', desc: 'Ti diamo l\'inizio di una frase assurda e tu la completi. Poi tutti votano la risposta più divertente. Creatività e umorismo vincono!' },
  { emoji: '🕵️', name: 'Chi è Stato?', desc: 'Uno scrive un segreto anonimo. Gli altri devono indovinare chi l\'ha scritto. Bluffa o confessa: a te la scelta!' },
  { emoji: '🗑️', name: 'Swipe Trash', desc: 'Il termometro dell\'indignazione! Ti mostriamo concetti controversi e voti SÌ o NO. Chi vota con la maggioranza prende punti. Segui l\'istinto della massa!' },
  { emoji: '⚖️', name: 'Il Tribunale', desc: 'Rovina le amicizie puntando il dito! Una domanda infame, tutti votano in segreto. Chi prende più voti diventa l\'Imputato e deve difendersi. Poi il verdetto finale!' },
  { emoji: '💣', name: 'La Bomba', desc: 'La patata bollente digitale! Hai la bomba? Scrivi una parola nella categoria e passala velocemente. Chi ce l\'ha quando esplode... perde tutto!' },
  { emoji: '🌡️', name: 'Termometro', desc: 'Indovina cosa pensa la stanza! Un concetto, uno slider da 0 a 100. Più ti avvicini alla media del gruppo, più punti fai. Conosci i tuoi amici?' },
  { emoji: '🐑', name: 'Mente di Gregge', desc: 'L\'originalità fa schifo! Una categoria, una risposta. Solo chi scrive la stessa cosa della maggioranza prende punti. Pensa come la massa!' },
  { emoji: '🦎', name: 'Camaleonte', desc: 'Mimetizzati tra gli innocenti! Tutti conoscono la parola segreta tranne il Camaleonte. Scrivi un indizio senza farti scoprire... o scova chi finge!' },
  { emoji: '⚡', name: 'Spacca-Stanza', desc: 'Crea dilemmi impossibili! Completa un dilemma e tutti votano SÌ o NO. Fai più punti se spacchi il gruppo esattamente a metà. 50/50 è l\'obiettivo!' },
  { emoji: '📝', name: 'Colloquio', desc: 'Costruisci frasi rubando le parole degli altri! Prima rispondi a domande rompighiaccio, poi le tue parole vengono mischiate. Crea la frase migliore e vota!' },
];

function MarqueeRow({ direction = 'left', onGameClick }: { direction?: 'left' | 'right'; onGameClick: (idx: number) => void }) {
  const items = direction === 'left' ? GAMES : [...GAMES].reverse();
  return (
    <div className="relative overflow-hidden py-0.5">
      <div
        className={`flex gap-2 ${
          direction === 'left' ? 'animate-[marquee_35s_linear_infinite]' : 'animate-[marquee-reverse_35s_linear_infinite]'
        }`}
        style={{ width: 'max-content' }}
      >
        {[...items, ...items].map((g, i) => {
          const realIdx = direction === 'left'
            ? i % GAMES.length
            : (GAMES.length - 1) - (i % GAMES.length);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGameClick(realIdx)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] shrink-0 active:bg-white/[0.08] transition-colors"
            >
              <span className="text-sm">{g.emoji}</span>
              <span className="text-[10px] font-semibold text-white/50 whitespace-nowrap">{g.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GameModal({ game, onClose }: { game: typeof GAMES[number]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-[24px] p-[1px] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-purple-500/50 via-white/[0.08] to-pink-500/30" />
        <div className="relative rounded-[23px] bg-[#0c0c20]/97 backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="p-6">
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/40 text-sm active:scale-90 transition-transform hover:bg-white/[0.12]"
            >
              ✕
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/15 border border-white/[0.08] flex items-center justify-center text-3xl mb-4 shadow-lg shadow-purple-500/10">
              {game.emoji}
            </div>

            {/* Title */}
            <h3 className="text-white font-black text-xl mb-3 pr-8">{game.name}</h3>

            {/* Description */}
            <p className="text-white/55 text-sm leading-relaxed font-medium">
              {game.desc}
            </p>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />
        </div>
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
  const [selectedGame, setSelectedGame] = useState<number | null>(null);

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
      <div className="absolute w-[500px] h-[500px] -top-44 left-1/2 -translate-x-1/2 rounded-full blur-[100px] bg-purple-600/25 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] bottom-0 -right-20 rounded-full blur-3xl bg-pink-600/10 pointer-events-none" />

      {/* Game info modal */}
      {selectedGame !== null && (
        <GameModal game={GAMES[selectedGame]} onClose={() => setSelectedGame(null)} />
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">

        {/* ── LOGO ── */}
        <div className="relative -mb-4">
          <div className="absolute inset-0 scale-110 blur-3xl bg-purple-500/15 rounded-full animate-pulse pointer-events-none" />
          <Image
            src="/logolupo.png"
            alt="Lupo Games"
            width={260}
            height={260}
            className="relative drop-shadow-2xl"
            priority
          />
        </div>

        {/* ── MARQUEE — tight under logo ── */}
        <div className="w-screen -mx-4 opacity-40 mb-4">
          <MarqueeRow direction="left" onGameClick={setSelectedGame} />
          <MarqueeRow direction="right" onGameClick={setSelectedGame} />
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center">

          {/* HOME — two glass buttons */}
          {view === 'home' && (
            <div className="space-y-2.5 animate-fade-in-up">

              {/* ENTRA button */}
              <button
                type="button"
                onClick={() => { setView('join'); setError(null); }}
                className="w-full group relative rounded-[20px] p-[1px] active:scale-[0.97] transition-transform duration-200"
              >
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-r from-purple-500/60 via-pink-500/60 to-purple-500/60 opacity-80 group-active:opacity-100 transition-opacity" />
                <div className="relative rounded-[19px] bg-[#0e0e24]/90 backdrop-blur-2xl px-5 py-4 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/5" />
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-purple-500/20">
                      🎮
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-[15px] leading-tight">Entra in una Stanza</p>
                      <p className="text-purple-200/40 text-[11px] font-medium mt-0.5">Hai un codice? Unisciti subito</p>
                    </div>
                    <div className="ml-auto text-white/20 text-lg font-light">&#8250;</div>
                  </div>
                </div>
              </button>

              {/* CREA button */}
              <button
                type="button"
                onClick={() => { setView('host'); setError(null); }}
                className="w-full group relative rounded-[20px] p-[1px] active:scale-[0.97] transition-transform duration-200"
              >
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-r from-amber-500/40 via-orange-400/40 to-amber-500/40 opacity-70 group-active:opacity-100 transition-opacity" />
                <div className="relative rounded-[19px] bg-[#0e0e24]/90 backdrop-blur-2xl px-5 py-4 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-orange-500/[0.03]" />
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/20 to-transparent" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-500/15 border border-amber-400/15 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-amber-500/15">
                      👑
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-[15px] leading-tight">Crea Stanza</p>
                      <p className="text-amber-200/35 text-[11px] font-medium mt-0.5">Diventa l&apos;Host della serata</p>
                    </div>
                    <div className="ml-auto text-white/20 text-lg font-light">&#8250;</div>
                  </div>
                </div>
              </button>

              <p className="text-center text-white/15 text-[10px] font-medium pt-0.5">
                2-15 giocatori · nessuna app · 100% gratis
              </p>
            </div>
          )}

          {/* JOIN VIEW */}
          {view === 'join' && (
            <div className="animate-fade-in-up">
              <div className="relative rounded-[20px] p-[1px]">
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-purple-500/40 via-white/[0.06] to-pink-500/20" />
                <div className="relative rounded-[19px] bg-[#0d0d22]/95 backdrop-blur-2xl overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <button type="button" onClick={() => { setView('home'); setError(null); }} className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 text-xs active:scale-90 transition-transform">
                        &#8249;
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/25 to-pink-500/15 border border-white/[0.08] flex items-center justify-center text-base">🎮</div>
                      <h2 className="text-white font-black text-sm">Entra in una Stanza</h2>
                    </div>

                    {error && (
                      <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/15 rounded-xl text-red-300 text-center text-xs font-medium animate-shake">{error}</div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-white/30 text-[10px] font-semibold mb-1 uppercase tracking-widest">Codice Stanza</label>
                        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="ABCD" className="input-lupo text-center text-2xl tracking-[0.35em] font-black uppercase !py-2.5" maxLength={4} autoFocus />
                      </div>
                      <div>
                        <label className="block text-white/30 text-[10px] font-semibold mb-1 uppercase tracking-widest">Il tuo Nome</label>
                        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Come ti chiami?" className="input-lupo !py-2.5 text-sm" maxLength={20} onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()} />
                      </div>
                      <button type="button" onClick={handleJoinRoom} disabled={isJoining} className="btn-lupo w-full text-sm !py-3.5 !rounded-xl">
                        {isJoining ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Entro...</span> : '🚀 Entra nella Stanza'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOST VIEW */}
          {view === 'host' && (
            <div className="animate-fade-in-up">
              <div className="relative rounded-[20px] p-[1px]">
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-amber-500/40 via-white/[0.06] to-orange-500/15" />
                <div className="relative rounded-[19px] bg-[#0d0d22]/95 backdrop-blur-2xl overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <button type="button" onClick={() => { setView('home'); setError(null); }} className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 text-xs active:scale-90 transition-transform">
                        &#8249;
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/15 border border-amber-400/10 flex items-center justify-center text-base">👑</div>
                      <h2 className="text-white font-black text-sm">Crea Stanza</h2>
                    </div>

                    {error && (
                      <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/15 rounded-xl text-red-300 text-center text-xs font-medium animate-shake">{error}</div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/[0.04] border border-amber-400/[0.08]">
                        <span className="text-base">📺</span>
                        <p className="text-amber-200/45 text-[11px] font-medium leading-snug">
                          Apri su <span className="text-white/70 font-bold">PC/TV</span> per il tabellone.
                        </p>
                      </div>
                      <div>
                        <label className="block text-white/30 text-[10px] font-semibold mb-1 uppercase tracking-widest">Il tuo Nome</label>
                        <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="Game Master" className="input-lupo !py-2.5 text-sm" maxLength={20} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()} />
                      </div>
                      <button type="button" onClick={handleCreateRoom} disabled={isCreating} className="btn-lupo w-full text-sm !py-3.5 !rounded-xl">
                        {isCreating ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Creo...</span> : '👑 Crea la Stanza'}
                      </button>
                      <p className="text-white/15 text-[10px] text-center font-medium">
                        Riceverai un codice di 4 lettere
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center pt-2 pb-0.5">
          <p className="text-white/12 text-[9px] font-medium tracking-widest uppercase">
            made by thewolf
          </p>
        </div>
      </div>
    </div>
  );
}
