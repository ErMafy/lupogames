'use client';

import { useState, useEffect, useRef } from 'react';
import type { PromptRoundData } from '@/types';

interface PromptControllerProps {
  roundData: PromptRoundData;
  phase: 'WRITING' | 'VOTING';
  onSubmitResponse: (response: string) => Promise<void>;
  onVote: (responseId: string) => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining?: number;
  responses?: { id: string; response: string }[];
  roundResults?: Array<{
    id: string;
    playerId: string;
    playerName: string;
    response: string;
    voteCount: number;
  }>;
}

export function PromptController({
  roundData,
  phase,
  onSubmitResponse,
  onVote,
  hasSubmitted,
  timeRemaining = 0,
  responses = [],
  roundResults,
}: PromptControllerProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const prevPhaseRef = useRef(phase);
  const prevPhraseRef = useRef(roundData.phraseId);

  useEffect(() => {
    if (phase !== prevPhaseRef.current || roundData.phraseId !== prevPhraseRef.current) {
      setVoted(false);
      setIsSubmitting(false);
      if (phase === 'WRITING') setResponse('');
      prevPhaseRef.current = phase;
      prevPhraseRef.current = roundData.phraseId;
    }
  }, [phase, roundData.phraseId]);

  const handleSubmit = async () => {
    if (!response.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitResponse(response.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (responseId: string) => {
    if (isSubmitting || voted || hasSubmitted) return;
    setVoted(true);
    setIsSubmitting(true);
    try {
      await onVote(responseId);
    } catch {
      setVoted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timerUrgent = timeRemaining > 0 && timeRemaining <= 10;

  if (roundResults && roundResults.length > 0) {
    const sorted = [...roundResults].sort((a, b) => b.voteCount - a.voteCount);
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-white">🎉 Risultati Round</h2>
          <p className="text-purple-200/70 text-sm">&ldquo;{roundData.phrase}…&rdquo;</p>
        </div>
        <div className="flex flex-col gap-2">
          {sorted.map((r, i) => (
            <div key={r.id} className={`rounded-xl border px-4 py-3 ${i === 0 ? 'border-yellow-400/50 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base">&ldquo;{r.response}&rdquo;</p>
                  <p className="text-purple-300 text-xs mt-0.5">— {r.playerName}</p>
                </div>
                <div className="shrink-0 ml-3 text-center">
                  <p className="text-xl font-black text-amber-300">{r.voteCount}</p>
                  <p className="text-[10px] text-white/50">voti</p>
                </div>
              </div>
              {i === 0 && <p className="text-center text-xs font-bold text-yellow-400 mt-1">👑 Vincitore!</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'WRITING') {
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/40 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-fuchsia-200/90 text-xs font-bold uppercase tracking-widest">Continua la frase</p>
            {timeRemaining > 0 && (
              <span className={`text-sm font-black px-2 py-0.5 rounded-md ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
                {timeRemaining}s
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-white leading-snug">&ldquo;{roundData.phrase}&rdquo;…</h2>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-black text-white mb-1">Inviato!</h3>
            <p className="text-fuchsia-200/70 text-sm">In attesa del voto…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="La tua risposta…"
              maxLength={200}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-fuchsia-500/60 resize-none touch-manipulation"
              autoComplete="off"
            />
            <div className="flex justify-between text-xs text-fuchsia-200/60">
              <span>{response.length}/200</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!response.trim() || isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-black text-base py-3 disabled:opacity-40 active:scale-[0.98] touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isSubmitting ? '⏳ Invio…' : '📤 Invia'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-1">
      <div className="text-center mb-3 rounded-xl border border-violet-500/25 bg-violet-950/40 p-3">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-lg font-black text-white">🗳️ Vota!</h2>
          {timeRemaining > 0 && (
            <span className={`text-sm font-black px-2 py-0.5 rounded-md ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
              {timeRemaining}s
            </span>
          )}
        </div>
        <p className="text-white/50 text-xs mt-1 line-clamp-1">&ldquo;{roundData.phrase}…&rdquo;</p>
      </div>

      {hasSubmitted || voted ? (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">🗳️</div>
          <h3 className="text-xl font-black text-white">Voto registrato</h3>
          <p className="text-violet-200/70 text-sm">Aspetta il prossimo passaggio…</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {responses.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => void handleVote(r.id)}
                disabled={isSubmitting}
                className="w-full text-left rounded-xl border border-white/15 bg-white/[0.07] active:bg-white/[0.14] px-4 py-3 min-h-[48px] touch-manipulation transition-colors disabled:opacity-50"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/50 flex items-center justify-center text-white font-black text-xs">{i + 1}</span>
                  <p className="text-white text-sm font-medium leading-snug flex-1">{r.response}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PromptController;
