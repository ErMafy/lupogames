// 🐺 LUPO GAMES - Griglia Selezione Avatar PREMIUM
// Scegli la tua pedina con STILE

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { DEFAULT_AVATARS, AVATAR_COLORS } from '@/lib/utils';

interface AvatarGridProps {
  roomCode: string;
  playerId: string;
  currentAvatar?: string | null;
  onSelect: (avatar: string, color: string) => Promise<boolean>;
  takenAvatars: Map<string, { playerId: string; playerName: string }>;
}

export function AvatarGrid({
  playerId,
  currentAvatar,
  onSelect,
  takenAvatars,
}: AvatarGridProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar || null);
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAvatar) {
      setSelectedAvatar(currentAvatar);
    }
  }, [currentAvatar]);

  const handleAvatarClick = async (avatarName: string) => {
    const takenBy = takenAvatars.get(avatarName);
    if (takenBy && takenBy.playerId !== playerId) {
      setError(`${avatarName} è già stato preso da ${takenBy.playerName}!`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (selectedAvatar === avatarName) {
      return;
    }

    setIsSelecting(true);
    setError(null);

    try {
      const success = await onSelect(avatarName, selectedColor);
      if (success) {
        setSelectedAvatar(avatarName);
      } else {
        setError('Non sono riuscito a selezionare l\'avatar. Riprova!');
      }
    } catch {
      setError('Errore durante la selezione');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    if (selectedAvatar) {
      onSelect(selectedAvatar, color);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-black text-center text-white mb-6">
        <span className="text-gradient">🎭 Scegli il tuo Avatar</span>
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 glass-card border border-red-500/30 text-red-300 text-center font-medium animate-shake">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}

      {/* Avatar Grid Premium */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {DEFAULT_AVATARS.map((avatar, index) => {
          const takenBy = takenAvatars.get(avatar.name);
          const isTaken = takenBy && takenBy.playerId !== playerId;
          const isMine = takenBy?.playerId === playerId;

          return (
            <button
              key={avatar.name}
              onClick={() => handleAvatarClick(avatar.name)}
              disabled={isTaken || isSelecting}
              className={`
                relative aspect-square rounded-2xl
                flex flex-col items-center justify-center
                transition-all duration-300 transform
                ${isTaken 
                  ? 'bg-gray-800/50 opacity-40 cursor-not-allowed grayscale' 
                  : isMine
                    ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 scale-105 ring-4 ring-green-400/50 shadow-xl shadow-green-500/30'
                    : 'glass-card hover:scale-105 hover:ring-2 hover:ring-purple-400/50 active:scale-95'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Shine effect */}
              {!isTaken && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
                </div>
              )}
              
              <span className="relative text-3xl sm:text-4xl drop-shadow-lg">{avatar.emoji}</span>
              
              <span className="relative text-[10px] sm:text-xs text-white/70 mt-1 truncate w-full px-1 text-center font-medium">
                {avatar.name}
              </span>

              {/* Taken overlay */}
              {isTaken && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                  <span className="text-[10px] text-white/60 text-center px-1 font-medium">
                    {takenBy.playerName}
                  </span>
                </div>
              )}

              {/* Selection checkmark */}
              {isMine && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg shadow-green-500/50 ring-2 ring-white/30">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Color Selection Premium */}
      <div className="glass-card p-5 mb-6">
        <p className="text-sm text-purple-200/80 text-center mb-4 font-medium uppercase tracking-wider">
          🎨 Colore Pedina
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {AVATAR_COLORS.slice(0, 10).map((color) => (
            <button
              key={color}
              onClick={() => handleColorClick(color)}
              className={`
                w-10 h-10 rounded-full transition-all duration-300
                ${selectedColor === color 
                  ? 'ring-4 ring-white scale-125 shadow-lg' 
                  : 'ring-2 ring-white/20 hover:scale-110 hover:ring-white/40'
                }
              `}
              style={{ 
                backgroundColor: color,
                boxShadow: selectedColor === color ? `0 0 20px ${color}80` : undefined
              }}
            />
          ))}
        </div>
      </div>

      {/* Selection Preview Premium */}
      {selectedAvatar && (
        <div className="glass-card p-6 text-center animate-bounce-in">
          <p className="text-purple-200/80 text-sm mb-4 uppercase tracking-wider font-medium">La tua pedina</p>
          <div 
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-white font-bold text-lg shadow-xl"
            style={{ 
              backgroundColor: selectedColor,
              boxShadow: `0 10px 40px ${selectedColor}60`
            }}
          >
            <span className="text-3xl">
              {DEFAULT_AVATARS.find(a => a.name === selectedAvatar)?.emoji}
            </span>
            <span>{selectedAvatar}</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Image src="/logolupo.png" alt="Lupo" width={72} height={72} className="mx-auto animate-bounce mb-4 drop-shadow-2xl" />
            <p className="text-white font-bold">Selezionando...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarGrid;
