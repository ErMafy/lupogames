'use client';
import { useState } from 'react';

interface Props {
  question: string;
  roundId: string;
  onAnswer: (answer: string) => Promise<void>;
  hasAnswered: boolean;
  timeRemaining: number;
  results?: { clusters: Array<{ answer: string; members: Array<{ playerId: string; playerName: string }>; isWinner: boolean }>; winningAnswer: string };
}

export function HerdMindController({ question, onAnswer, hasAnswered, timeRemaining, results }: Props) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  if (results) {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <div className="text-4xl mb-2">🐑</div>
          <h3 className="text-xl font-black text-white mb-1">Risposta vincente:</h3>
          <div className="text-2xl font-black text-gradient mb-4">&ldquo;{results.winningAnswer}&rdquo;</div>
          <div className="space-y-2">
            {results.clusters.sort((a, b) => b.members.length - a.members.length).map((c, i) => (
              <div key={i} className={`p-2 rounded-xl ${c.isWinner ? 'bg-green-500/20 ring-1 ring-green-500/40' : 'bg-white/5'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-sm ${c.isWinner ? 'text-green-400' : 'text-white/60'}`}>&ldquo;{c.answer}&rdquo;</span>
                  <span className="text-xs text-white/40">{c.members.length}x</span>
                </div>
                <div className="text-xs text-white/40 mt-1">{c.members.map(m => m.playerName).join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-2 text-center">
      <div className="glass-card-premium p-5 mb-6">
        <div className="text-3xl mb-2">🐑</div>
        <h2 className="text-lg sm:text-xl font-black text-gradient mb-2">{question}</h2>
        <p className="text-purple-200/60 text-xs">Pensa come la massa!</p>
        {timeRemaining > 0 && (
          <span className={`inline-block mt-2 text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
            {timeRemaining}s
          </span>
        )}
      </div>
      {!hasAnswered ? (
        <div className="glass-card p-4">
          <input value={answer} onChange={e => setAnswer(e.target.value)} maxLength={50} placeholder="La tua risposta..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3" />
          <button onClick={async () => { if (!answer.trim()) return; setSubmitting(true); try { await onAnswer(answer); } finally { setSubmitting(false); } }}
            disabled={submitting || !answer.trim()}
            className="w-full btn-lupo">Invia</button>
        </div>
      ) : (
        <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Risposta inviata! In attesa degli altri...</p></div>
      )}
    </div>
  );
}
