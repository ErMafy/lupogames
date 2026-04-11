'use client';
import { useState } from 'react';

interface Player { id: string; name: string; avatar: string | null }
interface Hint { playerId: string; playerName: string; hint: string }
interface Props {
  phase: 'HINTING' | 'REVEAL' | 'VOTING' | 'RESULTS';
  secretWord: string | null;
  chameleonId: string;
  currentPlayerId: string;
  players?: Player[];
  roundId: string;
  hints?: Hint[];
  liveHints?: Hint[];
  onHint: (hint: string) => Promise<void>;
  onVote: (suspectedId: string) => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining: number;
  results?: { chameleonId: string; chameleonName: string; secretWord: string; chameleonCaught: boolean; voteCounts: Record<string, number> };
  retry?: boolean;
}

export function ChameleonController({ phase, secretWord, chameleonId, currentPlayerId, players, hints, liveHints, onHint, onVote, hasSubmitted, timeRemaining, results, retry }: Props) {
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isChameleon = currentPlayerId === chameleonId;
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  const timerBadge = timeRemaining > 0 && (
    <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
      {timeRemaining}s
    </span>
  );

  if (results) {
    const realVotes = Object.entries(results.voteCounts).filter(([k]) => k !== 'SKIP');
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <div className="text-5xl mb-3">{results.chameleonCaught ? '🎯' : '🦎'}</div>
          <h3 className="text-xl font-black text-white mb-2">
            {results.chameleonCaught ? 'Camaleonte beccato!' : 'Il Camaleonte è sfuggito!'}
          </h3>
          <p className="text-purple-200/60 text-sm mb-2">Il camaleonte era: <span className="text-white font-bold">{results.chameleonName}</span></p>
          <p className="text-purple-200/60 text-sm mb-3">La parola era: <span className="text-gradient font-bold">{results.secretWord}</span></p>
          {realVotes.length > 0 && (
            <div className="glass-card p-3 mt-2">
              <p className="text-xs text-white/40 mb-2">Voti:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {realVotes.map(([id, count]) => {
                  const p = (players || []).find(pl => pl.id === id);
                  return (
                    <div key={id} className={`px-2 py-1 rounded-lg text-xs font-bold ${id === results.chameleonId ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/70'}`}>
                      {p?.name || '???'}: {count}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'HINTING') {
    const othersHints = (liveHints || []).filter(h => h.playerId !== currentPlayerId);
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <div className="text-3xl mb-2">{isChameleon ? '🦎' : '🔍'}</div>
          {isChameleon ? (
            <>
              <h3 className="text-lg font-black text-red-400 mb-1">Sei il Camaleonte!</h3>
              <p className="text-white/60 text-sm">Non conosci la parola segreta. Osserva gli indizi degli altri e bluffa!</p>
            </>
          ) : (
            <>
              <p className="text-white/60 text-xs uppercase mb-1">Parola segreta:</p>
              <h2 className="text-2xl font-black text-gradient">{secretWord}</h2>
              <p className="text-white/40 text-xs mt-1">Scrivi un indizio senza essere troppo ovvio</p>
            </>
          )}
          {retry && <p className="text-amber-400 text-xs mt-2 font-bold">🔄 Secondo turno — stessa parola!</p>}
          <div className="mt-2">{timerBadge}</div>
        </div>

        {/* Only the chameleon sees live hints from others */}
        {isChameleon && othersHints.length > 0 && (
          <div className="glass-card p-3 mb-3 border border-red-500/20">
            <p className="text-xs text-red-300/60 mb-2">🕵️ Indizi degli altri (solo tu li vedi):</p>
            <div className="grid grid-cols-2 gap-2">
              {othersHints.map(h => (
                <div key={h.playerId} className="glass-card p-2 animate-bounce-in">
                  <div className="text-xs text-white/40">{h.playerName}</div>
                  <div className="text-white font-bold text-sm">{h.hint}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasSubmitted ? (
          <div className="glass-card p-4">
            <input value={hint} onChange={e => setHint(e.target.value)} maxLength={30} placeholder="Una parola..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3" />
            <button onClick={async () => { if (!hint.trim()) return; setSubmitting(true); try { await onHint(hint); } finally { setSubmitting(false); } }}
              disabled={submitting || !hint.trim()}
              className="w-full btn-lupo">Invia Indizio</button>
          </div>
        ) : (
          <div className="glass-card p-6">
            <p className="text-white/60 animate-pulse">Indizio inviato! In attesa degli altri...</p>
            <p className="text-white/40 text-xs mt-1">{(liveHints || []).length}/{(players || []).length} inviati</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'REVEAL') {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <h3 className="text-lg font-black text-white mb-3">Indizi di tutti:</h3>
          <div className="grid grid-cols-2 gap-2">
            {(hints || []).map(h => (
              <div key={h.playerId} className="glass-card p-2">
                <div className="text-xs text-white/40">{h.playerName}</div>
                <div className="text-white font-bold">{h.hint}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">{timerBadge}</div>
        </div>
        <p className="text-white/60 text-sm">Analizza gli indizi... chi è il Camaleonte?</p>
      </div>
    );
  }

  if (phase === 'VOTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2">
        <div className="glass-card-premium p-4 mb-4 text-center">
          <h3 className="text-lg font-black text-white mb-1">Chi è il Camaleonte?</h3>
          <p className="text-white/40 text-xs mb-2">Oppure vota &quot;Non lo so&quot; per un altro turno</p>
          <div>{timerBadge}</div>
        </div>
        {!hasSubmitted ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(players || []).filter(p => p.id !== currentPlayerId).map(p => (
                <button key={p.id} onClick={async () => { setSubmitting(true); try { await onVote(p.id); } finally { setSubmitting(false); } }}
                  disabled={submitting}
                  className="glass-card p-3 text-center hover:bg-white/20 active:scale-95 transition-all">
                  <div className="text-2xl mb-1">{p.avatar || '👤'}</div>
                  <div className="text-white font-bold text-sm truncate">{p.name}</div>
                </button>
              ))}
            </div>
            <button onClick={async () => { setSubmitting(true); try { await onVote('SKIP'); } finally { setSubmitting(false); } }}
              disabled={submitting}
              className="w-full glass-card p-3 text-center hover:bg-amber-500/20 active:scale-95 transition-all border border-amber-500/30">
              <span className="text-amber-300 font-bold">🤷 Non lo so</span>
              <span className="text-white/40 text-xs block">Ripeti turno con stessa parola</span>
            </button>
          </div>
        ) : (
          <div className="glass-card p-6 text-center"><p className="text-white/60 animate-pulse">Voto inviato!</p></div>
        )}
      </div>
    );
  }

  return null;
}
