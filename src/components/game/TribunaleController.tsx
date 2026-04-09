'use client';
import { useState } from 'react';

interface Player { id: string; name: string; avatar: string | null }
interface Props {
  phase: 'ACCUSING' | 'DEFENSE' | 'VERDICT' | 'RESULTS';
  accusation?: string;
  players?: Player[];
  currentPlayerId: string;
  defendantId?: string;
  defendantName?: string;
  defense?: string;
  roundId: string;
  onAccuse: (accusedPlayerId: string) => Promise<void>;
  onDefense: (defense: string) => Promise<void>;
  onVerdict: (verdict: 'INNOCENT' | 'GUILTY') => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining: number;
  results?: { innocent: number; guilty: number; isInnocent: boolean; defendantId: string };
}

export function TribunaleController({ phase, accusation, players, currentPlayerId, defendantId, defendantName, defense, onAccuse, onDefense, onVerdict, hasSubmitted, timeRemaining, results }: Props) {
  const [defenseText, setDefenseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  const timerBadge = timeRemaining > 0 && (
    <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
      {timeRemaining}s
    </span>
  );

  if (results) {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <div className="text-5xl mb-3">{results.isInnocent ? '😇' : '😈'}</div>
          <h3 className="text-2xl font-black text-white mb-2">
            {results.isInnocent ? 'INNOCENTE!' : 'COLPEVOLE!'}
          </h3>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center"><div className="text-2xl font-black text-green-400">{results.innocent}</div><div className="text-xs text-green-300/60">Innocente</div></div>
            <div className="text-center"><div className="text-2xl font-black text-red-400">{results.guilty}</div><div className="text-xs text-red-300/60">Colpevole</div></div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ACCUSING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2">
        <div className="glass-card-premium p-5 mb-4 text-center">
          <div className="text-3xl mb-2">⚖️</div>
          <h2 className="text-lg sm:text-xl font-black text-gradient mb-1">{accusation}</h2>
          {timerBadge}
        </div>
        {!hasSubmitted ? (
          <div className="grid grid-cols-2 gap-2">
            {(players || []).filter(p => p.id !== currentPlayerId).map(p => (
              <button key={p.id} onClick={async () => { setSubmitting(true); try { await onAccuse(p.id); } finally { setSubmitting(false); } }}
                disabled={submitting}
                className="glass-card p-3 text-center hover:bg-white/20 active:scale-95 transition-all">
                <div className="text-2xl mb-1">{p.avatar || '👤'}</div>
                <div className="text-white font-bold text-sm truncate">{p.name}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center"><p className="text-white/60 animate-pulse">Voto inviato!</p></div>
        )}
      </div>
    );
  }

  if (phase === 'DEFENSE') {
    const isDefendant = currentPlayerId === defendantId;
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <div className="text-3xl mb-2">🔨</div>
          <h3 className="text-lg font-black text-white">L'imputato: <span className="text-gradient">{defendantName}</span></h3>
          {timerBadge}
        </div>
        {isDefendant && !hasSubmitted ? (
          <div className="glass-card p-4">
            <textarea value={defenseText} onChange={e => setDefenseText(e.target.value)} maxLength={200} placeholder="Scrivi la tua difesa..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white resize-none h-24 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={async () => { if (!defenseText.trim()) return; setSubmitting(true); try { await onDefense(defenseText); } finally { setSubmitting(false); } }}
              disabled={submitting || !defenseText.trim()}
              className="mt-2 w-full btn-lupo">Invia Difesa</button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">{isDefendant ? 'Difesa inviata!' : 'L\'imputato sta scrivendo la difesa...'}</p></div>
        )}
      </div>
    );
  }

  if (phase === 'VERDICT') {
    const isDefendant = currentPlayerId === defendantId;
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <h3 className="text-lg font-black text-white mb-2">La difesa:</h3>
          <p className="text-purple-200 italic">&ldquo;{defense}&rdquo;</p>
          {timerBadge}
        </div>
        {isDefendant ? (
          <div className="glass-card p-6"><p className="text-white/60">Il tuo destino è nelle loro mani... 🙏</p></div>
        ) : !hasSubmitted ? (
          <div className="flex gap-4">
            <button onClick={async () => { setSubmitting(true); try { await onVerdict('INNOCENT'); } finally { setSubmitting(false); } }}
              disabled={submitting}
              className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xl font-black active:scale-95 transition-transform">
              😇 Innocente
            </button>
            <button onClick={async () => { setSubmitting(true); try { await onVerdict('GUILTY'); } finally { setSubmitting(false); } }}
              disabled={submitting}
              className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-xl font-black active:scale-95 transition-transform">
              😈 Colpevole
            </button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Verdetto inviato!</p></div>
        )}
      </div>
    );
  }

  return null;
}
