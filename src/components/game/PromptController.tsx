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
  canVote?: boolean;
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
  canVote = true,
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
    if (isSubmitting || voted) return;
    setIsSubmitting(true);
    try {
      await onVote(responseId);
      setVoted(true);
    } catch {
      // Vote rejected (e.g. self-vote) — allow player to pick another response
    } finally {
      setIsSubmitting(false);
    }
  };

  const timerUrgent = timeRemaining > 0 && timeRemaining <= 10;

  if (roundResults && roundResults.length > 0) {
    const sorted = [...roundResults].sort((a, b) => b.voteCount - a.voteCount);
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="text-center mb-4 animate-fade-in-up">
          <div className="text-4xl mb-2 animate-success-pop">🎉</div>
          <h2 className="text-xl font-black text-white text-glow-purple">Risultati Round</h2>
          <p className="text-purple-200/60 text-sm mt-1">&ldquo;{roundData.phrase}…&rdquo;</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {sorted.map((r, i) => (
            <div
              key={r.id}
              className={`animate-fade-in-up rounded-2xl border px-4 py-3.5 transition-all ${
                i === 0
                  ? 'border-yellow-400/40 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 shadow-lg shadow-yellow-500/10'
                  : 'border-white/10 bg-white/[0.06]'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base leading-snug">&ldquo;{r.response}&rdquo;</p>
                  <p className="text-purple-300/70 text-xs mt-1">— {r.playerName}</p>
                </div>
                <div className="shrink-0 ml-3 text-center">
                  <p className={`text-2xl font-black ${i === 0 ? 'text-yellow-400 text-glow-gold' : 'text-white/80'}`}>{r.voteCount}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">voti</p>
                </div>
              </div>
              {i === 0 && <p className="text-center text-xs font-bold text-yellow-400 mt-1.5">👑 Vincitore!</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'WRITING') {
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="glass-card-premium p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <p className="text-fuchsia-200/90 text-xs font-bold uppercase tracking-widest">Continua la frase</p>
            </div>
            {timeRemaining > 0 && (
              <span className={`text-sm font-black px-2.5 py-1 rounded-lg transition-all ${
                timerUrgent
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                  : 'bg-white/10 text-amber-300'
              }`}>
                {timeRemaining}s
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-white leading-snug">&ldquo;{roundData.phrase}&rdquo;…</h2>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-8 animate-success-pop">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3 animate-glow-ring">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-black text-white">Inviato!</h3>
            <p className="text-fuchsia-200/60 text-sm mt-1">In attesa del voto…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="La tua risposta…"
              maxLength={200}
              rows={3}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/30 resize-none touch-manipulation transition-all"
              autoComplete="off"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-fuchsia-200/50">{response.length}/200</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!response.trim() || isSubmitting}
              className="btn-premium w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-black text-base py-3.5 disabled:opacity-40 shadow-lg shadow-fuchsia-600/20"
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
      <div className="glass-card-premium p-3.5 mb-3 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="text-lg">🗳️</span>
          <h2 className="text-lg font-black text-white">Vota la migliore!</h2>
          {timeRemaining > 0 && (
            <span className={`text-sm font-black px-2.5 py-1 rounded-lg transition-all ${
              timerUrgent
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                : 'bg-white/10 text-amber-300'
            }`}>
              {timeRemaining}s
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs mt-1.5 line-clamp-1">&ldquo;{roundData.phrase}…&rdquo;</p>
      </div>

      {canVote && voted ? (
        <div className="text-center py-8 animate-success-pop">
          <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/20 flex items-center justify-center mb-3 animate-glow-ring">
            <span className="text-3xl">🗳️</span>
          </div>
          <h3 className="text-xl font-black text-white">Voto registrato</h3>
          <p className="text-violet-200/60 text-sm mt-1">Aspetta i risultati…</p>
        </div>
      ) : (
        <>
          {!canVote && (
            <p className="text-center text-amber-200/80 text-sm mb-3">
              In 2 giocatori non si vota: leggete le risposte fino allo scadere del timer.
            </p>
          )}
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            {responses.map((r, i) => (
              <li key={r.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <button
                  type="button"
                  onClick={() => {
                    if (canVote) {
                      void handleVote(r.id);
                    }
                  }}
                  disabled={isSubmitting || !canVote}
                  className="btn-premium w-full text-left rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.12] px-4 py-3.5 min-h-[52px] touch-manipulation transition-all disabled:opacity-50 disabled:cursor-default"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/60 to-fuchsia-600/40 flex items-center justify-center text-white font-black text-sm shadow-inner">
                      {i + 1}
                    </span>
                    <p className="text-white text-sm font-medium leading-snug flex-1 pt-0.5">{r.response}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default PromptController;
