// 🐺 LUPO GAMES - Controller PREMIUM (Smartphone)
// Il telecomando/joypad dei giocatori - LUSSO PURO

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import { useGameEvents } from '@/hooks/useGameEvents';
import { AvatarGrid } from '@/components/game/AvatarGrid';
import { TriviaController } from '@/components/game/TriviaController';
import { PromptController } from '@/components/game/PromptController';
import { SecretController } from '@/components/game/SecretController';
import { TriviaVictoryAnimation } from '@/components/game/TriviaVictoryAnimation';
import { SwipeTrashController } from '@/components/game/SwipeTrashController';
import { TribunaleController } from '@/components/game/TribunaleController';
import { BombController } from '@/components/game/BombController';
import { ThermometerController } from '@/components/game/ThermometerController';
import { HerdMindController } from '@/components/game/HerdMindController';
import { ChameleonController } from '@/components/game/ChameleonController';
import { SplitRoomController } from '@/components/game/SplitRoomController';
import { InterviewController } from '@/components/game/InterviewController';
import type { PusherMember, AvatarSelectedEvent, TriviaRoundData, PromptRoundData, SecretRoundData } from '@/types';

const GAME_INFO: { emoji: string; title: string; subtitle: string }[] = [
  { emoji: '🧠', title: 'La Corsa del Sapere', subtitle: 'Quiz • 10 domande • 30 sec' },
  { emoji: '💬', title: 'Continua la Frase', subtitle: '5 round • 45+45 sec' },
  { emoji: '🕵️', title: 'Chi è Stato?', subtitle: '5 round • 45+45 sec' },
  { emoji: '🗑️', title: 'Swipe Trash', subtitle: '5 round • 20 sec' },
  { emoji: '⚖️', title: 'Il Tribunale del Popolo', subtitle: '5 round • 30+20+20 sec' },
  { emoji: '💣', title: 'La Bomba', subtitle: '5 round • 30 sec' },
  { emoji: '🌡️', title: 'Il Termometro del Disagio', subtitle: '5 round • 25 sec' },
  { emoji: '🐑', title: 'Mente di Gregge', subtitle: '5 round • 25 sec' },
  { emoji: '🦎', title: 'Il Camaleonte', subtitle: '5 round • 30+8+25 sec' },
  { emoji: '⚡', title: 'Lo Spacca-Stanza', subtitle: '5 round • 30+25 sec' },
  { emoji: '📝', title: 'Colloquio Disperato', subtitle: '3 round • 40+30+25 sec' },
];

const GAME_DETAILS: Record<string, string> = {
  'La Corsa del Sapere': 'Rispondi a domande di cultura generale prima degli altri! 4 opzioni, 1 risposta giusta, 30 secondi per decidere. Più sei veloce, più punti guadagni!',
  'Continua la Frase': 'Ti diamo l\'inizio di una frase assurda e tu la completi. Poi tutti votano la risposta più divertente.',
  'Chi è Stato?': 'Uno scrive un segreto anonimo. Gli altri devono indovinare chi l\'ha scritto. Bluffa o confessa!',
  'Swipe Trash': 'Il termometro dell\'indignazione! Concetti controversi, vota SÌ o NO. Chi vota con la maggioranza prende punti.',
  'Il Tribunale del Popolo': 'Una domanda infame, tutti votano in segreto. Chi prende più voti diventa l\'Imputato e deve difendersi!',
  'La Bomba': 'La patata bollente digitale! Hai la bomba? Scrivi una parola nella categoria e passala. Chi ce l\'ha quando esplode perde!',
  'Il Termometro del Disagio': 'Un concetto, uno slider da 0 a 100. Più ti avvicini alla media del gruppo, più punti fai.',
  'Mente di Gregge': 'Una categoria, una risposta. Solo chi scrive la stessa cosa della maggioranza prende punti.',
  'Il Camaleonte': 'Tutti conoscono la parola segreta tranne il Camaleonte. Scrivi un indizio senza farti scoprire!',
  'Lo Spacca-Stanza': 'Completa un dilemma e tutti votano. Fai più punti se spacchi il gruppo esattamente a metà!',
  'Colloquio Disperato': 'Rispondi a domande, poi le parole vengono mischiate. Crea la frase migliore e vota!',
};

interface Player {
  id: string;
  name: string;
  avatar: string | null;
  avatarColor: string | null;
  isHost: boolean;
}

export default function ControllerPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; emoji: string } | null>(null);
  
  // Avatar già selezionati dagli altri
  const [takenAvatars, setTakenAvatars] = useState<Map<string, { playerId: string; playerName: string }>>(new Map());
  
  // Game state
  const {
    currentGame,
    controllerView,
    roundData,
    hasSubmitted,
    timeRemaining,
    handleGameEvent,
    markAsSubmitted,
    resetHasSubmitted,
  } = useGameEvents();

  // Stato risultato trivia locale
  const [triviaResult, setTriviaResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    correctAnswerText?: string;
    pointsEarned: number;
  } | null>(null);
  const triviaRoundIdRef = useRef<string | null>(null);

  // Round-ID refs to guard against stale markAsSubmitted calls
  const promptRoundIdRef = useRef<string | null>(null);
  const promptPhaseRef = useRef<'WRITING' | 'VOTING'>('WRITING');
  const secretRoundIdRef = useRef<string | null>(null);

  // Stato per "Continua la Frase"
  const [promptPhase, setPromptPhase] = useState<'WRITING' | 'VOTING'>('WRITING');
  const [promptResponses, setPromptResponses] = useState<{ id: string; response: string }[]>([]);
  const [promptSkipVoting, setPromptSkipVoting] = useState(false);

  // Stato per "Chi è Stato?"
  const [secretPhase, setSecretPhase] = useState<'COLLECTING' | 'GUESSING'>('COLLECTING');
  const [secretPlayers, setSecretPlayers] = useState<{ id: string; name: string; avatar: string | null; avatarColor: string | null }[]>([]);
  const [currentSecret, setCurrentSecret] = useState<string>('');
  const [secretReveal, setSecretReveal] = useState<{ ownerName: string; ownerAvatar: string | null } | null>(null);
  const [secretOwnerId, setSecretOwnerId] = useState<string | null>(null);

  // New games state
  const [newGameData, setNewGameData] = useState<Record<string, unknown> | null>(null);
  const newGameRoundIdRef = useRef<string | null>(null);

  // Score snapshot at game start (for per-game leaderboard)
  const scoreSnapshotRef = useRef<Record<string, number>>({});

  // Risultati round prompt (visibili a tutti)
  const [promptRoundResults, setPromptRoundResults] = useState<Array<{
    id: string; playerId: string; playerName: string; response: string; voteCount: number;
  }> | null>(null);

  // Stato per tutti i giocatori (per classifica live)
  const [allPlayers, setAllPlayers] = useState<Array<{
    playerId: string;
    playerName: string;
    avatar: string | null;
    score: number;
    trackPosition?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
  }>>([]);

  // Stato per victory animation
  const [showVictory, setShowVictory] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carica i dati iniziali
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPlayer = localStorage.getItem('lupo_player');
        if (!storedPlayer) {
          setError('Sessione scaduta. Torna alla home per rientrare.');
          setIsLoading(false);
          return;
        }

        const playerData = JSON.parse(storedPlayer);
        setPlayer(playerData);

        const response = await fetch(`/api/rooms/avatar?code=${roomCode}`);
        const data = await response.json();

        if (data.success) {
          const taken = new Map<string, { playerId: string; playerName: string }>();
          data.data.avatars.forEach((a: { name: string; selectedBy: { playerId: string; playerName: string } | null }) => {
            if (a.selectedBy) {
              taken.set(a.name, a.selectedBy);
            }
          });
          setTakenAvatars(taken);
        }
      } catch {
        setError('Errore nel caricamento');
      } finally {
        setIsLoading(false);
      }
    };

    if (roomCode) {
      loadData();
    }
  }, [roomCode]);

  const refreshRoomPlayers = useCallback(async () => {
    if (!roomCode) return;
    try {
      const response = await fetch(`/api/rooms?code=${roomCode}`);
      const data = await response.json();
      if (data.success && data.data.players) {
        setAllPlayers(
          data.data.players.map((p: { id: string; name: string; avatar: string | null; score?: number; trackPosition?: number }) => ({
            playerId: p.id,
            playerName: p.name,
            avatar: p.avatar,
            score: p.score ?? 0,
            trackPosition: p.trackPosition ?? 0,
          }))
        );
      }
    } catch (err) {
      console.error('Error loading players:', err);
    }
  }, [roomCode]);

  // Classifica live: polling veloce durante il trivia + refresh immediato a ogni domanda
  useEffect(() => {
    if (!roomCode || !currentGame) return;

    void refreshRoomPlayers();
    const interval = setInterval(refreshRoomPlayers, 3000);

    return () => clearInterval(interval);
  }, [roomCode, currentGame, refreshRoomPlayers]);

  // Server tick: avanza fasi su timeout anche se Pusher perde un evento (utile su mobile)
  useEffect(() => {
    if (!roomCode || !currentGame) return;
    const id = setInterval(() => {
      void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [roomCode, currentGame]);

  const triviaQuestionId =
    currentGame === 'TRIVIA' &&
    roundData &&
    typeof roundData === 'object' &&
    'questionId' in roundData
      ? (roundData as TriviaRoundData).questionId
      : null;

  useEffect(() => {
    if (currentGame === 'TRIVIA' && controllerView === 'trivia-answer') {
      void refreshRoomPlayers();
    }
  }, [currentGame, controllerView, triviaQuestionId, refreshRoomPlayers]);

  // Handlers Pusher
  const handleAvatarSelected = useCallback((event: AvatarSelectedEvent) => {
    setTakenAvatars(prev => {
      const newMap = new Map(prev);
      newMap.set(event.avatar, { playerId: event.playerId, playerName: event.playerName });
      return newMap;
    });

    if (player && event.playerId === player.id) {
      setPlayer(prev => prev ? { ...prev, avatar: event.avatar, avatarColor: event.avatarColor } : null);
    }
  }, [player]);

  const handleAvatarDeselected = useCallback((data: { playerId: string; avatar: string }) => {
    setTakenAvatars(prev => {
      const newMap = new Map(prev);
      if (prev.get(data.avatar)?.playerId === data.playerId) {
        newMap.delete(data.avatar);
      }
      return newMap;
    });
  }, []);

  const customGameEventHandler = useCallback((eventName: string, data: unknown) => {
    console.log('🎮 Controller event:', eventName, data);

    if (eventName === 'game-started') {
      const snap: Record<string, number> = {};
      for (const p of allPlayers) snap[p.playerId] = p.score;
      scoreSnapshotRef.current = snap;
    }
    
    if (eventName === 'avatar-deselected') {
      handleAvatarDeselected(data as { playerId: string; avatar: string });
    }
    
    if (eventName === 'phase-changed') {
      const phaseData = data as { gameType: string; phase: string; skipVoting?: boolean; data?: { responses?: { id: string; response: string }[] } };
      if (phaseData.gameType === 'CONTINUE_PHRASE') {
        const newPhase = phaseData.phase as 'WRITING' | 'VOTING';
        setPromptPhase(newPhase);
        setPromptSkipVoting(phaseData.skipVoting || false);
        promptPhaseRef.current = newPhase;
        if (phaseData.data?.responses) {
          setPromptResponses(phaseData.data.responses);
        }
        if (newPhase === 'VOTING') {
          resetHasSubmitted();
        }
      }
      if (phaseData.gameType === 'WHO_WAS_IT') {
        setSecretPhase(phaseData.phase as 'COLLECTING' | 'GUESSING');
        if (phaseData.phase === 'GUESSING') {
          resetHasSubmitted();
        }
      }
      const newGameTypes2 = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes2.includes(phaseData.gameType)) {
        const pdx = phaseData as { data?: Record<string, unknown>; chameleonId?: string };
        const payload = pdx.data || {};
        if (typeof payload.roundId === 'string' && payload.roundId) {
          newGameRoundIdRef.current = payload.roundId;
        }
        const topCh = typeof pdx.chameleonId === 'string' ? pdx.chameleonId : '';
        setNewGameData(prev => ({
          ...prev,
          ...payload,
          ...(topCh ? { chameleonId: topCh } : {}),
          phase: phaseData.phase,
          gameType: phaseData.gameType,
          ...(phaseData.gameType === 'CHAMELEON' && phaseData.phase === 'VOTING' ? { liveHints: [] } : {}),
        }));
        resetHasSubmitted();
      }
    }

    if (eventName === 'round-started') {
      const roundStartData = data as { gameType: string; phase?: string; data?: { secret?: string; roundId?: string; players?: { id: string; name: string; avatar: string | null; avatarColor: string | null }[] } };
      if (roundStartData.gameType === 'WHO_WAS_IT' && roundStartData.data) {
        setSecretPhase(roundStartData.phase as 'COLLECTING' | 'GUESSING' || 'GUESSING');
        setSecretReveal(null);
        secretRoundIdRef.current = roundStartData.data.roundId ?? null;
        const secretData = roundStartData.data as { secret?: string; secretOwnerId?: string; roundId?: string; players?: typeof secretPlayers };
        setSecretOwnerId(secretData.secretOwnerId ?? null);
        if (secretData.secret) {
          setCurrentSecret(secretData.secret);
        }
        if (secretData.players) {
          setSecretPlayers(secretData.players);
        }
      }
      if (roundStartData.gameType === 'CONTINUE_PHRASE') {
        setPromptRoundResults(null);
        setPromptPhase('WRITING');
        setPromptResponses([]);
        setPromptSkipVoting(false); // Reset skipping per nuovo round
        const rd = (data as { data?: { roundId?: string } }).data;
        promptRoundIdRef.current = rd?.roundId ?? null;
        promptPhaseRef.current = 'WRITING';
      }
      // New games
      const newGameTypes = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes.includes(roundStartData.gameType)) {
        const ev = data as Record<string, unknown>;
        const nested = (ev.data as Record<string, unknown>) || {};
        const topChameleon = typeof ev.chameleonId === 'string' ? ev.chameleonId : '';
        const rd: Record<string, unknown> = {
          ...nested,
          ...(topChameleon ? { chameleonId: topChameleon } : {}),
        };
        setNewGameData({
          ...rd,
          gameType: roundStartData.gameType,
          phase: (roundStartData as { phase?: string }).phase || (nested.phase as string) || 'ACTIVE',
          ...(roundStartData.gameType === 'CHAMELEON'
            ? {
                liveHints: [],
                chameleonHintCount: 0,
                chameleonPlayerCount: Array.isArray(nested.players) ? nested.players.length : allPlayers.length,
              }
            : {}),
        });
        newGameRoundIdRef.current = (rd?.roundId as string) ?? null;
        resetHasSubmitted();
        if (roundStartData.gameType === 'CHAMELEON' && roomCode && player?.id) {
          void fetch(
            `/api/game/chameleon/context?code=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(player.id)}`,
          )
            .then((r) => r.json())
            .then((j: { success?: boolean; data?: Record<string, unknown> }) => {
              if (!j.success || !j.data || typeof j.data.chameleonId !== 'string' || !j.data.chameleonId) return;
              setNewGameData((prev) => {
                if (!prev || prev.gameType !== 'CHAMELEON') return prev;
                const d = j.data!;
                return {
                  ...prev,
                  chameleonId: d.chameleonId as string,
                  ...(typeof d.secretWord === 'string' ? { secretWord: d.secretWord } : {}),
                  ...(typeof d.chameleonPlayerCount === 'number'
                    ? { chameleonPlayerCount: d.chameleonPlayerCount }
                    : {}),
                };
              });
            })
            .catch(() => {});
        }
      }
      if (roundStartData.gameType === 'TRIVIA') {
        setTriviaResult(null);
        const rd = (data as { data?: { roundId?: string } }).data;
        triviaRoundIdRef.current = rd?.roundId ?? null;
      }
    }

    if (eventName === 'show-results') {
      const sr = data as { correctAnswer?: string };
      if (sr.correctAnswer) {
        setTriviaResult((prev) =>
          prev || { isCorrect: false, correctAnswer: sr.correctAnswer!, pointsEarned: 0 }
        );
      }
      refreshRoomPlayers();
    }

    if (eventName === 'round-results') {
      const rd = data as { gameType?: string; results?: unknown };
      if (rd.gameType === 'CONTINUE_PHRASE' && Array.isArray(rd.results)) {
        setPromptRoundResults(
          (rd.results as Array<{ responseId: string; response: string; playerId: string; playerName: string; voteCount: number }>).map((r) => ({
            id: r.responseId, playerId: r.playerId, playerName: r.playerName, response: r.response, voteCount: r.voteCount,
          }))
        );
      }
      if (rd.gameType === 'WHO_WAS_IT' && rd.results) {
        const sr = rd.results as { owner?: { name: string; avatar: string | null } };
        if (sr.owner) setSecretReveal({ ownerName: sr.owner.name, ownerAvatar: sr.owner.avatar });
      }
      const newGameTypes3 = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes3.includes(rd.gameType as string)) {
        setNewGameData(prev => ({ ...prev, phase: 'RESULTS', results: rd.results }));
      }
      refreshRoomPlayers();
    }

    if (eventName === 'bomb-passed') {
      const bp = data as { newBombHolderId: string; word: string; remainingMs: number; previousHolder: string };
      setNewGameData(prev => ({
        ...prev,
        bombHolderId: bp.newBombHolderId,
        words: [...((prev?.words as string[]) || []), bp.word],
      }));
      // Reset submission state so the new bomb holder can pass
      resetHasSubmitted();
    }

    if (eventName === 'chameleon-hint') {
      const ch = data as {
        playerId: string;
        playerName: string;
        hint: string;
        totalHints?: number;
        totalPlayers?: number;
        roundId?: string;
      };
      setNewGameData(prev => {
        const rid = newGameRoundIdRef.current;
        if (ch.roundId && rid && ch.roundId !== rid) return prev ?? {};
        const list = [...((prev?.liveHints as Array<{ playerId: string; playerName: string; hint: string }>) || [])];
        const idx = list.findIndex(h => h.playerId === ch.playerId);
        if (idx >= 0) list[idx] = ch;
        else list.push(ch);
        return {
          ...prev,
          liveHints: list,
          chameleonHintCount: typeof ch.totalHints === 'number' ? ch.totalHints : list.length,
          chameleonPlayerCount:
            typeof ch.totalPlayers === 'number' ? ch.totalPlayers : (prev?.chameleonPlayerCount as number | undefined),
        };
      });
    }

    if (eventName === 'secret-reveal') {
      const sr = data as { actualPlayer?: { name: string }; secretContent?: string };
      if (sr.actualPlayer) setSecretReveal({ ownerName: sr.actualPlayer.name, ownerAvatar: null });
    }

    if (eventName === 'player-advanced') {
      const d = data as {
        playerId: string;
        newPosition?: number;
        score?: number;
      };
      setAllPlayers((prev) =>
        prev.map((p) =>
          p.playerId === d.playerId
            ? {
                ...p,
                score: typeof d.score === 'number' ? d.score : p.score,
                trackPosition:
                  typeof d.newPosition === 'number' ? d.newPosition : p.trackPosition,
              }
            : p
        )
      );
    }

    if (eventName === 'game-ended') {
      const gameEndedData = data as { finalScores?: Array<{ playerId: string; playerName: string; avatar: string; score: number }> };
      
      // Trova il vincitore
      if (gameEndedData.finalScores && gameEndedData.finalScores.length > 0) {
        const topPlayer = gameEndedData.finalScores[0];
        setWinner({
          playerId: topPlayer.playerId,
          playerName: topPlayer.playerName,
          avatar: topPlayer.avatar,
          score: topPlayer.score,
        });
        setShowVictory(true);
        
        setTimeout(() => {
          setShowVictory(false);
          router.push(`/lobby?room=${roomCode}`);
        }, 4000);
      } else {
        // Se non ci sono dati, torna subito alla lobby
        router.push(`/lobby?room=${roomCode}`);
      }
      return;
    }
    
    handleGameEvent(eventName, data);
  }, [handleAvatarDeselected, handleGameEvent, roomCode, router, resetHasSubmitted, refreshRoomPlayers, allPlayers, player?.id]);

  const gameEventHandlerRef = useRef(customGameEventHandler);
  gameEventHandlerRef.current = customGameEventHandler;

  // One-time sync on mount
  useEffect(() => {
    if (!roomCode || !player?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/game/sync?code=${roomCode}`);
        const json = await res.json();
        if (
          cancelled ||
          !json.success ||
          !json.data?.inGame ||
          !Array.isArray(json.data.events)
        ) {
          return;
        }
        for (const ev of json.data.events as { name: string; data: unknown }[]) {
          gameEventHandlerRef.current(ev.name, ev.data);
        }
      } catch (e) {
        console.error('game sync:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode, player?.id]);

   // Periodic sync fallback: polls while no game OR while stuck in waiting with an active game
  useEffect(() => {
    if (!roomCode || !player?.id) return;
    const chameleonLive =
      currentGame === 'CHAMELEON' &&
      newGameData &&
      (newGameData.phase === 'HINTING' || newGameData.phase === 'VOTING');
    const shouldPoll =
      !currentGame || (currentGame && controllerView === 'waiting') || chameleonLive;
    if (!shouldPoll) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/game/sync?code=${roomCode}`);
        const json = await res.json();
        if (json.success && json.data?.inGame && Array.isArray(json.data.events)) {
          for (const ev of json.data.events as { name: string; data: unknown }[]) {
            gameEventHandlerRef.current(ev.name, ev.data);
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(id);
  }, [roomCode, player?.id, currentGame, controllerView, newGameData?.phase]);

  const {
    isConnected,
    selectAvatar,
  } = usePresenceChannel({
    roomCode,
    playerId: player?.id || '',
    playerName: player?.name || '',
    isHost: player?.isHost || false,
    onAvatarSelected: handleAvatarSelected,
    onGameEvent: customGameEventHandler,
  });

  const handleSelectAvatar = async (avatar: string, color: string): Promise<boolean> => {
    const result = await selectAvatar(avatar, color);
    
    if (result) {
      // Dopo aver selezionato l'avatar, vai alla lobby
      router.push(`/lobby?room=${roomCode}`);
    }
    
    return result ?? false;
  };

  const handleTriviaAnswer = async (answer: 'A' | 'B' | 'C' | 'D', responseTimeMs: number) => {
    if (!player || !roundData) {
      throw new Error('Sessione non pronta');
    }

    const answerRoundId = (roundData as TriviaRoundData & { roundId: string }).roundId;

    try {
      const response = await fetch('/api/game/trivia/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: player.id,
          roundId: answerRoundId,
          answer,
          responseTimeMs,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Risposta non inviata');
      }

      if (triviaRoundIdRef.current !== null && triviaRoundIdRef.current !== answerRoundId) {
        return;
      }

      setTriviaResult({
        isCorrect: data.data.isCorrect,
        correctAnswer: data.data.correctAnswer as string,
        correctAnswerText: data.data.correctAnswerText as string | undefined,
        pointsEarned: data.data.pointsEarned,
      });
      markAsSubmitted();
    } catch (err) {
      console.error('Errore invio risposta:', err);
      throw err;
    }
  };

  const handlePromptResponse = async (response: string) => {
    if (!player || !roundData) return;
    const sentRoundId = (roundData as PromptRoundData & { roundId: string }).roundId;

    try {
      const res = await fetch('/api/game/prompt/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: player.id,
          roundId: sentRoundId,
          response,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (promptRoundIdRef.current !== sentRoundId || promptPhaseRef.current !== 'WRITING') return;
        markAsSubmitted();
      }
    } catch (err) {
      console.error('Errore invio risposta prompt:', err);
    }
  };

  const handlePromptVote = async (responseId: string) => {
    if (!player || !roundData) return;
    const sentRoundId = (roundData as PromptRoundData & { roundId: string }).roundId;

    const res = await fetch('/api/game/prompt/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        playerId: player.id,
        roundId: sentRoundId,
        responseId,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Voto non registrato');
    }
    if (promptRoundIdRef.current !== sentRoundId) return;

    // Nudge tick after voting to ensure auto-advance fires
    setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
  };

  const handleSecretSubmit = async (secret: string) => {
    if (!player) return;

    try {
      const res = await fetch('/api/game/secret/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: player.id,
          secret,
        }),
      });

      const data = await res.json();
      if (data.success) {
        markAsSubmitted();
      }
    } catch (err) {
      console.error('Errore invio segreto:', err);
    }
  };

  const handleSecretVote = async (suspectedPlayerId: string) => {
    if (!player || !roundData) return;
    const sentRoundId = (roundData as SecretRoundData & { roundId: string }).roundId;

    const res = await fetch('/api/game/secret/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        playerId: player.id,
        roundId: sentRoundId,
        suspectedPlayerId,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Voto non registrato');
    }
    if (secretRoundIdRef.current !== sentRoundId) return;

    setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
  };

  const handleNewGameAction = async (endpoint: string, body: Record<string, unknown>) => {
    if (!player) return;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, playerId: player.id, roundId: newGameRoundIdRef.current, ...body }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Azione non riuscita');
    markAsSubmitted();
    setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
  };

  // Loading Premium
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-stars" />
        <div className="text-center z-10">
          <Image src="/logolupo.png" alt="Lupo" width={100} height={100} className="mx-auto animate-bounce mb-6 drop-shadow-2xl" />
          <div className="text-white text-xl font-bold animate-pulse">Connessione...</div>
          <div className="mt-4 w-32 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
            <div className="h-full w-full bg-gradient-to-r from-purple-500 to-pink-500 animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Error Premium
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-stars" />
        <div className="glass-card p-8 text-center max-w-md z-10 animate-bounce-in">
          <div className="text-6xl mb-6">😢</div>
          <p className="text-red-400 text-xl font-bold mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-lupo">
            🏠 Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  const isTriviaActive = controllerView === 'trivia-answer' || (controllerView === 'results' && currentGame === 'TRIVIA');
  const isTriviaRound = isTriviaActive && !!roundData;

  return (
    <div
      className={`flex min-h-[100dvh] flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="bg-stars" />
      
      {/* Header Premium Mobile */}
      <header className="sticky top-0 z-50 shrink-0 backdrop-blur-xl bg-black/40 border-b border-white/10 px-4 py-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logolupo.png" alt="Lupo" width={36} height={36} className="shrink-0 drop-shadow-lg" />
            <div className="room-code text-sm px-3 py-1 tracking-widest">
              {roomCode}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/?join=${roomCode}`;
                if (navigator.share) {
                  navigator.share({ title: 'Lupo Games', text: `Unisciti! Codice: ${roomCode}`, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url).catch(() => {});
                }
              }}
              className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm"
              title="Condividi"
            >
              🔗
            </button>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-white font-semibold">{player?.name}</span>
            {player?.isHost && <span className="text-yellow-400 text-sm">👑</span>}
            {player?.avatar && (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg ring-2 ring-white/20"
                style={{ backgroundColor: player.avatarColor || '#6B7280' }}
              >
                {getAvatarEmoji(player.avatar)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — trivia: niente padding, altezza sotto header per evitare scroll doppio */}
      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col ${
          isTriviaRound
            ? 'overflow-y-auto p-0'
            : 'p-4 pb-[max(5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto'
        }`}
      >
        
        {/* Lobby - Selezione Avatar */}
        {controllerView === 'waiting' && !currentGame && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-3">
                👋 Ciao <span className="text-gradient">{player?.name}</span>!
              </h1>
              <p className="text-purple-200/80 font-medium">
                {player?.avatar 
                  ? 'In attesa che l\'host inizi il gioco...'
                  : 'Scegli il tuo avatar per iniziare!'}
              </p>
            </div>

            <AvatarGrid
              roomCode={roomCode}
              playerId={player?.id || ''}
              currentAvatar={player?.avatar}
              onSelect={handleSelectAvatar}
              takenAvatars={takenAvatars}
            />

            {player?.avatar && (
              <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="glass-card inline-flex items-center gap-3 px-6 py-4 mx-auto w-full justify-center">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-xl animate-pulse">⏳</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">Pronto!</p>
                    <p className="text-green-300/80 text-xs">In attesa dell&apos;host...</p>
                  </div>
                </div>

                {/* Classifica visibile ai giocatori */}
                {allPlayers.some(p => p.score > 0) && (
                  <div className="glass-card p-4 mt-4">
                    <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                      <span>🏆</span> Classifica
                    </h3>
                    <div className="space-y-1.5">
                      {[...allPlayers].sort((a, b) => b.score - a.score).map((p, i) => (
                        <div key={p.playerId} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${i === 0 ? 'bg-yellow-500/15 border border-yellow-400/20' : 'bg-white/[0.03]'}`}>
                          <span className="text-xs font-black text-white/40 w-5 text-center">
                            {i === 0 ? '👑' : `${i + 1}`}
                          </span>
                          <span className="text-lg">{p.avatar ? getAvatarEmoji(p.avatar) : '❓'}</span>
                          <span className={`text-sm font-bold flex-1 text-left truncate ${i === 0 ? 'text-yellow-300' : 'text-white/70'}`}>
                            {p.playerName}
                          </span>
                          <span className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-white/50'}`}>
                            {p.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Game cards visibili ai giocatori */}
                <div className="mt-4">
                  <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                    <span>🎯</span> Giochi Disponibili
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {GAME_INFO.map(g => (
                      <button key={g.title} type="button" onClick={() => setInfoModal(g)}
                        className="glass-card p-3 text-center active:scale-95 transition-transform">
                        <div className="text-2xl mb-1">{g.emoji}</div>
                        <div className="text-white font-bold text-[11px] leading-tight">{g.title}</div>
                        <div className="text-white/40 text-[9px] mt-0.5">{g.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentGame && controllerView === 'waiting' && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
            <div className="text-5xl mb-4 animate-bounce">🎮</div>
            <p className="text-white font-bold text-lg animate-pulse">
              Connessione al round...
            </p>
          </div>
        )}

        {/* Trivia Controller — also visible during results dwell */}
        {isTriviaActive && roundData && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <TriviaController
              roundData={roundData as TriviaRoundData}
              onAnswer={handleTriviaAnswer}
              hasAnswered={hasSubmitted}
              timeRemaining={timeRemaining}
              result={triviaResult || undefined}
              players={allPlayers}
              currentPlayerId={player?.id}
              scoreSnapshot={scoreSnapshotRef.current}
            />
          </div>
        )}

        {/* Continua la Frase Controller */}
        {(controllerView === 'prompt-write' || controllerView === 'prompt-vote') && roundData && (
          <div className="animate-slide-up">
            <PromptController
              roundData={roundData as PromptRoundData}
              phase={promptPhase}
              onSubmitResponse={handlePromptResponse}
              onVote={handlePromptVote}
              hasSubmitted={hasSubmitted}
              timeRemaining={timeRemaining}
              responses={promptResponses}
              roundResults={promptRoundResults ?? undefined}
              skipVoting={promptSkipVoting}
            />
          </div>
        )}

        {/* Prompt round results (shown between rounds too) */}
        {controllerView === 'results' && promptRoundResults && (
          <div className="animate-slide-up">
            <PromptController
              roundData={(roundData ?? { phraseId: '', phrase: '', timeLimit: 0, phase: 'WRITING' }) as PromptRoundData}
              phase="WRITING"
              onSubmitResponse={async () => {}}
              onVote={async () => {}}
              hasSubmitted
              roundResults={promptRoundResults}
              skipVoting={promptSkipVoting}
            />
          </div>
        )}

        {/* Chi è Stato Controller */}
        {(controllerView === 'secret-write' || controllerView === 'secret-vote') && (
          <div className="animate-slide-up">
            <SecretController
              phase={secretPhase}
              secret={currentSecret}
              players={secretPlayers}
              onSubmitSecret={handleSecretSubmit}
              onVote={handleSecretVote}
              hasSubmitted={hasSubmitted}
              timeRemaining={timeRemaining}
              currentPlayerId={player?.id || ''}
              revealResult={secretReveal ?? undefined}
              isSecretOwner={!!secretOwnerId && secretOwnerId === player?.id}
            />
          </div>
        )}

        {/* Secret reveal (shown between rounds too) */}
        {controllerView === 'results' && secretReveal && (
          <div className="animate-slide-up">
            <SecretController
              phase="GUESSING"
              onSubmitSecret={async () => {}}
              onVote={async () => {}}
              hasSubmitted
              currentPlayerId=""
              revealResult={secretReveal}
            />
          </div>
        )}

        {/* NEW GAMES — Player controllers (also shown during results phase) */}
        {(controllerView === 'new-game-play' || (controllerView === 'results' && newGameData && ['SWIPE_TRASH','TRIBUNAL','BOMB','THERMOMETER','HERD_MIND','CHAMELEON','SPLIT_ROOM','INTERVIEW'].includes(currentGame || ''))) && newGameData && player && (() => {
          const gt = currentGame;
          const phase = newGameData.phase as string;
          const results = newGameData.results as any;
          const isResults = phase === 'RESULTS' || phase === 'EXPLODED';

          if (gt === 'SWIPE_TRASH') return (
            <div className="animate-slide-up">
              <SwipeTrashController concept={(newGameData.concept as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onVote={async (v) => { await handleNewGameAction('/api/game/swipe/vote', { vote: v }); }}
                hasVoted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'TRIBUNAL') return (
            <div className="animate-slide-up">
              <TribunaleController
                phase={(phase as any) || 'ACCUSING'}
                accusation={(newGameData.accusation as string) || ''} players={(newGameData.players as any) || []}
                currentPlayerId={player.id} defendantId={newGameData.defendantId as string}
                defendantName={newGameData.defendantName as string} defense={newGameData.defense as string}
                roundId={newGameRoundIdRef.current || ''}
                onAccuse={async (id) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'accuse', accusedPlayerId: id }); }}
                onDefense={async (d) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'defense', defense: d }); }}
                onVerdict={async (v) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'verdict', verdict: v }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'BOMB') return (
            <div className="animate-slide-up">
              <BombController category={(newGameData.category as string) || ''} bombHolderId={(newGameData.bombHolderId as string) || ''}
                currentPlayerId={player.id} roundId={newGameRoundIdRef.current || ''}
                onPass={async (w) => { await handleNewGameAction('/api/game/bomb/pass', { word: w }); }}
                timeRemaining={timeRemaining} words={(newGameData.words as string[]) || []}
                results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'THERMOMETER') return (
            <div className="animate-slide-up">
              <ThermometerController concept={(newGameData.concept as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onVote={async (v) => { await handleNewGameAction('/api/game/thermometer/vote', { value: v }); }}
                hasVoted={hasSubmitted} timeRemaining={timeRemaining} currentPlayerId={player.id}
                results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'HERD_MIND') return (
            <div className="animate-slide-up">
              <HerdMindController question={(newGameData.question as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onAnswer={async (a) => { await handleNewGameAction('/api/game/herd/answer', { answer: a }); }}
                hasAnswered={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'CHAMELEON') return (
            <div className="animate-slide-up">
              <ChameleonController phase={(phase as any) || 'HINTING'}
                secretWord={String(player.id) === String(newGameData.chameleonId ?? '') ? null : (newGameData.secretWord as string)}
                chameleonId={String(newGameData.chameleonId ?? '')} currentPlayerId={player.id}
                hintsSubmitted={typeof newGameData.chameleonHintCount === 'number' ? newGameData.chameleonHintCount : undefined}
                hintsTotal={typeof newGameData.chameleonPlayerCount === 'number' ? newGameData.chameleonPlayerCount : undefined}
                players={allPlayers.map(p => ({ id: p.playerId, name: p.playerName, avatar: p.avatar || null }))}
                roundId={newGameRoundIdRef.current || ''} hints={(newGameData.hints as any)}
                liveHints={(newGameData.liveHints as any) || []}
                retry={!!(newGameData.retry)}
                onHint={async (h) => { await handleNewGameAction('/api/game/chameleon/action', { action: 'hint', hint: h }); }}
                onVote={async (id) => { await handleNewGameAction('/api/game/chameleon/action', { action: 'vote', suspectedId: id }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'SPLIT_ROOM') return (
            <div className="animate-slide-up">
              <SplitRoomController phase={(phase as any) || 'WRITING'}
                dilemmaStart={(newGameData.dilemmaStart as string)} dilemma={(newGameData.dilemma as string)}
                authorId={(newGameData.authorId as string)} currentPlayerId={player.id}
                roundId={newGameRoundIdRef.current || ''}
                onWrite={async (c) => { await handleNewGameAction('/api/game/split/action', { action: 'write', completion: c }); }}
                onVote={async (v) => { await handleNewGameAction('/api/game/split/action', { action: 'vote', vote: v }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'INTERVIEW') return (
            <div className="animate-slide-up">
              <InterviewController phase={(phase as any) || 'COLLECTING'}
                questions={(newGameData.questions as string[])} prompt={(newGameData.prompt as string)}
                words={(newGameData.playerWords as Record<string, string[]>)?.[player.id] || (newGameData.words as string[]) || []}
                sentences={(newGameData.sentences as any)} currentPlayerId={player.id}
                roundId={newGameRoundIdRef.current || ''}
                onCollect={async (a) => { await handleNewGameAction('/api/game/interview/action', { action: 'collect', answers: a }); }}
                onBuild={async (s) => { await handleNewGameAction('/api/game/interview/action', { action: 'build', sentence: s }); }}
                onVote={async (id) => { await handleNewGameAction('/api/game/interview/action', { action: 'vote', votedPlayerId: id }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          return null;
        })()}

        {/* Round Results — solo per giochi senza risultati inline dedicati */}
        {controllerView === 'results' && !promptRoundResults && !secretReveal && currentGame !== 'TRIVIA' && !['SWIPE_TRASH','TRIBUNAL','BOMB','THERMOMETER','HERD_MIND','CHAMELEON','SPLIT_ROOM','INTERVIEW'].includes(currentGame || '') && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center animate-bounce-in">
            <div className="glass-card p-8">
              <div className="text-5xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-2xl font-black text-white mb-2">
                Round Completato!
              </h2>
              <p className="text-purple-200/80 text-sm">
                Prossimo round in arrivo...
              </p>
            </div>
          </div>
        )}

        {/* Victory Animation */}
        {showVictory && winner && (
          <div className="fixed inset-0 z-[9999]">
            <TriviaVictoryAnimation
              winner={{
                playerId: winner.playerId,
                playerName: winner.playerName,
                avatar: winner.avatar || '🐺',
                score: winner.score,
                trackPosition: winner.trackPosition || 15,
              }}
              allPlayers={allPlayers.map(p => ({
                playerId: p.playerId,
                playerName: p.playerName,
                avatar: p.avatar || '🐺',
                score: p.score,
                trackPosition: p.trackPosition || 0,
              }))}
              onComplete={() => {}}
            />
          </div>
        )}

        {/* Final Scores */}
        {controllerView === 'final-scores' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-bounce-in">
            <div className="glass-card p-10">
              <div className="text-7xl mb-6">🏆</div>
              <h2 className="text-3xl font-black text-gradient mb-4">
                Partita Terminata!
              </h2>
              <p className="text-purple-200/80 text-lg mb-8">
                Guarda lo schermo grande per la classifica finale
              </p>
              <button onClick={() => router.push('/')} className="btn-lupo text-lg">
                🏠 Torna alla Home
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Game Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={() => setInfoModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-[24px] p-[1px]" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-purple-500/50 via-white/[0.08] to-pink-500/30" />
            <div className="relative rounded-[23px] bg-[#0c0c20]/97 backdrop-blur-2xl overflow-hidden p-6">
              <button type="button" onClick={() => setInfoModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/40 text-sm active:scale-90 transition-transform">✕</button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/15 border border-white/[0.08] flex items-center justify-center text-3xl mb-4">{infoModal.emoji}</div>
              <h3 className="text-white font-black text-lg mb-3 pr-8">{infoModal.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{GAME_DETAILS[infoModal.title] || ''}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAvatarEmoji(avatarName: string): string {
  const avatars: Record<string, string> = {
    'Lupo': '🐺', 'Pecora': '🐑', 'Maiale': '🐷', 'Volpe': '🦊',
    'Orso': '🐻', 'Leone': '🦁', 'Tigre': '🐯', 'Panda': '🐼',
    'Coniglio': '🐰', 'Gatto': '🐱', 'Cane': '🐶', 'Unicorno': '🦄',
    'Drago': '🐲', 'Gufo': '🦉', 'Pinguino': '🐧',
  };
  return avatars[avatarName] || '🐺';
}
