'use client';
import { useState } from 'react';

interface Props {
  phase: 'WRITING' | 'VOTING' | 'RESULTS';
  dilemmaStart?: string;
  dilemma?: string;
  authorId?: string;
  currentPlayerId: string;
  roundId: string;
  onWrite: (completion: string) => Promise<void>;
  onVote: (vote: 'YES' | 'NO') => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining: number;
  results?: { yesCount: number; noCount: number; authorId: string; authorPoints: number; splitPercent: number };
}

export function SplitRoomController({ phase, dilemmaStart, dilemma, authorId, currentPlayerId, onWrite, onVote, hasSubmitted, timeRemaining, results }: Props) {
  const [completion, setCompletion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAuthor = currentPlayerId === authorId;
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  const timerBadge = timeRemaining > 0 && (
    <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
      {timeRemaining}s
    </span>
  );

  if (results) {
    const total = results.yesCount + results.noCount;
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <div className="text-4xl mb-2">⚡</div>
          <div className="flex justify-center gap-6 mb-3">
            <div className="text-center"><div className="text-3xl font-black text-green-400">{results.yesCount}</div><div className="text-xs text-green-300/60">Opzione 1 ({results.splitPercent}%)</div></div>
            <div className="text-center"><div className="text-3xl font-black text-red-400">{results.noCount}</div><div className="text-xs text-red-300/60">Opzione 2 ({100 - results.splitPercent}%)</div></div>
          </div>
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${total > 0 ? (results.yesCount / total) * 100 : 50}%` }} />
          </div>
          <p className="text-sm text-purple-200/60">L'autore guadagna <span className="text-gradient font-bold">{results.authorPoints} punti</span></p>
        </div>
      </div>
    );
  }

  if (phase === 'WRITING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <div className="text-3xl mb-2">⚡</div>
          {isAuthor ? (
            <h3 className="text-lg font-black text-gradient">Sei l'Autore! Completa il dilemma</h3>
          ) : (
            <h3 className="text-lg font-black text-white">L'autore sta scrivendo...</h3>
          )}
          {timerBadge}
        </div>
        {isAuthor && !hasSubmitted ? (
          <div className="glass-card p-4">
            <p className="text-purple-200 text-sm mb-3">{dilemmaStart}</p>
            <input value={completion} onChange={e => setCompletion(e.target.value)} maxLength={100} placeholder="Completa il dilemma..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3" />
            <button onClick={async () => { if (!completion.trim()) return; setSubmitting(true); try { await onWrite(completion); } finally { setSubmitting(false); } }}
              disabled={submitting || !completion.trim()}
              className="w-full btn-lupo">Invia</button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">{isAuthor ? 'Inviato!' : 'In attesa dell\'autore...'}</p></div>
        )}
      </div>
    );
  }

  if (phase === 'VOTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <h2 className="text-lg sm:text-xl font-black text-gradient">{dilemma}</h2>
          {timerBadge}
        </div>
        {isAuthor ? (
          <div className="glass-card p-6"><p className="text-white/60">In attesa dei voti... 🤞</p></div>
        ) : !hasSubmitted ? (
          <div className="flex gap-4">
            <button onClick={async () => { setSubmitting(true); try { await onVote('YES'); } finally { setSubmitting(false); } }}
              disabled={submitting}
              className="flex-1 py-8 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-2xl font-black active:scale-95 transition-transform">
              1 ☝️
            </button>
            <button onClick={async () => { setSubmitting(true); try { await onVote('NO'); } finally { setSubmitting(false); } }}
              disabled={submitting}
              className="flex-1 py-8 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-2xl font-black active:scale-95 transition-transform">
              2 ✌️
            </button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Voto inviato!</p></div>
        )}
      </div>
    );
  }

  return null;
}
