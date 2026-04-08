// 🐺 LUPO GAMES - Hook per Game Events
// Gestisce tutti gli eventi di gioco in modo centralizzato

'use client';

import { useState, useCallback, useRef } from 'react';
import type { 
  GameType, 
  ControllerView,
  TriviaRoundData,
  PromptRoundData,
  SecretRoundData,
} from '@/types';

interface GameEventState {
  currentGame: GameType | null;
  currentRound: number;
  totalRounds: number;
  controllerView: ControllerView;
  roundData: TriviaRoundData | PromptRoundData | SecretRoundData | null;
  timeRemaining: number;
  canSubmit: boolean;
  hasSubmitted: boolean;
}

export function useGameEvents() {
  const [state, setState] = useState<GameEventState>({
    currentGame: null,
    currentRound: 0,
    totalRounds: 0,
    controllerView: 'waiting',
    roundData: null,
    timeRemaining: 0,
    canSubmit: false,
    hasSubmitted: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // 🎮 HANDLER EVENTI
  // ============================================

  const handleGameStarted = useCallback((data: { gameType: GameType; totalRounds: number }) => {
    setState(prev => ({
      ...prev,
      currentGame: data.gameType,
      totalRounds: data.totalRounds,
      currentRound: 0,
      hasSubmitted: false,
      controllerView:
        data.gameType === 'WHO_WAS_IT' ? 'secret-write' : prev.controllerView,
    }));
  }, []);

  const handleRoundStarted = useCallback((data: {
    roundNumber: number;
    gameType: GameType;
    phase?: string;
    data: TriviaRoundData | PromptRoundData | SecretRoundData | Record<string, unknown>;
  }) => {
    let view: ControllerView = 'waiting';
    let timeLimit = 0;
    let roundPayload: TriviaRoundData | PromptRoundData | SecretRoundData | Record<string, unknown> =
      data.data;

    switch (data.gameType) {
      case 'TRIVIA': {
        const t = data.data as TriviaRoundData;
        view = 'trivia-answer';
        timeLimit = t.timeLimit;
        roundPayload = t;
        break;
      }
      case 'CONTINUE_PHRASE': {
        const inner = data.data as PromptRoundData;
        const phase = inner.phase ?? (data.phase as PromptRoundData['phase']) ?? 'WRITING';
        roundPayload = { ...inner, phase };
        view = phase === 'WRITING' ? 'prompt-write' : 'prompt-vote';
        timeLimit = inner.timeLimit;
        break;
      }
      case 'WHO_WAS_IT': {
        const inner = data.data as Record<string, unknown>;
        const phase =
          (inner.phase as string) ||
          (data.phase as string) ||
          'GUESSING';
        const secretContent = (inner.secretContent ?? inner.secret ?? '') as string;
        const players = (inner.players as SecretRoundData['players']) || [];
        roundPayload = {
          ...inner,
          secretContent,
          phase: phase as SecretRoundData['phase'],
          players,
        } as SecretRoundData;
        view = phase === 'COLLECTING' ? 'secret-write' : 'secret-vote';
        timeLimit = typeof inner.timeLimit === 'number' ? inner.timeLimit : 60;
        break;
      }
    }

    setState(prev => ({
      ...prev,
      currentRound: data.roundNumber,
      roundData: roundPayload as TriviaRoundData | PromptRoundData | SecretRoundData,
      controllerView: view,
      timeRemaining: timeLimit,
      canSubmit: true,
      hasSubmitted: false,
    }));

    startTimer(timeLimit);
  }, []);

  const handleTimerTick = useCallback((data: { timeRemaining: number }) => {
    setState(prev => ({
      ...prev,
      timeRemaining: data.timeRemaining,
    }));
  }, []);

  const handleShowResults = useCallback(() => {
    // Ferma il timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      controllerView: 'results',
      canSubmit: false,
    }));
  }, []);

  const handleGameEnded = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      controllerView: 'final-scores',
      canSubmit: false,
    }));
  }, []);

  // ============================================
  // ⏱️ TIMER LOCALE
  // ============================================

  const startTimer = useCallback((seconds: number) => {
    // Pulisci timer esistente
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setState(prev => {
        const newTime = prev.timeRemaining - 1;
        
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return {
            ...prev,
            timeRemaining: 0,
            canSubmit: false,
          };
        }

        return {
          ...prev,
          timeRemaining: newTime,
        };
      });
    }, 1000);
  }, []);

  // ============================================
  // 📤 AZIONI GIOCATORE
  // ============================================

  const markAsSubmitted = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSubmitted: true,
      canSubmit: false,
    }));
  }, []);

  /** Dopo scrittura/collezione, la fase successiva (voto/indovina) richiede un nuovo invio */
  const resetHasSubmitted = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSubmitted: false,
      canSubmit: true,
    }));
  }, []);

  const resetForNewRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSubmitted: false,
      canSubmit: true,
    }));
  }, []);

  // ============================================
  // 🎯 EVENT DISPATCHER
  // ============================================

  const handlePhaseChanged = useCallback((data: { gameType: string; phase: string; data?: { timeLimit?: number } }) => {
    const timeLimit = data.data?.timeLimit;
    setState(prev => {
      let view = prev.controllerView;
      if (data.gameType === 'CONTINUE_PHRASE') {
        view = data.phase === 'VOTING' ? 'prompt-vote' : 'prompt-write';
      }
      if (data.gameType === 'WHO_WAS_IT') {
        view = data.phase === 'GUESSING' ? 'secret-vote' : 'secret-write';
      }
      return {
        ...prev,
        controllerView: view,
        hasSubmitted: false,
        canSubmit: true,
        timeRemaining: timeLimit ?? prev.timeRemaining,
      };
    });
    if (timeLimit) startTimer(timeLimit);
  }, [startTimer]);

  const handleGameEvent = useCallback((eventName: string, data: unknown) => {
    switch (eventName) {
      case 'game-started':
        handleGameStarted(data as { gameType: GameType; totalRounds: number });
        break;
      case 'round-started':
        handleRoundStarted(data as {
          roundNumber: number;
          gameType: GameType;
          data: TriviaRoundData | PromptRoundData | SecretRoundData;
        });
        break;
      case 'phase-changed':
        handlePhaseChanged(data as { gameType: string; phase: string; data?: { timeLimit?: number } });
        break;
      case 'timer-tick':
        handleTimerTick(data as { timeRemaining: number });
        break;
      case 'show-results':
        handleShowResults();
        break;
      case 'round-results':
        handleShowResults();
        break;
      case 'game-ended':
        handleGameEnded();
        break;
    }
  }, [handleGameStarted, handleRoundStarted, handlePhaseChanged, handleTimerTick, handleShowResults, handleGameEnded]);

  return {
    ...state,
    handleGameEvent,
    markAsSubmitted,
    resetHasSubmitted,
    resetForNewRound,
  };
}

export default useGameEvents;
