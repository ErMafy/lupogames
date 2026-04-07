// 🐺 LUPO GAMES - Pista del Trivia (Host View)
// 15 corsie con le pedine che avanzano - La Corsa del Sapere!

'use client';

import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@/types';

interface TriviaTrackProps {
  players: LeaderboardEntry[];
  trackLength?: number; // Numero di caselle per vincere
  currentQuestion?: string;
  timeRemaining?: number;
  showQuestion?: boolean;
}

export function TriviaTrack({
  players,
  trackLength = 15,
  currentQuestion,
  timeRemaining,
  showQuestion = false,
}: TriviaTrackProps) {
  const [animatedPositions, setAnimatedPositions] = useState<Map<string, number>>(new Map());

  // Anima le posizioni quando cambiano
  useEffect(() => {
    const newPositions = new Map<string, number>();
    players.forEach(p => {
      newPositions.set(p.playerId, p.trackPosition);
    });
    setAnimatedPositions(newPositions);
  }, [players]);

  // Ordina i giocatori per posizione (chi è avanti sta in alto visivamente... o no?)
  const sortedPlayers = [...players].sort((a, b) => b.trackPosition - a.trackPosition);

  return (
    <div className="w-full h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 p-4 overflow-hidden">
      {/* Header con domanda e timer */}
      {showQuestion && currentQuestion && (
        <div className="mb-6 text-center">
          {/* Timer */}
          {timeRemaining !== undefined && (
            <div className={`
              text-6xl font-black mb-4
              ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}
            `}>
              {timeRemaining}
            </div>
          )}
          
          {/* Domanda */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-4xl mx-auto">
            <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed">
              {currentQuestion}
            </p>
          </div>
        </div>
      )}

      {/* Pista di gara */}
      <div className="relative bg-black/20 rounded-3xl p-4 overflow-hidden">
        {/* Linee della pista */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: trackLength + 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-white/10 last:border-r-0"
            />
          ))}
        </div>

        {/* Linea del traguardo */}
        <div 
          className="absolute top-0 bottom-0 w-2 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600"
          style={{ right: '5%' }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">🏁</div>
        </div>

        {/* Corsie dei giocatori */}
        <div className="relative space-y-2">
          {sortedPlayers.map((player, index) => {
            const position = animatedPositions.get(player.playerId) ?? player.trackPosition;
            const progressPercent = Math.min((position / trackLength) * 95, 95); // Max 95% per lasciare spazio al traguardo

            return (
              <div
                key={player.playerId}
                className="relative h-12 sm:h-14 bg-white/5 rounded-lg overflow-hidden"
              >
                {/* Barra di progresso sottile */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Pedina del giocatore */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center"
                  style={{ left: `calc(${progressPercent}% - 1.5rem)` }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-lg border-2 border-white/50"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.avatar ? getAvatarEmoji(player.avatar) : '🐺'}
                  </div>
                </div>

                {/* Nome e punteggio a sinistra */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-white/80 font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-[150px]">
                    {player.playerName}
                  </span>
                  <span className="text-yellow-400 font-bold text-xs sm:text-sm">
                    {player.score}pt
                  </span>
                </div>

                {/* Posizione corsia */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                  {position}/{trackLength}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicatori caselle in basso */}
        <div className="flex justify-between mt-4 px-2">
          {Array.from({ length: trackLength + 1 }).map((_, i) => (
            <div key={i} className="text-white/30 text-xs">
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* Classifica laterale (opzionale per schermi grandi) */}
      <div className="hidden lg:block fixed right-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm rounded-2xl p-4 w-64">
        <h3 className="text-white font-bold text-lg mb-3 text-center">🏆 Classifica</h3>
        <div className="space-y-2">
          {sortedPlayers.slice(0, 5).map((player, index) => (
            <div
              key={player.playerId}
              className="flex items-center gap-2 bg-white/10 rounded-lg p-2"
            >
              <span className="text-lg">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <span className="text-2xl">{getAvatarEmoji(player.avatar)}</span>
              <span className="flex-1 text-white text-sm truncate">{player.playerName}</span>
              <span className="text-yellow-400 font-bold text-sm">{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper per ottenere l'emoji dell'avatar
function getAvatarEmoji(avatarName: string): string {
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

export default TriviaTrack;
