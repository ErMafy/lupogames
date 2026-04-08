'use client';

import { useState, useEffect, useRef } from 'react';

interface SecretControllerProps {
  phase: 'COLLECTING' | 'GUESSING';
  secret?: string;
  players?: { id: string; name: string; avatar: string | null; avatarColor: string | null }[];
  onSubmitSecret: (secret: string) => Promise<void>;
  onVote: (suspectedPlayerId: string) => Promise<void>;
  hasSubmitted: boolean;
  timeRemaining?: number;
  currentPlayerId: string;
  revealResult?: { ownerName: string; ownerAvatar: string | null };
}

const EMOJIS: Record<string, string> = {
  Lupo: '🐺', Pecora: '🐑', Maiale: '🐷', Volpe: '🦊',
  Orso: '🐻', Leone: '🦁', Tigre: '🐯', Panda: '🐼',
  Coniglio: '🐰', Gatto: '🐱', Cane: '🐶', Unicorno: '🦄',
  Drago: '🐲', Gufo: '🦉', Pinguino: '🐧',
};

export function SecretController({
  phase,
  secret,
  players = [],
  onSubmitSecret,
  onVote,
  hasSubmitted,
  timeRemaining = 0,
  currentPlayerId,
  revealResult,
}: SecretControllerProps) {
  const [secretText, setSecretText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const prevPhaseRef = useRef(phase);
  const prevSecretRef = useRef(secret);

  useEffect(() => {
    if (phase !== prevPhaseRef.current || secret !== prevSecretRef.current) {
      setVoted(false);
      setIsSubmitting(false);
      if (phase === 'COLLECTING') setSecretText('');
      prevPhaseRef.current = phase;
      prevSecretRef.current = secret;
    }
  }, [phase, secret]);

  const handleSubmit = async () => {
    if (!secretText.trim() || secretText.trim().length < 5 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitSecret(secretText.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (playerId: string) => {
    if (isSubmitting || voted || hasSubmitted || playerId === currentPlayerId) return;
    setVoted(true);
    setIsSubmitting(true);
    try {
      await onVote(playerId);
    } catch {
      setVoted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emoji = (n: string | null) => (n ? EMOJIS[n] || '👤' : '👤');
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 10;

  if (revealResult) {
    return (
      <div className="max-w-lg mx-auto w-full px-1 text-center py-6">
        <div className="text-5xl mb-3">🎭</div>
        <h2 className="text-xl font-black text-white mb-2">Era di…</h2>
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl px-6 py-3">
          <span className="text-3xl">{emoji(revealResult.ownerAvatar)}</span>
          <span className="text-xl font-black text-white">{revealResult.ownerName}</span>
        </div>
      </div>
    );
  }

  if (phase === 'COLLECTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/50 p-4 mb-3 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">🤫</span>
            <h2 className="text-lg font-black text-white">Il tuo segreto</h2>
            {timeRemaining > 0 && (
              <span className={`text-sm font-black px-2 py-0.5 rounded-md ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
                {timeRemaining}s
              </span>
            )}
          </div>
          <p className="text-indigo-200/70 text-sm">Scrivi un aneddoto imbarazzante / divertente su di te.</p>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-black text-white">Segreto inviato</h3>
            <p className="text-indigo-200/70 text-sm">Aspetta gli altri…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Es. Una volta ho…"
              maxLength={500}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none touch-manipulation"
            />
            <div className="flex justify-between text-xs text-indigo-200/60">
              <span>{secretText.length}/500 (min 5)</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={secretText.trim().length < 5 || isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base py-3 disabled:opacity-40 active:scale-[0.98] touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isSubmitting ? '⏳ Invio…' : '🤐 Invia segreto'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-1">
      <div className="rounded-xl border border-purple-500/25 bg-purple-950/40 p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-purple-200/90 text-xs font-bold uppercase tracking-widest">Chi l&apos;ha scritto?</p>
          {timeRemaining > 0 && (
            <span className={`text-sm font-black px-2 py-0.5 rounded-md ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
              {timeRemaining}s
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-white leading-relaxed">&ldquo;{secret}&rdquo;</h2>
      </div>

      {hasSubmitted || voted ? (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">🤔</div>
          <h3 className="text-xl font-black text-white">Voto registrato</h3>
          <p className="text-purple-200/70 text-sm">Aspetta il reveal…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => {
            const isMe = p.id === currentPlayerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleVote(p.id)}
                disabled={isSubmitting || isMe}
                className={`rounded-xl p-3 min-h-[80px] touch-manipulation border transition-all active:scale-[0.98] ${
                  isMe
                    ? 'border-white/10 bg-white/5 opacity-40 cursor-not-allowed'
                    : 'border-white/15 bg-white/[0.08] active:bg-white/[0.15]'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="w-11 h-11 mx-auto rounded-full flex items-center justify-center text-xl mb-1.5 ring-2 ring-white/20"
                  style={{ backgroundColor: p.avatarColor || '#6B7280' }}
                >
                  {emoji(p.avatar)}
                </div>
                <p className="text-white font-bold text-xs truncate text-center">
                  {p.name}{isMe && ' (tu)'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SecretController;
