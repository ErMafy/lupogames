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
    }));
  }, []);

  const handleRoundStarted = useCallback((data: {
    roundNumber: number;
    gameType: GameType;
    data: TriviaRoundData | PromptRoundData | SecretRoundData;
  }) => {
    // Determina la view del controller in base al gioco
    let view: ControllerView = 'waiting';
    let timeLimit = 0;

    switch (data.gameType) {
      case 'TRIVIA':
        view = 'trivia-answer';
        timeLimit = (data.data as TriviaRoundData).timeLimit;
        break;
      case 'CONTINUE_PHRASE':
        const promptData = data.data as PromptRoundData;
        view = promptData.phase === 'WRITING' ? 'prompt-write' : 'prompt-vote';
        timeLimit = promptData.timeLimit;
        break;
      case 'WHO_WAS_IT':
        const secretData = data.data as SecretRoundData;
        view = secretData.phase === 'COLLECTING' ? 'secret-write' : 'secret-vote';
        timeLimit = 30; // Default
        break;
    }

    setState(prev => ({
      ...prev,
      currentRound: data.roundNumber,
      roundData: data.data,
      controllerView: view,
      timeRemaining: timeLimit,
      canSubmit: true,
      hasSubmitted: false,
    }));

    // Avvia il timer locale
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
      case 'timer-tick':
        handleTimerTick(data as { timeRemaining: number });
        break;
      case 'show-results':
        handleShowResults();
        break;
      case 'game-ended':
        handleGameEnded();
        break;
    }
  }, [handleGameStarted, handleRoundStarted, handleTimerTick, handleShowResults, handleGameEnded]);

  return {
    ...state,
    handleGameEvent,
    markAsSubmitted,
    resetForNewRound,
  };
}

export default useGameEvents;
