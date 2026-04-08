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
    if (isSubmitting || voted || playerId === currentPlayerId) return;
    setVoted(true);
    setIsSubmitting(true);
    try {
      await onVote(playerId);
    } catch {
      // Don't reset voted — server already recorded the attempt or round moved on
    } finally {
      setIsSubmitting(false);
    }
  };

  const emoji = (n: string | null) => (n ? EMOJIS[n] || '👤' : '👤');
  const timerUrgent = timeRemaining > 0 && timeRemaining <= 10;

  if (revealResult) {
    return (
      <div className="max-w-lg mx-auto w-full px-1 text-center py-6 animate-success-pop">
        <div className="text-5xl mb-3">🎭</div>
        <h2 className="text-xl font-black text-white mb-3 text-glow-purple">Era di…</h2>
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl px-6 py-4 shadow-xl shadow-purple-600/20">
          <span className="text-3xl">{emoji(revealResult.ownerAvatar)}</span>
          <span className="text-xl font-black text-white">{revealResult.ownerName}</span>
        </div>
      </div>
    );
  }

  if (phase === 'COLLECTING') {
    return (
      <div className="max-w-lg mx-auto w-full px-1">
        <div className="glass-card-premium p-4 mb-3 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl">🤫</span>
            <h2 className="text-lg font-black text-white">Il tuo segreto</h2>
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
          <p className="text-indigo-200/60 text-sm">Scrivi un aneddoto imbarazzante / divertente su di te.</p>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-8 animate-success-pop">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3 animate-glow-ring">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-black text-white">Segreto inviato</h3>
            <p className="text-indigo-200/60 text-sm mt-1">Aspetta gli altri…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Es. Una volta ho…"
              maxLength={500}
              rows={3}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 resize-none touch-manipulation transition-all"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-indigo-200/50">{secretText.length}/500 (min 5)</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={secretText.trim().length < 5 || isSubmitting}
              className="btn-premium w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base py-3.5 disabled:opacity-40 shadow-lg shadow-indigo-600/20"
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
      <div className="glass-card-premium p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🕵️</span>
            <p className="text-purple-200/90 text-xs font-bold uppercase tracking-widest">Chi l&apos;ha scritto?</p>
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
        <h2 className="text-base font-bold text-white leading-relaxed">&ldquo;{secret}&rdquo;</h2>
      </div>

      {voted ? (
        <div className="text-center py-8 animate-success-pop">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-3 animate-glow-ring">
            <span className="text-3xl">🤔</span>
          </div>
          <h3 className="text-xl font-black text-white">Voto registrato</h3>
          <p className="text-purple-200/60 text-sm mt-1">Aspetta il reveal…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {players.map((p, i) => {
            const isMe = p.id === currentPlayerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleVote(p.id)}
                disabled={isSubmitting || isMe}
                className={`btn-premium rounded-2xl p-3 min-h-[80px] touch-manipulation border transition-all animate-fade-in-up ${
                  isMe
                    ? 'border-white/8 bg-white/[0.03] opacity-40 cursor-not-allowed'
                    : 'border-white/12 bg-white/[0.06] hover:bg-white/[0.12] hover:border-purple-400/30'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl mb-1.5 ring-2 ring-white/15 shadow-lg"
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
