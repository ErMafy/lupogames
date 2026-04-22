'use client';
import { useState, useEffect } from 'react';

interface Props {
  concept: string;
  roundId: string;
  onVote: (vote: 'YES' | 'NO') => Promise<void>;
  hasVoted: boolean;
  timeRemaining: number;
  results?: { yesCount: number; noCount: number; majority: string; voters?: Array<{ playerId: string; playerName: string; vote: string; won: boolean }> };
}

export function SwipeTrashController({ concept, roundId, onVote, hasVoted, timeRemaining, results }: Props) {
  const [submitting, setSubmitting] = useState(false);
  // Reset locale ad ogni round: senza questo un click rimasto in coda dal
  // round precedente poteva tenere `submitting=true` e disabilitare i bottoni.
  useEffect(() => {
    setSubmitting(false);
  }, [roundId]);
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  if (results) {
    const total = results.yesCount + results.noCount;
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <h3 className="text-xl font-black text-white mb-4">Risultati</h3>
          <div className="flex justify-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-green-400">{results.yesCount}</div>
              <div className="text-sm text-green-300/60">SÌ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-red-400">{results.noCount}</div>
              <div className="text-sm text-red-300/60">NO</div>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all" style={{ width: `${total > 0 ? (results.yesCount / total) * 100 : 50}%` }} />
          </div>
          <p className="text-sm text-purple-200/60">La maggioranza dice <span className="font-bold text-white">{results.majority === 'YES' ? 'SÌ' : 'NO'}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-2 text-center">
      <div className="glass-card-premium p-6 mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-gradient leading-relaxed mb-2">{concept}</h2>
        {timeRemaining > 0 && (
          <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
            {timeRemaining}s
          </span>
        )}
      </div>
      {!hasVoted ? (
        <div className="flex gap-4">
          <button
            onClick={async () => { setSubmitting(true); try { await onVote('YES'); } finally { setSubmitting(false); } }}
            disabled={submitting}
            className="flex-1 py-8 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-3xl font-black shadow-lg shadow-green-500/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            SÌ 👍
          </button>
          <button
            onClick={async () => { setSubmitting(true); try { await onVote('NO'); } finally { setSubmitting(false); } }}
            disabled={submitting}
            className="flex-1 py-8 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-3xl font-black shadow-lg shadow-red-500/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            NO 👎
          </button>
        </div>
      ) : (
        <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Voto inviato! In attesa degli altri...</p></div>
      )}
    </div>
  );
}
