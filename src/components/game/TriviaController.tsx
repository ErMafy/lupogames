'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { LiveLeaderboard } from './LiveLeaderboard';
import type { TriviaRoundData } from '@/types';

interface TriviaControllerProps {
  roundData: TriviaRoundData;
  onAnswer: (answer: 'A' | 'B' | 'C' | 'D', responseTimeMs: number) => Promise<void>;
  hasAnswered: boolean;
  timeRemaining?: number;
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

const COLORS: Record<string, { bg: string; active: string; letter: string }> = {
  A: { bg: 'bg-red-700', active: 'active:bg-red-600', letter: 'bg-red-900' },
  B: { bg: 'bg-blue-700', active: 'active:bg-blue-600', letter: 'bg-blue-900' },
  C: { bg: 'bg-amber-600', active: 'active:bg-amber-500', letter: 'bg-amber-800' },
  D: { bg: 'bg-emerald-700', active: 'active:bg-emerald-600', letter: 'bg-emerald-900' },
};

export function TriviaController({
  roundData,
  onAnswer,
  hasAnswered,
  timeRemaining = 0,
  result,
  players = [],
  currentPlayerId,
}: TriviaControllerProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const startTimeRef = useRef(Date.now());

  const sorted = useMemo(() => {
    const a = [...players];
    a.sort((x, y) => (y.trackPosition ?? 0) - (x.trackPosition ?? 0) || y.score - x.score);
    return a;
  }, [players]);

  const myRank = currentPlayerId ? sorted.findIndex((p) => p.playerId === currentPlayerId) + 1 : 0;

  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitting(false);
    startTimeRef.current = Date.now();
  }, [roundData.questionId]);

  const pick = async (key: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered || isSubmitting) return;
    setSelectedAnswer(key);
    setIsSubmitting(true);
    try {
      await onAnswer(key, Date.now() - startTimeRef.current);
    } catch {
      setIsSubmitting(false);
      setSelectedAnswer(null);
    }
  };

  const wrongText = (() => {
    if (!result || result.isCorrect) return null;
    const k = result.correctAnswer as 'A' | 'B' | 'C' | 'D';
    const t = result.correctAnswerText?.trim() || roundData.options[k] || '';
    return t ? `${k}: ${t}` : `Risposta giusta: ${k}`;
  })();

  const timerUrgent = timeRemaining > 0 && timeRemaining <= 5;

  return (
    <div className="flex w-full flex-col gap-2 px-2 py-1">
      {/* Barra: timer + posizione + classifica */}
      <div className="flex items-center gap-2">
        {timeRemaining > 0 && (
          <div className={`shrink-0 rounded-lg px-2.5 py-1 text-center font-black text-lg leading-none ${timerUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'}`}>
            {timeRemaining}s
          </div>
        )}
        <div className="min-w-0 flex-1 rounded-lg bg-black/30 px-2 py-1">
          <span className="text-[10px] uppercase text-purple-200/70 font-bold">Pos. </span>
          <span className="text-sm font-black text-amber-300">
            {myRank > 0 ? `${myRank}°/${sorted.length}` : '…'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowBoard((v) => !v)}
          className="shrink-0 h-8 w-8 rounded-lg bg-amber-600 text-sm flex items-center justify-center touch-manipulation"
        >
          🏆
        </button>
      </div>

      {/* Classifica dropdown */}
      {showBoard && (
        <div className="rounded-xl border border-white/15 bg-black/60 backdrop-blur-md p-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white">🏆 Classifica</span>
            <button type="button" onClick={() => setShowBoard(false)} className="text-white/60 text-xs px-1">✕</button>
          </div>
          {players.length === 0 ? (
            <p className="text-xs text-purple-200 text-center py-2">Caricamento…</p>
          ) : (
            <LiveLeaderboard bare players={players} currentPlayerId={currentPlayerId} gameType="TRIVIA" />
          )}
        </div>
      )}

      {/* Domanda */}
      <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 max-h-[30vh] overflow-y-auto">
        <p className="text-[15px] font-bold text-white leading-snug">{roundData.question}</p>
      </div>

      {/* Risposte A/B/C/D in colonna */}
      <div className="flex flex-col gap-2">
        {(['A', 'B', 'C', 'D'] as const).map((key) => {
          const c = COLORS[key];
          const isSel = selectedAnswer === key;
          const isRight = result?.correctAnswer === key;
          const isWrong = isSel && result && !result.isCorrect;

          let bg = `${c.bg} ${c.active}`;
          let extra = '';
          if (result) {
            if (isRight) { bg = 'bg-green-600'; extra = 'ring-2 ring-green-300'; }
            else if (isWrong) { bg = 'bg-red-900/80'; extra = 'opacity-60'; }
            else { bg = 'bg-gray-800'; extra = 'opacity-40'; }
          } else if (isSel) {
            extra = 'ring-2 ring-white/70';
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => void pick(key)}
              disabled={hasAnswered || isSubmitting}
              className={`${bg} ${extra} flex w-full items-center gap-3 rounded-xl px-3 py-3 text-white text-left transition-transform active:scale-[0.98] disabled:cursor-not-allowed touch-manipulation select-none`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className={`${c.letter} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-black`}>
                {key}
              </span>
              <span className="flex-1 text-sm font-semibold leading-snug">{roundData.options[key]}</span>
              {isSel && !result && <span className="shrink-0">{isSubmitting ? '⏳' : '✓'}</span>}
              {result && isRight && <span className="shrink-0">✅</span>}
              {result && isWrong && <span className="shrink-0">❌</span>}
            </button>
          );
        })}
      </div>

      {/* Risultato */}
      {result && (
        <div className={`rounded-xl px-3 py-2 text-center text-sm font-bold text-white ${result.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
          {result.isCorrect ? (
            <span>🎉 Giusto! +{result.pointsEarned} pt</span>
          ) : (
            <span className="flex flex-col gap-0.5">
              <span>😢 Sbagliato</span>
              <span className="text-xs text-yellow-100">{wrongText}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TriviaController;
