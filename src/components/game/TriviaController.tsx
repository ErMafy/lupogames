// 🐺 LUPO GAMES - Controller Trivia PREMIUM
// 4 bottoni GIGANTI per rispondere - ESPERIENZA DA CONSOLE!

'use client';

import { useState, useRef, useEffect } from 'react';
import { RotateScreenOverlay } from './RotateScreenOverlay';
import { LiveLeaderboard } from './LiveLeaderboard';
import type { TriviaRoundData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface TriviaControllerProps {
  roundData: TriviaRoundData;
  onAnswer: (answer: 'A' | 'B' | 'C' | 'D', responseTimeMs: number) => Promise<void>;
  hasAnswered: boolean;
  result?: {
    isCorrect: boolean;
    correctAnswer: string;
    pointsEarned: number;
  };
  players?: Array<{
    playerId: string;
    playerName: string;
    avatar: string | null;
    score: number;
    trackPosition?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
  }>;
  currentPlayerId?: string;
}

export function TriviaController({
  roundData,
  onAnswer,
  hasAnswered,
  result,
  players = [],
  currentPlayerId,
}: TriviaControllerProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitting(false);
    startTimeRef.current = Date.now();
  }, [roundData.questionId]);

  const handleAnswer = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered || isSubmitting) return;

    setSelectedAnswer(answer);
    setIsSubmitting(true);

    const responseTimeMs = Date.now() - startTimeRef.current;
    
    try {
      await onAnswer(answer, responseTimeMs);
    } catch (error) {
      console.error('Errore invio risposta:', error);
      setIsSubmitting(false);
      setSelectedAnswer(null);
    }
  };

  const answerOptions: Array<{ 
    key: 'A' | 'B' | 'C' | 'D'; 
    gradient: string;
    hoverGradient: string;
    shadow: string;
  }> = [
    { 
      key: 'A', 
      gradient: 'from-red-500 via-red-600 to-red-700', 
      hoverGradient: 'hover:from-red-400 hover:via-red-500 hover:to-red-600',
      shadow: 'shadow-red-500/40'
    },
    { 
      key: 'B', 
      gradient: 'from-blue-500 via-blue-600 to-blue-700', 
      hoverGradient: 'hover:from-blue-400 hover:via-blue-500 hover:to-blue-600',
      shadow: 'shadow-blue-500/40'
    },
    { 
      key: 'C', 
      gradient: 'from-yellow-500 via-amber-500 to-orange-500', 
      hoverGradient: 'hover:from-yellow-400 hover:via-amber-400 hover:to-orange-400',
      shadow: 'shadow-yellow-500/40'
    },
    { 
      key: 'D', 
      gradient: 'from-green-500 via-emerald-500 to-teal-500', 
      hoverGradient: 'hover:from-green-400 hover:via-emerald-400 hover:to-teal-400',
      shadow: 'shadow-green-500/40'
    },
  ];

  return (
    <RotateScreenOverlay required="landscape">
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-3 sm:p-4 overflow-hidden relative">
        {/* Stars background */}
        <div className="fixed inset-0 bg-stars pointer-events-none" />
        
        {/* Leaderboard Toggle Button - Fixed Top Right */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-purple-600/80 backdrop-blur-sm border-2 border-purple-400 flex items-center justify-center text-2xl shadow-lg hover:bg-purple-500/80 transition-all"
        >
          {showLeaderboard ? '✖️' : '🏆'}
        </motion.button>

        {/* Leaderboard Overlay */}
        <AnimatePresence>
          {showLeaderboard && players.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-16 right-4 z-40 max-w-sm"
            >
              <LiveLeaderboard
                players={players}
                currentPlayerId={currentPlayerId}
                gameType="TRIVIA"
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Question Banner Premium */}
        <div className="relative z-10 text-center mb-3">
          <div className="inline-block glass-card px-6 py-3 max-w-[80vw]">
            <p className="text-white text-sm sm:text-lg font-bold line-clamp-2">
              {roundData.question}
            </p>
          </div>
        </div>

        {/* 2x2 Button Grid Premium */}
        <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 h-[calc(100%-5rem)]">
          {answerOptions.map(({ key, gradient, hoverGradient, shadow }) => {
            const isSelected = selectedAnswer === key;
            const isCorrect = result?.correctAnswer === key;
            const isWrong = isSelected && result && !result.isCorrect;

            let buttonClasses = `bg-gradient-to-br ${gradient} ${hoverGradient} shadow-2xl ${shadow}`;
            let extraEffects = '';
            
            if (result) {
              if (isCorrect) {
                buttonClasses = 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-2xl shadow-green-500/60';
                extraEffects = 'ring-4 ring-green-300 animate-pulse scale-105';
              } else if (isWrong) {
                buttonClasses = 'bg-gradient-to-br from-red-800 via-red-900 to-gray-800';
                extraEffects = 'opacity-50 scale-95';
              } else if (!isSelected) {
                buttonClasses = 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900';
                extraEffects = 'opacity-30 scale-95';
              }
            } else if (isSelected) {
              extraEffects = 'ring-4 ring-white/80 scale-95';
            }

            return (
              <button
                key={key}
                onClick={() => handleAnswer(key)}
                disabled={hasAnswered || isSubmitting}
                className={`
                  ${buttonClasses}
                  ${extraEffects}
                  rounded-3xl
                  flex flex-col items-center justify-center
                  text-white font-bold
                  transition-all duration-300 transform
                  active:scale-90
                  disabled:cursor-not-allowed
                  relative overflow-hidden
                  border border-white/10
                `}
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                
                {/* Letter */}
                <span className="relative text-5xl sm:text-7xl font-black drop-shadow-2xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  {key}
                </span>
                
                {/* Answer text */}
                <span className="relative text-xs sm:text-sm px-3 text-center line-clamp-2 leading-tight mt-2 opacity-90">
                  {roundData.options[key]}
                </span>

                {/* Selection indicator */}
                {isSelected && !result && (
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                      {isSubmitting ? (
                        <span className="animate-spin text-lg">⏳</span>
                      ) : (
                        <span className="text-green-600 text-lg font-bold">✓</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Result icons */}
                {result && isCorrect && (
                  <div className="absolute top-3 right-3 text-4xl animate-bounce">
                    ✅
                  </div>
                )}
                {result && isWrong && (
                  <div className="absolute top-3 right-3 text-4xl">
                    ❌
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Result Feedback Premium */}
        {result && (
          <div className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            px-8 py-4 rounded-2xl font-black text-white text-lg sm:text-xl
            shadow-2xl backdrop-blur-sm
            animate-bounce-in
            ${result.isCorrect 
              ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 shadow-green-500/50' 
              : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 shadow-red-500/50'
            }
          `}>
            {result.isCorrect 
              ? (
                <span className="flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  Giusto! +{result.pointsEarned} punti
                </span>
              )
              : (
                <span className="flex items-center gap-3">
                  <span className="text-3xl">😢</span>
                  Sbagliato! Era {result.correctAnswer}
                </span>
              )
            }
          </div>
        )}
      </div>
    </RotateScreenOverlay>
  );
}

export default TriviaController;
