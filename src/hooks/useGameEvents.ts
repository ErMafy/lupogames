// 🐺 LUPO GAMES - Hook per Game Events
// Gestisce tutti gli eventi di gioco in modo centralizzato

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // ROUND_ID dell'ultimo round-started realmente applicato.
  // Serve per ignorare round-started duplicati emessi dal sync HTTP
  // (es. mentre stiamo mostrando i RESULTS), che altrimenti
  // (a) farebbero ripartire il timer da zero,
  // (b) riporterebbero la view a 'new-game-play' invece di 'results',
  // (c) reseterebbero hasSubmitted permettendo doppi invii.
  const lastRoundIdRef = useRef<string | null>(null);
  // Risultati visti: se è arrivato 'round-results' o 'show-results' per
  // questo roundId, qualsiasi successivo 'round-started' DUPLICATO per
  // lo STESSO roundId non deve resettare la view.
  const resultsShownForRoundRef = useRef<string | null>(null);

  // ============================================
  // ⏱️ TIMER LOCALE (definito prima degli handler che lo usano)
  // ============================================

  const startTimer = useCallback((seconds: number) => {
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
    /** Presente su round-started del Camaleonte (ridondante col nested data) */
    chameleonId?: string;
    data: TriviaRoundData | PromptRoundData | SecretRoundData | Record<string, unknown>;
  }) => {
    // Idempotenza: se è esattamente lo stesso round già gestito, NON ripartiamo
    // né timer, né view. Questo evita che un sync HTTP che rispedisce round-started
    // durante la dwell dei risultati riporti il giocatore alla schermata di voto/risposta.
    const incomingRoundId =
      typeof (data.data as { roundId?: unknown })?.roundId === 'string'
        ? ((data.data as { roundId: string }).roundId)
        : null;
    if (
      incomingRoundId &&
      lastRoundIdRef.current === incomingRoundId &&
      resultsShownForRoundRef.current === incomingRoundId
    ) {
      // Round-started duplicato di un round per cui stiamo già mostrando i risultati: ignora.
      return;
    }
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
      default: {
        // All new games use 'new-game-play' controller view
        const inner = data.data as Record<string, unknown>;
        const topCh = typeof data.chameleonId === 'string' ? data.chameleonId : '';
        view = 'new-game-play';
        timeLimit = typeof inner.timeLimit === 'number' ? inner.timeLimit : 30;
        roundPayload = {
          ...inner,
          gameType: data.gameType,
          ...(topCh ? { chameleonId: topCh } : {}),
        } as unknown as TriviaRoundData;
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

    if (incomingRoundId) {
      lastRoundIdRef.current = incomingRoundId;
      // Nuovo round → resetta lo stato "ho già mostrato risultati"
      if (resultsShownForRoundRef.current && resultsShownForRoundRef.current !== incomingRoundId) {
        resultsShownForRoundRef.current = null;
      }
    }
    startTimer(timeLimit);
  }, [startTimer]);

  const handleTimerTick = useCallback((data: { timeRemaining: number }) => {
    setState(prev => ({
      ...prev,
      timeRemaining: data.timeRemaining,
    }));
  }, []);

  const handleShowResults = useCallback((data?: { resultsDwellSec?: number; roundId?: string }) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const isTrivia = stateRef.current.currentGame === 'TRIVIA';
    const dwell =
      isTrivia &&
      typeof data?.resultsDwellSec === 'number' &&
      data.resultsDwellSec > 0
        ? data.resultsDwellSec
        : isTrivia
          ? 7
          : 0;

    if (typeof data?.roundId === 'string' && data.roundId) {
      resultsShownForRoundRef.current = data.roundId;
    } else if (lastRoundIdRef.current) {
      resultsShownForRoundRef.current = lastRoundIdRef.current;
    }

    setState(prev => ({
      ...prev,
      controllerView: 'results',
      canSubmit: false,
      ...(isTrivia && dwell > 0 ? { timeRemaining: dwell } : {}),
    }));

    if (isTrivia && dwell > 0) {
      startTimer(dwell);
    }
  }, [startTimer]);

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

  const handlePhaseChanged = useCallback((data: { gameType: string; phase: string; chameleonId?: string; data?: { timeLimit?: number } }) => {
    const timeLimit = data.data?.timeLimit;
    const topChameleon = typeof data.chameleonId === 'string' ? data.chameleonId : '';
    setState(prev => {
      let view = prev.controllerView;
      if (data.gameType === 'CONTINUE_PHRASE') {
        view = data.phase === 'VOTING' ? 'prompt-vote' : 'prompt-write';
      } else if (data.gameType === 'WHO_WAS_IT') {
        view = data.phase === 'GUESSING' ? 'secret-vote' : 'secret-write';
      } else {
        view = 'new-game-play';
      }
      return {
        ...prev,
        controllerView: view,
        hasSubmitted: false,
        canSubmit: true,
        timeRemaining: timeLimit ?? prev.timeRemaining,
        roundData: data.data
          ? ({
              ...prev.roundData,
              ...(data.data as object),
              ...(topChameleon ? { chameleonId: topChameleon } : {}),
              phase: data.phase,
              gameType: data.gameType,
            } as unknown as typeof prev.roundData)
          : prev.roundData,
      };
    });
    if (timeLimit) startTimer(timeLimit);
  }, [startTimer]);

  const handleBombPassed = useCallback((data: { remainingMs?: number }) => {
    if (typeof data.remainingMs === 'number' && data.remainingMs > 0) {
      const newSeconds = Math.ceil(data.remainingMs / 1000);
      setState(prev => ({ ...prev, timeRemaining: newSeconds, hasSubmitted: false, canSubmit: true }));
      startTimer(newSeconds);
    }
  }, [startTimer]);

  const handleGameEvent = useCallback((eventName: string, data: unknown) => {
    switch (eventName) {
      case 'game-started':
        handleGameStarted(data as { gameType: GameType; totalRounds: number });
        break;
      case 'round-started':
        handleRoundStarted(
          data as {
            roundNumber: number;
            gameType: GameType;
            phase?: string;
            chameleonId?: string;
            data: TriviaRoundData | PromptRoundData | SecretRoundData | Record<string, unknown>;
          },
        );
        break;
      case 'phase-changed':
        handlePhaseChanged(
          data as { gameType: string; phase: string; chameleonId?: string; data?: { timeLimit?: number } },
        );
        break;
      case 'timer-tick':
        handleTimerTick(data as { timeRemaining: number });
        break;
      case 'bomb-passed':
        handleBombPassed(data as { remainingMs?: number });
        break;
      case 'show-results':
        handleShowResults(data as { resultsDwellSec?: number; roundId?: string });
        break;
      case 'round-results':
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Memorizza che per il round corrente abbiamo visto i risultati,
        // così sync HTTP che rimanda 'round-started' per lo stesso round
        // non riporterà la view a 'new-game-play'.
        if (lastRoundIdRef.current) {
          resultsShownForRoundRef.current = lastRoundIdRef.current;
        }
        setState(prev => ({
          ...prev,
          controllerView: 'results',
          canSubmit: false,
        }));
        break;
      case 'game-ended':
        handleGameEnded();
        break;
    }
  }, [handleGameStarted, handleRoundStarted, handlePhaseChanged, handleTimerTick, handleBombPassed, handleShowResults, handleGameEnded]);

  return {
    ...state,
    handleGameEvent,
    markAsSubmitted,
    resetHasSubmitted,
    resetForNewRound,
  };
}

export default useGameEvents;
