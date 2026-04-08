'use client';

import { useState, useEffect } from 'react';

interface SecretControllerProps {
  phase: 'COLLECTING' | 'GUESSING';
  secret?: string;
  players?: { id: string; name: string; avatar: string | null; avatarColor: string | null }[];
  onSubmitSecret: (secret: string) => Promise<void>;
  onVote: (suspectedPlayerId: string) => Promise<void>;
  hasSubmitted: boolean;
  currentPlayerId: string;
}

export function SecretController({
  phase,
  secret,
  players = [],
  onSubmitSecret,
  onVote,
  hasSubmitted,
  currentPlayerId,
}: SecretControllerProps) {
  const [secretText, setSecretText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlayer(null);
    if (phase === 'COLLECTING') {
      setSecretText('');
    }
  }, [phase, secret]);

  const handleSubmitSecret = async () => {
    if (!secretText.trim() || secretText.trim().length < 5 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitSecret(secretText.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (playerId: string) => {
    if (isSubmitting || selectedPlayer || playerId === currentPlayerId) return;

    setSelectedPlayer(playerId);
    setIsSubmitting(true);
    try {
      await onVote(playerId);
    } catch {
      setSelectedPlayer(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvatarEmoji = (avatarName: string | null): string => {
    if (!avatarName) return '👤';
    const avatars: Record<string, string> = {
      Lupo: '🐺',
      Pecora: '🐑',
      Maiale: '🐷',
      Volpe: '🦊',
      Orso: '🐻',
      Leone: '🦁',
      Tigre: '🐯',
      Panda: '🐼',
      Coniglio: '🐰',
      Gatto: '🐱',
      Cane: '🐶',
      Unicorno: '🦄',
      Drago: '🐲',
      Gufo: '🦉',
      Pinguino: '🐧',
    };
    return avatars[avatarName] || '👤';
  };

  if (phase === 'COLLECTING') {
    return (
      <div className="flex flex-col min-h-[65vh] max-w-lg mx-auto w-full px-1">
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-violet-950/50 to-slate-950/80 p-5 mb-5 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.35)] text-center">
          <div className="text-5xl mb-3">🤫</div>
          <h2 className="text-xl font-black text-white mb-2">Il tuo segreto</h2>
          <p className="text-indigo-200/80 text-sm leading-relaxed">
            Scrivi un aneddoto imbarazzante o divertente su di te. Poi, a ogni round, tutti cercheranno di
            indovinare chi ha scritto cosa. Chiusura automatica a 60 secondi.
          </p>
        </div>

        {hasSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-black text-white mb-2">Segreto inviato</h3>
            <p className="text-indigo-200/80">Aspetta gli altri o la fine del tempo.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <textarea
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Es. Una volta ho…"
              maxLength={500}
              rows={6}
              className="w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-lg text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none touch-manipulation"
            />
            <div className="flex justify-between text-sm text-indigo-200/80">
              <span>{secretText.length}/500 (min 5)</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmitSecret()}
              disabled={secretText.trim().length < 5 || isSubmitting}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-lg py-4 min-h-[52px] shadow-lg disabled:opacity-45 active:scale-[0.98] touch-manipulation"
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
    <div className="flex flex-col min-h-[65vh] max-w-lg mx-auto w-full px-1 pb-8">
      <div className="rounded-2xl border border-purple-500/25 bg-purple-950/45 p-5 mb-5">
        <p className="text-purple-200/90 text-xs font-bold uppercase tracking-widest mb-2">
          Chi l&apos;ha scritto?
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
          &ldquo;{secret}&rdquo;
        </h2>
        <p className="text-purple-200/70 text-sm mt-3">
          Tocca il giocatore che pensi sia l&apos;autore. Non puoi votare te stesso. 60 secondi o tutti votano.
        </p>
      </div>

      {hasSubmitted || selectedPlayer ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="text-6xl mb-4">🤔</div>
          <h3 className="text-2xl font-black text-white mb-2">Voto registrato</h3>
          <p className="text-purple-200/80">Aspetta il reveal…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {players.map((player) => {
            const isMe = player.id === currentPlayerId;
            return (
              <button
                type="button"
                key={player.id}
                onClick={() => void handleVote(player.id)}
                disabled={isSubmitting || isMe}
                className={`rounded-2xl p-4 min-h-[100px] touch-manipulation border transition-all active:scale-[0.98] ${
                  isMe
                    ? 'border-white/10 bg-white/5 opacity-40 cursor-not-allowed'
                    : 'border-white/15 bg-white/[0.08] hover:bg-white/[0.14] shadow-md'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ring-2 ring-white/20"
                  style={{ backgroundColor: player.avatarColor || '#6B7280' }}
                >
                  {getAvatarEmoji(player.avatar)}
                </div>
                <p className="text-white font-bold text-sm truncate text-center">
                  {player.name}
                  {isMe && ' (tu)'}
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
