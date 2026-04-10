// 🐺 LUPO GAMES - Live Leaderboard Mini
// Classifica compatta in tempo reale per i giocatori

'use client';

import { motion } from 'framer-motion';

interface LiveLeaderboardProps {
  players: Array<{
    playerId: string;
    playerName: string;
    avatar: string | null;
    score: number;
    trackPosition?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
  }>;
  currentPlayerId?: string;
  gameType?: 'TRIVIA' | 'PROMPT' | 'SECRET';
  compact?: boolean;
  /** Nessuna card esterna (es. dentro pannello già incorniciato) */
  bare?: boolean;
  /** Snapshot of scores at game start — when provided, displays per-game deltas */
  scoreSnapshot?: Record<string, number>;
}

export function LiveLeaderboard({ 
  players, 
  currentPlayerId, 
  gameType = 'TRIVIA',
  compact = false,
  bare = false,
  scoreSnapshot,
}: LiveLeaderboardProps) {
  const displayPlayers = scoreSnapshot
    ? players.map(p => ({ ...p, score: Math.max(0, p.score - (scoreSnapshot[p.playerId] || 0)) }))
    : players;
  const sortedPlayers = [...displayPlayers].sort((a, b) => {
    if (gameType === 'TRIVIA' && a.trackPosition !== undefined && b.trackPosition !== undefined) {
      if (a.trackPosition !== b.trackPosition) {
        return b.trackPosition - a.trackPosition;
      }
    }
    if (a.score !== b.score) return b.score - a.score;
    return a.playerName.localeCompare(b.playerName);
  });

  const currentPlayerRank = sortedPlayers.findIndex(p => p.playerId === currentPlayerId) + 1;

  if (compact) {
    return (
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-purple-200 font-bold">La tua posizione</div>
          <div className="text-2xl font-black text-yellow-400">
            {currentPlayerRank > 0 ? `#${currentPlayerRank}` : '-'}
          </div>
        </div>
        <div className="text-xs text-purple-300">
          {sortedPlayers.length} giocatori
        </div>
      </div>
    );
  }

  const list = (
    <>
      {!bare && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            🏆 Classifica Live
          </h3>
          {currentPlayerRank > 0 && (
            <div className="glass-card px-3 py-1">
              <span className="text-yellow-400 font-black text-sm">
                #{currentPlayerRank}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`space-y-2 ${bare ? 'max-h-none' : 'max-h-64'} overflow-y-auto`}>
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player.playerId === currentPlayerId;
          const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

          return (
            <motion.div
              key={player.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-3 p-2 rounded-lg transition-all
                ${isCurrentPlayer 
                  ? 'bg-yellow-500/20 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                  : 'bg-white/5'
                }
              `}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {rankEmoji || (
                  <span className="text-white/60 text-sm font-bold">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="text-2xl">
                {getAvatarEmoji(player.avatar)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className={`
                  text-sm font-medium truncate
                  ${isCurrentPlayer ? 'text-yellow-300 font-bold' : 'text-white'}
                `}>
                  {player.playerName}
                  {isCurrentPlayer && ' (Tu)'}
                </div>
                
                {/* Stats based on game type */}
                {gameType === 'TRIVIA' && (
                  <div className="text-xs text-purple-300">
                    {player.trackPosition !== undefined && (
                      <span>Pos: {player.trackPosition}/15 • </span>
                    )}
                    {player.correctAnswers !== undefined && player.wrongAnswers !== undefined && (
                      <span className="text-green-400">{player.correctAnswers}✓</span>
                    )}
                    {player.wrongAnswers !== undefined && player.wrongAnswers > 0 && (
                      <span className="text-red-400 ml-1">{player.wrongAnswers}✗</span>
                    )}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className={`
                text-right font-black
                ${isCurrentPlayer ? 'text-yellow-400 text-lg' : 'text-white text-sm'}
              `}>
                {player.score}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );

  if (bare) {
    return <div className="p-1">{list}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 max-w-sm"
    >
      {list}
    </motion.div>
  );
}

// Helper per ottenere l'emoji dell'avatar
function getAvatarEmoji(avatarName: string | null): string {
  if (!avatarName) return '🐺';
  
  const avatars: Record<string, string> = {
    'Lupo': '🐺',
    'Pecora': '🐑',
    'Maiale': '🐷',
    'Volpe': '🦊',
    'Orso': '🐻',
    'Leone': '🦁',
    'Tigre': '🐯',
    'Panda': '🐼',
    'Coniglio': '🐰',
    'Gatto': '🐱',
    'Cane': '🐶',
    'Unicorno': '🦄',
    'Drago': '🐲',
    'Gufo': '🦉',
    'Pinguino': '🐧',
  };
  return avatars[avatarName] || '🐺';
}
