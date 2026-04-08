// 🐺 LUPO GAMES - Controller Trivia — mobile-first (portrait ok)
// Domanda sempre visibile + risposte compatte in colonna

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
      ? '…'
      : myRank > 0
        ? `${myRank}° / ${sortedForRank.length}`
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
    letterBg: string;
  }> = [
    {
      key: 'A',
      gradient: 'from-red-600 to-red-800',
      hoverGradient: 'active:from-red-500 active:to-red-700',
      shadow: 'shadow-red-900/30',
      letterBg: 'bg-red-950/80',
    },
    {
      key: 'B',
      gradient: 'from-blue-600 to-blue-800',
      hoverGradient: 'active:from-blue-500 active:to-blue-700',
      shadow: 'shadow-blue-900/30',
      letterBg: 'bg-blue-950/80',
    },
    {
      key: 'C',
      gradient: 'from-amber-600 to-orange-700',
      hoverGradient: 'active:from-amber-500 active:to-orange-600',
      shadow: 'shadow-amber-900/30',
      letterBg: 'bg-amber-950/80',
    },
    {
      key: 'D',
      gradient: 'from-emerald-600 to-teal-700',
      hoverGradient: 'active:from-emerald-500 active:to-teal-600',
      shadow: 'shadow-emerald-900/30',
      letterBg: 'bg-emerald-950/80',
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 box-border px-2 pb-[max(4px,env(safe-area-inset-bottom,0px))] pt-1">
      <div className="pointer-events-none fixed inset-0 z-0 bg-stars" />

      {/* Barra compatta: classifica + podio */}
      <div className="relative z-50 mb-1 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200/80">
            Posizione
          </p>
          <p className="truncate text-sm font-black leading-tight text-amber-300">{rankLabel}</p>
        </div>

        <div className="relative shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowLeaderboard((v) => !v)}
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-500/90 to-orange-600/90 text-lg shadow-md active:opacity-90"
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
                  className="fixed inset-0 z-[38] bg-black/40"
                  onClick={() => setShowLeaderboard(false)}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-[48] w-[min(20rem,calc(100vw-1.5rem))] origin-top-right"
                >
                  <div className="glass-card overflow-hidden border border-white/20 shadow-2xl ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/20 px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                        🏆 Live
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLeaderboard(false)}
                        className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white"
                        aria-label="Chiudi classifica"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="max-h-[min(50dvh,18rem)] overflow-y-auto overscroll-contain p-1.5">
                      {players.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-purple-200">
                          Caricamento…
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

      {/* Domanda: sempre leggibile, scroll se lunga */}
      <div className="relative z-10 mb-2 min-h-0 shrink-0">
        <div className="max-h-[min(34vh,220px)] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 backdrop-blur-sm sm:max-h-[min(30vh,260px)]">
          <p className="text-left text-[15px] font-bold leading-snug text-white sm:text-base">
            {roundData.question}
          </p>
        </div>
      </div>

      {/* Risposte: colonna compatta */}
      <div className="relative z-20 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {answerOptions.map(({ key, gradient, hoverGradient, shadow, letterBg }) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = result?.correctAnswer === key;
          const isWrong = isSelected && result && !result.isCorrect;

          let buttonClasses = `bg-gradient-to-r ${gradient} ${hoverGradient} ${shadow}`;
          let ringClass = 'ring-1 ring-white/15';

          if (result) {
            if (isCorrect) {
              buttonClasses = 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-md shadow-green-900/40';
              ringClass = 'ring-2 ring-green-300';
            } else if (isWrong) {
              buttonClasses = 'bg-gradient-to-r from-red-900/90 to-gray-900';
              ringClass = 'ring-1 ring-red-500/40 opacity-70';
            } else if (!isSelected) {
              buttonClasses = 'bg-gradient-to-r from-gray-800 to-gray-900';
              ringClass = 'ring-1 ring-white/5 opacity-40';
            }
          } else if (isSelected) {
            ringClass = 'ring-2 ring-white/70';
          }

          return (
            <button
              type="button"
              key={key}
              onClick={() => void handleAnswer(key)}
              disabled={hasAnswered || isSubmitting}
              className={`
                ${buttonClasses}
                ${ringClass}
                flex w-full shrink-0 flex-row items-center gap-2.5 rounded-xl
                px-2.5 py-2 text-left text-white transition-transform
                active:scale-[0.99]
                disabled:cursor-not-allowed
                touch-manipulation select-none
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${letterBg} text-white shadow-inner`}
              >
                {key}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug sm:text-sm">
                {roundData.options[key]}
              </span>

              {isSelected && !result && (
                <span className="shrink-0 text-base">
                  {isSubmitting ? <span className="inline-block animate-spin">⏳</span> : '✓'}
                </span>
              )}
              {result && isCorrect && <span className="shrink-0 text-base">✅</span>}
              {result && isWrong && <span className="shrink-0 text-base">❌</span>}
            </button>
          );
        })}
      </div>

      {result && (
        <div
          className={`
            relative z-50 mt-2 shrink-0 rounded-xl px-3 py-2 text-center text-sm font-bold text-white shadow-lg
            ${
              result.isCorrect
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-red-600 to-rose-600'
            }
          `}
        >
          {result.isCorrect ? (
            <span className="flex flex-wrap items-center justify-center gap-2">
              <span>🎉</span>
              <span>Giusto! +{result.pointsEarned} pt</span>
            </span>
          ) : (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center justify-center gap-2">
                <span>😢</span> Sbagliato
              </span>
              <span className="text-xs font-bold leading-snug text-yellow-100">
                {wrongExplanation}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TriviaController;
