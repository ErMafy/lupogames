'use client';
import { useState } from 'react';

interface Props {
  category: string;
  bombHolderId: string;
  currentPlayerId: string;
  roundId: string;
  onPass: (word: string) => Promise<void>;
  timeRemaining: number;
  words: string[];
  results?: { loserId: string; loserName: string; words: string[]; category: string };
}

export function BombController({ category, bombHolderId, currentPlayerId, onPass, timeRemaining, words, results }: Props) {
  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hasBomb = bombHolderId === currentPlayerId;
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  if (results) {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <div className="text-6xl mb-3">💥</div>
          <h3 className="text-2xl font-black text-white mb-2">BOOM!</h3>
          <p className="text-red-400 font-bold text-lg mb-3">{results.loserName} è esploso!</p>
          {results.words.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-3">
              {results.words.map((w, i) => <span key={i} className="px-2 py-1 rounded bg-white/10 text-white/60 text-xs">{w}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-2 text-center">
      <div className={`glass-card-premium p-5 mb-4 ${hasBomb ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
        <div className="text-4xl mb-2">{hasBomb ? '💣' : '😮‍💨'}</div>
        <p className="text-white/60 text-sm uppercase mb-1">Categoria:</p>
        <h2 className="text-xl font-black text-gradient mb-2">{category}</h2>
        {timeRemaining > 0 && (
          <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
            {timeRemaining}s
          </span>
        )}
      </div>

      {words.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mb-4">
          {words.slice(-8).map((w, i) => <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-white/40 text-xs">{w}</span>)}
        </div>
      )}

      {hasBomb ? (
        <div className="glass-card p-4 bg-red-900/20 border-red-500/30">
          <p className="text-red-300 font-bold mb-3 text-lg">HAI LA BOMBA! 💣</p>
          <div className="flex gap-2">
            <input value={word} onChange={e => setWord(e.target.value)} maxLength={30} placeholder="Scrivi una parola..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
            <button onClick={async () => { if (!word.trim()) return; setSubmitting(true); try { await onPass(word); setWord(''); } finally { setSubmitting(false); } }}
              disabled={submitting || !word.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black active:scale-95 transition-transform disabled:opacity-50">
              PASSA!
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6">
          <p className="text-white/60">Qualcuno ha la bomba... non sei tu! 😮‍💨</p>
        </div>
      )}
    </div>
  );
}
