// 🐺 LUPO GAMES - Controller PREMIUM (Smartphone)
// Il telecomando/joypad dei giocatori - LUSSO PURO

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import { useGameEvents } from '@/hooks/useGameEvents';
import { AvatarGrid } from '@/components/game/AvatarGrid';
import { TriviaController } from '@/components/game/TriviaController';
import { PromptController } from '@/components/game/PromptController';
import { SecretController } from '@/components/game/SecretController';
import { TriviaVictoryAnimation } from '@/components/game/TriviaVictoryAnimation';
import type { PusherMember, AvatarSelectedEvent, TriviaRoundData, PromptRoundData, SecretRoundData } from '@/types';

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

  // Stato per "Chi è Stato?"
  const [secretPhase, setSecretPhase] = useState<'COLLECTING' | 'GUESSING'>('COLLECTING');
  const [secretPlayers, setSecretPlayers] = useState<{ id: string; name: string; avatar: string | null; avatarColor: string | null }[]>([]);
  const [currentSecret, setCurrentSecret] = useState<string>('');
  const [secretReveal, setSecretReveal] = useState<{ ownerName: string; ownerAvatar: string | null } | null>(null);

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
    }, 4000);
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
    
    if (eventName === 'avatar-deselected') {
      handleAvatarDeselected(data as { playerId: string; avatar: string });
    }
    
    if (eventName === 'phase-changed') {
      const phaseData = data as { gameType: string; phase: string; data?: { responses?: { id: string; response: string }[] } };
      if (phaseData.gameType === 'CONTINUE_PHRASE') {
        const newPhase = phaseData.phase as 'WRITING' | 'VOTING';
        setPromptPhase(newPhase);
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
    }

    if (eventName === 'round-started') {
      const roundStartData = data as { gameType: string; phase?: string; data?: { secret?: string; roundId?: string; players?: { id: string; name: string; avatar: string | null; avatarColor: string | null }[] } };
      if (roundStartData.gameType === 'WHO_WAS_IT' && roundStartData.data) {
        setSecretPhase(roundStartData.phase as 'COLLECTING' | 'GUESSING' || 'GUESSING');
        setSecretReveal(null);
        secretRoundIdRef.current = roundStartData.data.roundId ?? null;
        if (roundStartData.data.secret) {
          setCurrentSecret(roundStartData.data.secret);
        }
        if (roundStartData.data.players) {
          setSecretPlayers(roundStartData.data.players);
        }
      }
      if (roundStartData.gameType === 'CONTINUE_PHRASE') {
        setPromptRoundResults(null);
        const rd = (data as { data?: { roundId?: string } }).data;
        promptRoundIdRef.current = rd?.roundId ?? null;
        promptPhaseRef.current = 'WRITING';
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
  }, [handleAvatarDeselected, handleGameEvent, roomCode, router, resetHasSubmitted]);

  const gameEventHandlerRef = useRef(customGameEventHandler);
  gameEventHandlerRef.current = customGameEventHandler;

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
  };

  // Loading Premium
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-stars" />
        <div className="text-center z-10">
          <div className="text-7xl animate-bounce mb-6">🐺</div>
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
            <span className="text-2xl animate-float">🐺</span>
            <div className="room-code text-sm px-3 py-1 tracking-widest">
              {roomCode}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
              <div className="mt-10 text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="glass-card inline-flex items-center gap-3 px-6 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">⏳</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold">Pronto!</p>
                    <p className="text-green-300/80 text-sm">In attesa dell'host...</p>
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

        {/* Round Results — solo se nessun risultato specifico inline e non trivia */}
        {controllerView === 'results' && !promptRoundResults && !secretReveal && currentGame !== 'TRIVIA' && (
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
