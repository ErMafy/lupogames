'use client';

import { useState, useEffect } from 'react';
import type { PromptRoundData } from '@/types';

interface PromptControllerProps {
  roundData: PromptRoundData;
  phase: 'WRITING' | 'VOTING';
  onSubmitResponse: (response: string) => Promise<void>;
  onVote: (responseId: string) => Promise<void>;
  hasSubmitted: boolean;
  responses?: { id: string; response: string }[];
}

export function PromptController({
  roundData,
  phase,
  onSubmitResponse,
  onVote,
  hasSubmitted,
  responses = [],
}: PromptControllerProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  useEffect(() => {
    setSelectedVote(null);
    if (phase === 'WRITING') {
      setResponse('');
    }
  }, [phase, roundData.phrase, roundData.phraseId]);

  const handleSubmitResponse = async () => {
    if (!response.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitResponse(response.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (responseId: string) => {
    if (isSubmitting || selectedVote) return;

    setSelectedVote(responseId);
    setIsSubmitting(true);
    try {
      await onVote(responseId);
    } catch {
      setSelectedVote(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'WRITING') {
    return (
      <div className="flex flex-col min-h-[65vh] max-w-lg mx-auto w-full px-1">
        <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/50 via-rose-950/40 to-slate-950/80 p-5 mb-5 shadow-[0_20px_50px_-15px_rgba(236,72,153,0.35)]">
          <p className="text-fuchsia-200/90 text-xs font-bold uppercase tracking-widest mb-2">
            Continua la frase
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
            &ldquo;{roundData.phrase}&rdquo;…
          </h2>
          <p className="text-fuchsia-200/70 text-sm mt-3 leading-relaxed">
            Scrivi la tua idea più divertente, poi tutti voteranno (anonimo). Hai{' '}
            <span className="text-amber-300 font-bold">{roundData.timeLimit}s</span>.
          </p>
        </div>

        {hasSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-black text-white mb-2">Inviato!</h3>
            <p className="text-fuchsia-200/80 max-w-xs">
              Aspetta gli altri o lo scadere del tempo: si passa al voto in automatico.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="La tua risposta…"
              maxLength={200}
              rows={5}
              className="w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-lg text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-fuchsia-500/60 resize-none touch-manipulation"
              autoComplete="off"
              autoCorrect="on"
            />

            <div className="flex items-center justify-between text-sm text-fuchsia-200/80">
              <span>{response.length}/200</span>
              <span>⏱️ {roundData.timeLimit}s</span>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmitResponse()}
              disabled={!response.trim() || isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-black text-lg py-4 shadow-lg shadow-fuchsia-900/40 disabled:opacity-45 active:scale-[0.98] touch-manipulation min-h-[52px]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isSubmitting ? '⏳ Invio…' : '📤 Invia risposta'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[65vh] max-w-lg mx-auto w-full px-1 pb-6">
      <div className="text-center mb-5 rounded-2xl border border-violet-500/25 bg-violet-950/40 p-4">
        <h2 className="text-xl font-black text-white mb-1">🗳️ Vota la più divertente</h2>
        <p className="text-violet-200/80 text-sm">
          Tocca una risposta. Non puoi votare la tua. Chiusura automatica a tempo o quando tutti votano.
        </p>
      </div>

      <p className="text-center text-white/50 text-xs mb-4 line-clamp-2 px-2">
        Frase: &ldquo;{roundData.phrase}…&rdquo;
      </p>

      {hasSubmitted || selectedVote ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="text-6xl mb-4">🗳️</div>
          <h3 className="text-2xl font-black text-white mb-2">Voto registrato</h3>
          <p className="text-violet-200/80">Aspetta il prossimo passaggio…</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          {responses.map((r, index) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => void handleVote(r.id)}
                disabled={isSubmitting}
                className="w-full text-left rounded-2xl border border-white/15 bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.99] px-4 py-4 min-h-[56px] touch-manipulation transition-colors disabled:opacity-50 shadow-md"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-600/50 flex items-center justify-center text-white font-black text-sm">
                    {index + 1}
                  </span>
                  <p className="text-white text-base font-medium leading-snug flex-1 pt-0.5">
                    {r.response}
                  </p>
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
