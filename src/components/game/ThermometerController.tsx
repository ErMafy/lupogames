'use client';
import { useState } from 'react';

interface Props {
  concept: string;
  roundId: string;
  onVote: (value: number) => Promise<void>;
  hasVoted: boolean;
  timeRemaining: number;
  results?: { average: number; votes: Array<{ playerId: string; playerName: string; value: number }> };
  currentPlayerId: string;
}

export function ThermometerController({ concept, onVote, hasVoted, timeRemaining, results, currentPlayerId }: Props) {
  const [value, setValue] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  if (results) {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center animate-bounce-in">
        <div className="glass-card-premium p-6">
          <h3 className="text-xl font-black text-white mb-2">Media del gruppo</h3>
          <div className="text-5xl font-black text-gradient mb-4">{results.average}</div>
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 transition-all" style={{ width: `${results.average}%` }} />
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {results.votes.sort((a, b) => Math.abs(a.value - results.average) - Math.abs(b.value - results.average)).map(v => (
              <div key={v.playerId} className={`flex justify-between px-3 py-1 rounded ${v.playerId === currentPlayerId ? 'bg-purple-500/20 text-white' : 'text-white/60'}`}>
                <span className="text-sm">{v.playerName}</span>
                <span className="text-sm font-bold">{v.value}</span>
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
        <div className="text-3xl mb-2">🌡️</div>
        <h2 className="text-lg sm:text-xl font-black text-gradient mb-2">{concept}</h2>
        {timeRemaining > 0 && (
          <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
            {timeRemaining}s
          </span>
        )}
      </div>
      {!hasVoted ? (
        <div className="glass-card p-6">
          <div className="text-5xl font-black text-gradient mb-4">{value}</div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-blue-400 font-bold text-sm">0</span>
            <input type="range" min={0} max={100} value={value} onChange={e => setValue(Number(e.target.value))}
              className="flex-1 h-3 rounded-full appearance-none bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg" />
            <span className="text-red-400 font-bold text-sm">100</span>
          </div>
          <button onClick={async () => { setSubmitting(true); try { await onVote(value); } finally { setSubmitting(false); } }}
            disabled={submitting}
            className="w-full btn-lupo text-lg">Invia</button>
        </div>
      ) : (
        <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Valore inviato! In attesa degli altri...</p></div>
      )}
    </div>
  );
}
