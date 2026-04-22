'use client';
import { useState, useEffect } from 'react';

interface Sentence { playerId: string; playerName: string; sentence: string }
interface Props {
  phase: 'COLLECTING' | 'BUILDING' | 'VOTING' | 'RESULTS';
  questions?: string[];
  prompt?: string;
  words?: string[];
  sentences?: Sentence[];
  currentPlayerId: string;
  roundId: string;
  onCollect: (answers: string[]) => Promise<void>;
  onBuild: (sentence: string) => Promise<void>;
  onVote: (votedPlayerId: string) => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining: number;
  results?: Array<{ playerId: string; playerName: string; sentence: string; votes: number }>;
}

export function InterviewController({ phase, questions, prompt, words, sentences, currentPlayerId, roundId, onCollect, onBuild, onVote, hasSubmitted, timeRemaining, results }: Props) {
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>(words || []);
  const [submitting, setSubmitting] = useState(false);
  // Reset stato locale al cambio round / fase: evita che testi/word picker
  // restino dal round precedente.
  useEffect(() => {
    setAnswers(['', '']);
    setSelectedWords([]);
    setAvailableWords(words || []);
    setSubmitting(false);
  }, [roundId, phase]);
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
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-xl font-black text-white mb-4">Risultati</h3>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={r.playerId} className={`p-3 rounded-xl ${i === 0 ? 'bg-yellow-500/20 ring-1 ring-yellow-500/40' : 'bg-white/5'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white text-sm">{r.playerName}</span>
                  <span className="text-amber-300 text-sm font-bold">{r.votes} voti</span>
                </div>
                <p className="text-white/60 text-xs italic">&ldquo;{r.sentence}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'COLLECTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <div className="text-3xl mb-2">📝</div>
          <h3 className="text-lg font-black text-white">Rispondi alle domande</h3>
          {timerBadge}
        </div>
        {!hasSubmitted ? (
          <div className="space-y-3">
            {(questions || []).map((q, i) => (
              <div key={i} className="glass-card p-3">
                <p className="text-white/60 text-sm mb-2">{q}</p>
                <input value={answers[i] || ''} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                  maxLength={100} placeholder="La tua risposta..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            ))}
            <button onClick={async () => { if (answers.some(a => !a.trim())) return; setSubmitting(true); try { await onCollect(answers); } finally { setSubmitting(false); } }}
              disabled={submitting || answers.some(a => !a.trim())}
              className="w-full btn-lupo">Invia Risposte</button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Risposte inviate!</p></div>
        )}
      </div>
    );
  }

  if (phase === 'BUILDING') {
    const actualWords = availableWords.length > 0 ? availableWords : (words || []);
    return (
      <div className="max-w-lg mx-auto w-full px-2 text-center">
        <div className="glass-card-premium p-5 mb-4">
          <div className="text-3xl mb-2">🔨</div>
          <p className="text-white/60 text-xs mb-1">Costruisci una frase per:</p>
          <h3 className="text-lg font-black text-gradient">{prompt}</h3>
          {timerBadge}
        </div>
        {!hasSubmitted ? (
          <div>
            <div className="glass-card p-3 mb-3 min-h-[3rem] flex flex-wrap gap-1">
              {selectedWords.length === 0 && <span className="text-white/30 text-sm">Clicca le parole per formare la frase...</span>}
              {selectedWords.map((w, i) => (
                <button key={i} onClick={() => { setSelectedWords(s => s.filter((_, idx) => idx !== i)); setAvailableWords(a => [...a, w]); }}
                  className="px-2 py-1 rounded bg-purple-500/30 text-white text-sm hover:bg-red-500/30 transition-colors">{w}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mb-3 justify-center">
              {actualWords.map((w, i) => (
                <button key={i} onClick={() => { setSelectedWords(s => [...s, w]); setAvailableWords(a => a.filter((_, idx) => idx !== i)); }}
                  className="px-2 py-1 rounded bg-white/10 text-white/80 text-sm hover:bg-white/20 active:scale-95 transition-all">{w}</button>
              ))}
            </div>
            <button onClick={async () => { if (selectedWords.length === 0) return; setSubmitting(true); try { await onBuild(selectedWords.join(' ')); } finally { setSubmitting(false); } }}
              disabled={submitting || selectedWords.length === 0}
              className="w-full btn-lupo">Invia Frase</button>
          </div>
        ) : (
          <div className="glass-card p-6"><p className="text-white/60 animate-pulse">Frase inviata!</p></div>
        )}
      </div>
    );
  }

  if (phase === 'VOTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-2">
        <div className="glass-card-premium p-4 mb-4 text-center">
          <h3 className="text-lg font-black text-white">Vota la frase migliore!</h3>
          {timerBadge}
        </div>
        {!hasSubmitted ? (
          <div className="space-y-2">
            {(sentences || []).filter(s => s.playerId !== currentPlayerId).map(s => (
              <button key={s.playerId} onClick={async () => { setSubmitting(true); try { await onVote(s.playerId); } finally { setSubmitting(false); } }}
                disabled={submitting}
                className="w-full glass-card p-3 text-left hover:bg-white/20 active:scale-[0.98] transition-all">
                <p className="text-white font-medium text-sm">&ldquo;{s.sentence}&rdquo;</p>
                <p className="text-white/40 text-xs mt-1">— {s.playerName}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center"><p className="text-white/60 animate-pulse">Voto inviato!</p></div>
        )}
      </div>
    );
  }

  return null;
}
