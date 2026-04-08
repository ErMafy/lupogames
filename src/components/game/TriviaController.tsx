// 🐺 LUPO GAMES - Controller Trivia PREMIUM
// 4 bottoni GIGANTI per rispondere - ESPERIENZA DA CONSOLE!

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
    correctAnswerText?: string;
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

  const sortedForRank = useMemo(() => {
    const arr = [...players];
    arr.sort((a, b) => {
      const ta = a.trackPosition ?? 0;
      const tb = b.trackPosition ?? 0;
      if (ta !== tb) return tb - ta;
      return b.score - a.score;
    });
    return arr;
  }, [players]);

  const myRank = currentPlayerId
    ? sortedForRank.findIndex((p) => p.playerId === currentPlayerId) + 1
    : 0;
  const rankLabel =
    sortedForRank.length === 0
      ? 'Classifica…'
      : myRank > 0
        ? `${myRank}° su ${sortedForRank.length}`
        : `— / ${sortedForRank.length}`;

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

  const wrongExplanation = (() => {
    if (!result || result.isCorrect) return null;
    const letter = result.correctAnswer as 'A' | 'B' | 'C' | 'D';
    const text =
      result.correctAnswerText?.trim() ||
      roundData.options[letter] ||
      '';
    return text ? `${letter}: ${text}` : `La lettera giusta era ${letter}`;
  })();

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
      shadow: 'shadow-red-500/40',
    },
    {
      key: 'B',
      gradient: 'from-blue-500 via-blue-600 to-blue-700',
      hoverGradient: 'hover:from-blue-400 hover:via-blue-500 hover:to-blue-600',
      shadow: 'shadow-blue-500/40',
    },
    {
      key: 'C',
      gradient: 'from-yellow-500 via-amber-500 to-orange-500',
      hoverGradient: 'hover:from-yellow-400 hover:via-amber-400 hover:to-orange-400',
      shadow: 'shadow-yellow-500/40',
    },
    {
      key: 'D',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      hoverGradient: 'hover:from-green-400 hover:via-emerald-400 hover:to-teal-400',
      shadow: 'shadow-green-500/40',
    },
  ];

  const topSafe = 'max(10px,env(safe-area-inset-top,0px))';
  const leftSafe = 'max(10px,env(safe-area-inset-left,0px))';

  return (
    <RotateScreenOverlay required="landscape">
      <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-3 sm:p-4 pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] overflow-hidden relative box-border">
        <div className="fixed inset-0 bg-stars pointer-events-none z-0" />

        {/* Classifica: posizione sempre visibile + podio apre pannello sospeso */}
        <div
          className="absolute z-50 flex flex-col items-start gap-1.5"
          style={{ top: topSafe, left: leftSafe }}
        >
          <div className="rounded-xl bg-black/45 backdrop-blur-md border border-white/15 px-2.5 py-1.5 shadow-lg">
            <p className="text-[11px] uppercase tracking-wide text-purple-200/90 font-bold">
              La tua posizione
            </p>
            <p className="text-base sm:text-lg font-black text-amber-300 leading-tight">
              {rankLabel}
            </p>
          </div>

          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowLeaderboard((v) => !v)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/90 to-orange-600/90 border-2 border-amber-200/80 shadow-lg flex items-center justify-center text-2xl active:opacity-90 touch-manipulation"
              aria-expanded={showLeaderboard}
              aria-label="Apri classifica"
            >
              🥇
            </motion.button>

            <AnimatePresence>
              {showLeaderboard && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[38] bg-black/35 sm:bg-transparent"
                    onClick={() => setShowLeaderboard(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="absolute left-0 top-[calc(100%+10px)] z-[48] w-[min(22rem,calc(100vw-2rem))] origin-top-left"
                  >
                    <div className="glass-card overflow-hidden shadow-2xl border border-white/20 ring-1 ring-white/10">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/20">
                        <span className="text-white font-bold text-sm flex items-center gap-2">
                          🏆 Classifica live
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLeaderboard(false)}
                          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg touch-manipulation flex items-center justify-center"
                          aria-label="Chiudi classifica"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="max-h-[min(55dvh,22rem)] overflow-y-auto overscroll-contain p-2">
                        {players.length === 0 ? (
                          <p className="text-purple-200 text-sm text-center py-6 px-2">
                            Caricamento classifica…
                          </p>
                        ) : (
                          <LiveLeaderboard
                            bare
                            players={players}
                            currentPlayerId={currentPlayerId}
                            gameType="TRIVIA"
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative z-10 text-center mb-3 mt-1 px-14 sm:px-16">
          <div className="inline-block glass-card px-6 py-3 max-w-[80vw]">
            <p className="text-white text-sm sm:text-lg font-bold line-clamp-3">
              {roundData.question}
            </p>
          </div>
        </div>

        <div className="relative z-20 grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4 flex-1 min-h-0 isolate">
          {answerOptions.map(({ key, gradient, hoverGradient, shadow }) => {
            const isSelected = selectedAnswer === key;
            const isCorrect = result?.correctAnswer === key;
            const isWrong = isSelected && result && !result.isCorrect;

            let buttonClasses = `bg-gradient-to-br ${gradient} ${hoverGradient} shadow-2xl ${shadow}`;
            let extraEffects = '';

            if (result) {
              if (isCorrect) {
                buttonClasses =
                  'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-2xl shadow-green-500/60';
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
                type="button"
                key={key}
                onClick={() => void handleAnswer(key)}
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
                  touch-manipulation
                  select-none
                  min-h-[44px]
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                <span
                  className="relative z-[1] text-5xl sm:text-7xl font-black drop-shadow-2xl"
                  style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                >
                  {key}
                </span>

                <span className="relative z-[1] text-xs sm:text-sm px-3 text-center line-clamp-2 leading-tight mt-2 opacity-90">
                  {roundData.options[key]}
                </span>

                {isSelected && !result && (
                  <div className="absolute top-3 right-3 z-[2] pointer-events-none">
                    <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                      {isSubmitting ? (
                        <span className="animate-spin text-lg">⏳</span>
                      ) : (
                        <span className="text-green-600 text-lg font-bold">✓</span>
                      )}
                    </div>
                  </div>
                )}

                {result && isCorrect && (
                  <div className="absolute top-3 right-3 z-[2] text-4xl animate-bounce pointer-events-none">
                    ✅
                  </div>
                )}
                {result && isWrong && (
                  <div className="absolute top-3 right-3 z-[2] text-4xl pointer-events-none">
                    ❌
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {result && (
          <div
            className={`
            fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50
            max-w-[94vw] px-5 py-3 rounded-2xl font-bold text-white text-base sm:text-lg
            shadow-2xl backdrop-blur-sm text-center
            animate-bounce-in
            ${
              result.isCorrect
                ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 shadow-green-500/50'
                : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 shadow-red-500/50'
            }
          `}
          >
            {result.isCorrect ? (
              <span className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-3xl">🎉</span>
                Giusto! +{result.pointsEarned} punti
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">😢</span>
                  <span>Sbagliato!</span>
                </span>
                <span className="text-sm sm:text-base font-black text-yellow-100 leading-snug">
                  Risposta giusta: {wrongExplanation}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </RotateScreenOverlay>
  );
}

export default TriviaController;
