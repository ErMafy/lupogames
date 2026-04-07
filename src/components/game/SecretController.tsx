// 🐺 LUPO GAMES - Secret Controller
// Controller per "Chi è Stato?" - dove i segreti vengono a galla

'use client';

import { useState } from 'react';

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvatarEmoji = (avatarName: string | null): string => {
    if (!avatarName) return '👤';
    const avatars: Record<string, string> = {
      'Lupo': '🐺', 'Pecora': '🐑', 'Maiale': '🐷', 'Volpe': '🦊',
      'Orso': '🐻', 'Leone': '🦁', 'Tigre': '🐯', 'Panda': '🐼',
      'Coniglio': '🐰', 'Gatto': '🐱', 'Cane': '🐶', 'Unicorno': '🦄',
      'Drago': '🐲', 'Gufo': '🦉', 'Pinguino': '🐧',
    };
    return avatars[avatarName] || '👤';
  };

  // Fase raccolta segreti
  if (phase === 'COLLECTING') {
    return (
      <div className="flex flex-col min-h-[70vh]">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🤫</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Scrivi un Segreto!
          </h2>
          <p className="text-purple-200">
            Un aneddoto imbarazzante, una confessione, qualcosa che gli altri devranno indovinare sia tuo!
          </p>
        </div>

        {hasSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Segreto Inviato!
            </h3>
            <p className="text-purple-200">
              Aspetta che tutti scrivano il loro segreto...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <textarea
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Es: Una volta ho..."
              maxLength={500}
              className="flex-1 min-h-[150px] input-lupo text-lg resize-none mb-4"
              autoFocus
            />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-300 text-sm">
                {secretText.length}/500 caratteri (min 5)
              </span>
            </div>

            <button
              onClick={handleSubmitSecret}
              disabled={secretText.trim().length < 5 || isSubmitting}
              className="btn-lupo text-xl py-4 disabled:opacity-50"
            >
              {isSubmitting ? '⏳ Invio...' : '🤐 Invia Segreto'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fase indovinello
  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Il segreto da indovinare */}
      <div className="glass-card p-6 mb-6">
        <p className="text-purple-300 text-sm mb-2">Chi ha scritto questo?</p>
        <h2 className="text-xl font-bold text-white leading-relaxed">
          "{secret}"
        </h2>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white">
          🕵️ Chi pensi sia stato?
        </h3>
      </div>

      {hasSubmitted || selectedPlayer ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Voto Registrato!
          </h3>
          <p className="text-purple-200">
            Vediamo se hai indovinato...
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-3">
          {players.map((player) => {
            const isMe = player.id === currentPlayerId;
            return (
              <button
                key={player.id}
                onClick={() => handleVote(player.id)}
                disabled={isSubmitting || isMe}
                className={`p-4 rounded-xl text-center transition-all ${
                  isMe 
                    ? 'bg-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                }`}
              >
                <div 
                  className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2"
                  style={{ backgroundColor: player.avatarColor || '#6B7280' }}
                >
                  {getAvatarEmoji(player.avatar)}
                </div>
                <p className="text-white font-medium text-sm truncate">
                  {player.name}
                  {isMe && ' (Tu)'}
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
