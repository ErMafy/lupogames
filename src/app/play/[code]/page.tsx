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
  // Toast non bloccante per errori di azione (es. POST /api/game/.../vote rifiutata).
  // Senza questo, gli errori venivano semplicemente "throwati" e silenziati,
  // lasciando il bottone abilitato senza alcun feedback → utente cliccava di nuovo
  // pensando che il click "non avesse risposto" → loop infinito.
  const [actionError, setActionError] = useState<string | null>(null);
  const actionErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // Track round-id per cui `triviaResult` e` valido. Senza questo, il merge in
  // show-results manteneva `correctAnswerText` del round precedente quando un
  // show-results del nuovo round arrivava prima che React resettasse lo stato.
  const triviaResultRoundIdRef = useRef<string | null>(null);

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
  // Phase corrente "viva" tracciata via ref. Senza questo, il guard in
  // handleNewGameAction leggeva la phase da `newGameData` chiusa nello scope
  // della funzione, quindi sentPhase === currentPhase erano SEMPRE uguali e il
  // guard non scattava mai dopo un cambio fase. Ora confrontiamo la phase
  // reale al momento della risposta API col snapshot al momento dell'invio.
  const newGamePhaseRef = useRef<string | null>(null);
  // Idempotenza phase-changed: chiave roundId::gameType::phase già applicata.
  const lastLocalPhaseKeyRef = useRef<string | null>(null);

  // Score snapshot at game start (for per-game leaderboard)
  const scoreSnapshotRef = useRef<Record<string, number>>({});
  const lastSyncRevisionRef = useRef<string | null>(null);
  const lastKnownSyncVersionRef = useRef<number | null>(null);
  const lastRoundNumberRef = useRef<number>(0);

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

  // Server tick: ogni 2s per round transitions piu` reattive.
  // Pusher avanza gia` quando tutti hanno votato; il tick e` la rete di sicurezza
  // quando il timer scade ma non tutti hanno risposto.
  useEffect(() => {
    if (!roomCode || !currentGame) return;
    const id = setInterval(() => {
      void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {});
    }, 2000);
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
      // IMPORTANTE: NON resettare lastRoundNumberRef qui!
      // Il sync HTTP rimanda `game-started` ogni 2.5s per il gioco corrente.
      // Se lo resettiamo a 0, un successivo `round-started` stale (es. round 1
      // quando siamo al round 2) passa la guardia `incomingRound < lastRoundNumber`
      // e sovrascrive triviaResult/roundIdRef con dati vecchi.
      // Il reset avviene SOLO in game-ended e quando sync torna inGame=false.
      if (lastRoundNumberRef.current === 0) {
        // Solo alla prima game-started (gioco appena iniziato): salva snapshot punteggi
        const snap: Record<string, number> = {};
        for (const p of allPlayers) snap[p.playerId] = p.score;
        scoreSnapshotRef.current = snap;
      }
    }
    
    if (eventName === 'avatar-deselected') {
      handleAvatarDeselected(data as { playerId: string; avatar: string });
    }
    
    if (eventName === 'phase-changed') {
      const phaseData = data as { gameType: string; phase: string; skipVoting?: boolean; data?: { responses?: { id: string; response: string }[]; roundId?: string } };
      // Idempotenza: il sync HTTP rimanda phase-changed per la fase corrente ogni 2.5s.
      // Senza guardia, ogni sync resetta hasSubmitted/canSubmit e sovrascrive lo stato
      // locale, facendo "tornare indietro" la UI dopo un voto.
      const phaseRid = phaseData.data?.roundId || newGameRoundIdRef.current || promptRoundIdRef.current || secretRoundIdRef.current || '';
      const localPhaseKey = `${phaseRid}::${phaseData.gameType}::${phaseData.phase}`;
      if (lastLocalPhaseKeyRef.current === localPhaseKey) {
        return;
      }
      lastLocalPhaseKeyRef.current = localPhaseKey;
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
        // Aggiorna SUBITO la phase ref (sincrono) prima del setState. Cosi`
        // qualunque azione utente arrivi ora vede la phase corrente.
        newGamePhaseRef.current = phaseData.phase;
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
      const roundStartData = data as { roundNumber?: number; gameType: string; phase?: string; data?: { secret?: string; roundId?: string; players?: { id: string; name: string; avatar: string | null; avatarColor: string | null }[] } };
      const incomingRoundNum = typeof roundStartData.roundNumber === 'number' ? roundStartData.roundNumber : 0;
      if (incomingRoundNum > 0 && incomingRoundNum < lastRoundNumberRef.current) {
        return;
      }
      if (incomingRoundNum > 0) {
        lastRoundNumberRef.current = incomingRoundNum;
      }
      const incomingRid =
        (roundStartData.data as { roundId?: string } | undefined)?.roundId || null;
      if (roundStartData.gameType === 'WHO_WAS_IT' && roundStartData.data) {
        const sameSecretRound = !!incomingRid && incomingRid === secretRoundIdRef.current;
        if (!sameSecretRound) {
          setSecretPhase(roundStartData.phase as 'COLLECTING' | 'GUESSING' || 'GUESSING');
          setSecretReveal(null);
          secretRoundIdRef.current = incomingRid;
          const secretData = roundStartData.data as { secret?: string; secretOwnerId?: string; roundId?: string; players?: typeof secretPlayers };
          setSecretOwnerId(secretData.secretOwnerId ?? null);
          if (secretData.secret) {
            setCurrentSecret(secretData.secret);
          }
          if (secretData.players) {
            setSecretPlayers(secretData.players);
          }
        }
      }
      if (roundStartData.gameType === 'CONTINUE_PHRASE') {
        const samePromptRound = !!incomingRid && incomingRid === promptRoundIdRef.current;
        if (!samePromptRound) {
          setPromptRoundResults(null);
          setPromptPhase('WRITING');
          setPromptResponses([]);
          setPromptSkipVoting(false);
          promptRoundIdRef.current = incomingRid;
          promptPhaseRef.current = 'WRITING';
        }
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
        const newRoundId = (rd?.roundId as string) ?? null;
        const prevRoundId = newGameRoundIdRef.current;
        const sameRound = !!newRoundId && newRoundId === prevRoundId;
        const incomingPhase = (roundStartData as { phase?: string }).phase || (nested.phase as string) || 'ACTIVE';
        // IMPORTANTE: se è lo stesso round (es. sync HTTP che rimanda round-started durante RESULTS),
        // facciamo MERGE invece di REPLACE per non cancellare results/liveHints/bombHolderId aggiornati
        // dagli altri eventi (round-results, bomb-passed, chameleon-hint).
        setNewGameData((prev) => {
          if (sameRound && prev) {
            const merged: Record<string, unknown> = { ...prev };
            // Aggiungi solo i campi mancanti dal nuovo round-started, preserva tutto il resto
            for (const [k, v] of Object.entries(rd)) {
              if (merged[k] === undefined || merged[k] === null) merged[k] = v;
            }
            // Non sovrascrivere mai 'results' o 'liveHints' qui (li gestiscono altri eventi)
            // Aggiorna solo phase se è "più avanti" (non torna indietro a RESULTS già visto)
            if (typeof prev.phase !== 'string' || prev.phase !== 'RESULTS') {
              merged.phase = incomingPhase;
            } else {
              // se stiamo già mostrando i RESULTS, NON tornare a HINTING/PLAYING/...
              merged.phase = prev.phase;
            }
            merged.gameType = roundStartData.gameType;
            return merged;
          }
          // Round nuovo: reset completo
          return {
            ...rd,
            gameType: roundStartData.gameType,
            phase: incomingPhase,
            ...(roundStartData.gameType === 'CHAMELEON'
              ? {
                  liveHints: [],
                  chameleonHintCount: 0,
                  chameleonPlayerCount: Array.isArray(nested.players) ? nested.players.length : allPlayers.length,
                }
              : {}),
          };
        });
        if (!sameRound) {
          resetHasSubmitted();
          lastLocalPhaseKeyRef.current = null;
        }
        newGameRoundIdRef.current = newRoundId;
        // Sullo stesso round NON facciamo downgrade della phase ref:
        // un sync HTTP che rispedisce round-started con la phase server
        // potrebbe arrivare dopo che il client ha gia` applicato un
        // phase-changed/round-results piu` avanzato → senza questa
        // protezione il prossimo click invierebbe una phase obsoleta.
        if (!sameRound || newGamePhaseRef.current === null) {
          newGamePhaseRef.current = incomingPhase;
        } else if (incomingPhase === 'RESULTS' || incomingPhase === 'EXPLODED') {
          // RESULTS/EXPLODED sono "terminali" del round: ok aggiornare.
          newGamePhaseRef.current = incomingPhase;
        }
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
        const rd = (data as { data?: { roundId?: string } }).data;
        const newTriviaRid = rd?.roundId ?? null;
        const sameTriviaRound = !!newTriviaRid && newTriviaRid === triviaRoundIdRef.current;
        if (!sameTriviaRound && newTriviaRid) {
          // Aggiorna SOLO se abbiamo un id valido per evitare di azzerare il
          // ref con dati malformati e bloccare i click successivi.
          setTriviaResult(null);
          triviaRoundIdRef.current = newTriviaRid;
          triviaResultRoundIdRef.current = null;
        }
      }
    }

    if (eventName === 'show-results') {
      const sr = data as {
        correctAnswer?: string;
        correctAnswerText?: string;
        roundId?: string;
      };
      const rid = sr.roundId;
      if (rid && triviaRoundIdRef.current && rid !== triviaRoundIdRef.current) {
        return;
      }
      if (sr.correctAnswer) {
        // ROUND-AWARE MERGE: se prev e` di un round diverso, REPLACE invece di
        // mergiare, altrimenti `correctAnswerText` resta del round precedente.
        const prevForSameRound = !!rid && triviaResultRoundIdRef.current === rid;
        setTriviaResult((prev) => {
          const letter = sr.correctAnswer as string;
          const text = (sr.correctAnswerText || '').trim() || undefined;
          if (!prev || !prevForSameRound) {
            return {
              isCorrect: false,
              correctAnswer: letter,
              correctAnswerText: text,
              pointsEarned: 0,
            };
          }
          return {
            ...prev,
            correctAnswer: letter,
            correctAnswerText: prev.correctAnswerText || text,
          };
        });
        if (rid) triviaResultRoundIdRef.current = rid;
      }
      refreshRoomPlayers();
    }

    if (eventName === 'round-results') {
      const rd = data as { gameType?: string; results?: unknown; roundId?: string };
      // GUARDIA STALE: round-results in ritardo (es. round 1 dopo che il
      // round 2 e` gia` partito) altrimenti riportano la phase a 'RESULTS'
      // sul round successivo, bloccando i click successivi (sentPhase non
      // matcha piu` newGamePhaseRef='RESULTS' o l'utente vede la UI risultati
      // del round vecchio).
      const rdRoundId = typeof rd.roundId === 'string' ? rd.roundId : null;
      const currentNewRid = newGameRoundIdRef.current;
      const currentPromptRid = promptRoundIdRef.current;
      const currentSecretRid = secretRoundIdRef.current;
      const isStaleNewGame =
        !!rdRoundId && !!currentNewRid && rdRoundId !== currentNewRid;
      const isStalePrompt =
        rd.gameType === 'CONTINUE_PHRASE' && !!rdRoundId && !!currentPromptRid && rdRoundId !== currentPromptRid;
      const isStaleSecret =
        rd.gameType === 'WHO_WAS_IT' && !!rdRoundId && !!currentSecretRid && rdRoundId !== currentSecretRid;
      if (isStaleNewGame || isStalePrompt || isStaleSecret) {
        return;
      }
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
        newGamePhaseRef.current = 'RESULTS';
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
      // Reset guardia round: il prossimo gioco partira` da round 1
      lastRoundNumberRef.current = 0;
      // Reset ref round-id dei giochi specifici
      triviaRoundIdRef.current = null;
      triviaResultRoundIdRef.current = null;
      promptRoundIdRef.current = null;
      secretRoundIdRef.current = null;
      newGameRoundIdRef.current = null;
      newGamePhaseRef.current = null;
      lastLocalPhaseKeyRef.current = null;

      const gameEndedData = data as { finalScores?: Array<{ playerId: string; playerName: string; avatar: string; score: number }> };
      
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
        router.push(`/lobby?room=${roomCode}`);
      }
      // Chiama handleGameEvent PRIMA di uscire, cosi` useGameEvents resetta
      // lastRoundIdRef/resultsShownForRoundRef/lastPhaseAppliedRef/currentRound
      handleGameEvent(eventName, data);
      return;
    }
    
    handleGameEvent(eventName, data);
  }, [handleAvatarDeselected, handleGameEvent, roomCode, router, resetHasSubmitted, refreshRoomPlayers, allPlayers, player?.id]);

  const gameEventHandlerRef = useRef(customGameEventHandler);
  gameEventHandlerRef.current = customGameEventHandler;

  const applyPlayGameSync = useCallback(async () => {
    if (!roomCode) return;
    try {
      const qs = new URLSearchParams({ code: roomCode });
      if (lastKnownSyncVersionRef.current !== null) {
        qs.set('sinceVersion', String(lastKnownSyncVersionRef.current));
      }
      const res = await fetch(`/api/game/sync?${qs.toString()}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        return;
      }
      const d = json.data as {
        inGame?: boolean;
        unchanged?: boolean;
        syncVersion?: number;
        revision?: string;
        events?: { name: string; data: unknown }[];
      };
      if (!d.inGame) {
        lastKnownSyncVersionRef.current = null;
        lastSyncRevisionRef.current = null;
        // Siamo in lobby: resetta la guardia round cosi` il prossimo gioco
        // puo` partire da round 1 anche se game-ended non e` stato ricevuto.
        lastRoundNumberRef.current = 0;
        return;
      }
      if (d.unchanged === true) {
        return;
      }
      if (!Array.isArray(d.events)) {
        return;
      }
      const rev = d.revision;
      if (rev !== undefined && rev === lastSyncRevisionRef.current) {
        return;
      }
      for (const ev of d.events) {
        gameEventHandlerRef.current(ev.name, ev.data);
      }
      if (rev !== undefined) {
        lastSyncRevisionRef.current = rev;
      }
      if (typeof d.syncVersion === 'number') {
        lastKnownSyncVersionRef.current = d.syncVersion;
      }
    } catch (e) {
      console.error('game sync:', e);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !player?.id) return;
    let cancelled = false;
    void (async () => {
      await applyPlayGameSync();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode, player?.id, applyPlayGameSync]);

  // Sync HTTP continuo: recupera eventi persi (Pusher); revision evita re-applicazioni inutili
  useEffect(() => {
    if (!roomCode || !player?.id) return;
    const id = setInterval(() => {
      void applyPlayGameSync();
    }, 2500);
    return () => clearInterval(id);
  }, [roomCode, player?.id, applyPlayGameSync]);

  // Mostra un toast non bloccante (3.5s) E forza una sync immediata per recuperare
  // dallo stato disallineato (es. il client invia roundId vecchio, server risponde
  // 400 → senza recovery l'utente resta bloccato finche` non clicca di nuovo).
  const reportActionError = useCallback((err: unknown, ctx: string) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ACTION ERROR] ${ctx}:`, msg);
    setActionError(msg);
    if (actionErrorTimerRef.current) clearTimeout(actionErrorTimerRef.current);
    actionErrorTimerRef.current = setTimeout(() => setActionError(null), 3500);
    void applyPlayGameSync();
    resetHasSubmitted();
  }, [applyPlayGameSync, resetHasSubmitted]);

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
    onPresenceReady: () => {
      void applyPlayGameSync();
    },
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
    if (!player) {
      throw new Error('Sessione non pronta');
    }

    // IMPORTANTE: leggiamo il roundId dal ref (sempre aggiornato in modo sincrono
    // da customGameEventHandler) invece che dallo state `roundData` (asincrono via
    // setState). Questo evita che, in una micro-finestra dopo round-started,
    // un click invii la risposta col roundId del round PRECEDENTE → server
    // restituirebbe 400 "Hai gia` risposto" e visivamente il bottone "tornerebbe
    // indietro" (selectedAnswer reset nel catch).
    const answerRoundId =
      triviaRoundIdRef.current ??
      ((roundData as TriviaRoundData & { roundId?: string } | null)?.roundId ?? null);
    if (!answerRoundId) {
      throw new Error('Nessun round attivo');
    }

    console.log('[CLICK] handleTriviaAnswer', { answerRoundId, answer, responseTimeMs });
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
      console.log('[CLICK] trivia response', { status: response.status, data, refNow: triviaRoundIdRef.current });

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Risposta non inviata (${response.status})`);
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
      triviaResultRoundIdRef.current = answerRoundId;
      markAsSubmitted(answerRoundId);
    } catch (err) {
      reportActionError(err, 'POST /api/game/trivia/answer');
      throw err;
    }
  };

  const handlePromptResponse = async (response: string) => {
    if (!player) return;
    const sentRoundId =
      promptRoundIdRef.current ??
      ((roundData as PromptRoundData & { roundId?: string } | null)?.roundId ?? null);
    if (!sentRoundId) return;

    console.log('[CLICK] handlePromptResponse', { sentRoundId, length: response.length });
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
      console.log('[CLICK] prompt response', { status: res.status, data });
      if (!data.success) {
        throw new Error(data.error || `Risposta non inviata (${res.status})`);
      }
      if (promptRoundIdRef.current !== sentRoundId) return;
      markAsSubmitted(sentRoundId);
    } catch (err) {
      reportActionError(err, 'POST /api/game/prompt/response');
      throw err;
    }
  };

  const handlePromptVote = async (responseId: string) => {
    if (!player) return;
    const sentRoundId =
      promptRoundIdRef.current ??
      ((roundData as PromptRoundData & { roundId?: string } | null)?.roundId ?? null);
    if (!sentRoundId) return;

    console.log('[CLICK] handlePromptVote', { sentRoundId, responseId });
    try {
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
      console.log('[CLICK] prompt vote response', { status: res.status, data });
      if (!data.success) {
        throw new Error(data.error || `Voto non registrato (${res.status})`);
      }
      if (promptRoundIdRef.current !== sentRoundId) return;
      markAsSubmitted(sentRoundId);
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
    } catch (err) {
      reportActionError(err, 'POST /api/game/prompt/vote');
      throw err;
    }
  };

  const handleSecretSubmit = async (secret: string) => {
    if (!player) return;

    const sentRoundIdAtStart = secretRoundIdRef.current;
    console.log('[CLICK] handleSecretSubmit', { sentRoundIdAtStart });

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
      console.log('[CLICK] secret submit response', { status: res.status, data });
      if (!data.success) {
        throw new Error(data.error || `Segreto non inviato (${res.status})`);
      }
      if (secretRoundIdRef.current !== sentRoundIdAtStart) return;
      markAsSubmitted(sentRoundIdAtStart);
    } catch (err) {
      reportActionError(err, 'POST /api/game/secret/submit');
      throw err;
    }
  };

  const handleSecretVote = async (suspectedPlayerId: string) => {
    if (!player) return;
    const sentRoundId =
      secretRoundIdRef.current ??
      ((roundData as SecretRoundData & { roundId?: string } | null)?.roundId ?? null);
    if (!sentRoundId) return;

    console.log('[CLICK] handleSecretVote', { sentRoundId, suspectedPlayerId });
    try {
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
      console.log('[CLICK] secret vote response', { status: res.status, data });
      if (!data.success) {
        throw new Error(data.error || `Voto non registrato (${res.status})`);
      }
      if (secretRoundIdRef.current !== sentRoundId) return;
      markAsSubmitted(sentRoundId);
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
    } catch (err) {
      reportActionError(err, 'POST /api/game/secret/vote');
      throw err;
    }
  };

  const handleNewGameAction = async (endpoint: string, body: Record<string, unknown>) => {
    if (!player) return;
    // Snapshot SINCRONO da ref del roundId al momento del click.
    const sentRoundId = newGameRoundIdRef.current;
    const sentPhase = newGamePhaseRef.current;
    console.log('[CLICK] handleNewGameAction', { endpoint, sentRoundId, sentPhase, body });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId: player.id, roundId: sentRoundId, ...body }),
      });
      const data = await res.json();
      console.log('[CLICK] response', { endpoint, status: res.status, data, refRoundIdNow: newGameRoundIdRef.current, refPhaseNow: newGamePhaseRef.current });
      if (!data.success) throw new Error(data.error || `Azione non riuscita (${res.status})`);
      // CRITICO: se il round non è cambiato, marca SEMPRE come inviato,
      // anche se la fase è già avanzata. Spesso il click stesso fa scattare
      // la transizione di fase (es. ultimo voto del round); il phase-changed
      // arriva via Pusher PRIMA che la POST risponda, e una guardia "phase==same"
      // lasciava `hasSubmitted=false` → l'utente vedeva il bottone ancora attivo
      // e cliccava di nuovo, finendo in loop con risposte che "non si contano".
      if (newGameRoundIdRef.current !== sentRoundId) {
        return;
      }
      markAsSubmitted(sentRoundId);
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 800);
    } catch (err) {
      reportActionError(err, `POST ${endpoint}`);
      throw err;
    }
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
      {actionError && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] px-3 py-2 rounded-xl bg-red-600/90 backdrop-blur text-white text-xs sm:text-sm font-bold shadow-2xl border border-red-400/40 max-w-[92vw] text-center animate-bounce-in">
          ⚠️ {actionError}
        </div>
      )}
      
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

          if (gt === 'CHAMELEON') {
            const _curId = String(player.id || '').trim();
            const _chId = String(newGameData.chameleonId ?? '').trim();
            const _meIsChameleon = _curId.length > 0 && _chId.length > 0 && _curId === _chId;
            return (
            <div className="animate-slide-up">
              <ChameleonController phase={(phase as any) || 'HINTING'}
                secretWord={_meIsChameleon ? null : (newGameData.secretWord as string)}
                chameleonId={_chId} currentPlayerId={_curId}
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
          }

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
