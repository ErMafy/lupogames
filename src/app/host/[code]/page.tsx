// 🐺 LUPO GAMES - Host View PREMIUM (Tabellone)
// La pagina che va sul PC/TV grande - qui si vede il CAOS in 4K!

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import { useGameEvents } from '@/hooks/useGameEvents';
import { PromptController } from '@/components/game/PromptController';
import { SecretController } from '@/components/game/SecretController';
import { TriviaController } from '@/components/game/TriviaController';
import type {
  PusherMember,
  AvatarSelectedEvent,
  GameType,
  TriviaRoundData,
  PromptRoundData,
  SecretRoundData,
} from '@/types';

interface Player {
  id: string;
  name: string;
  avatar: string | null;
  avatarColor: string | null;
  isHost: boolean;
  score: number;
  trackPosition: number;
  isConnected: boolean;
}

interface TriviaQuestion {
  id: string;
  question: string;
  category?: string;
  options: { A: string; B: string; C: string; D: string };
}

interface PromptData {
  phraseId: string;
  phrase: string;
  phase: 'WRITING' | 'VOTING' | 'RESULTS';
  responses?: Array<{ id: string; playerId: string; playerName: string; response: string; voteCount?: number }>;
}

interface SecretData {
  secretContent?: string;
  phase: 'COLLECTING' | 'GUESSING' | 'REVEAL';
  players?: Array<{
    id: string;
    name: string;
    avatar: string | null;
    avatarColor?: string | null;
  }>;
  actualPlayer?: { id: string; name: string };
}

// Componente Timer Circolare Premium
function CircularTimer({ timeLeft, maxTime }: { timeLeft: number; maxTime: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / maxTime) * circumference;
  const isUrgent = timeLeft <= 5;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${isUrgent ? 'animate-countdown' : ''}`}>
      <svg width="140" height="140" className="transform -rotate-90">
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isUrgent ? '#EF4444' : '#8B5CF6'} />
            <stop offset="100%" stopColor={isUrgent ? '#F59E0B' : '#EC4899'} />
          </linearGradient>
        </defs>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#timer-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black ${isUrgent ? 'text-red-400' : 'text-white'}`}>
          {timeLeft}
        </span>
        <span className="text-xs text-white/60 uppercase tracking-wider">secondi</span>
      </div>
    </div>
  );
}

// Componente Leaderboard Premium
function Leaderboard({ players, compact = false }: { players: Player[]; compact?: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.slice(0, 5).map((p, i) => (
          <div 
            key={p.id} 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm ${
              i === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/20 border border-yellow-500/30' :
              i === 1 ? 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border border-slate-400/20' :
              i === 2 ? 'bg-gradient-to-r from-orange-500/20 to-amber-600/10 border border-orange-500/20' :
              'bg-white/5 border border-white/10'
            }`}
          >
            <span className={`font-black text-lg ${
              i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-white/60'
            }`}>
              {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className="text-xl">{p.avatar ? getAvatarEmoji(p.avatar) : '🐺'}</span>
            <span className="text-white font-semibold">{p.name}</span>
            <span className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-purple-300'}`}>{p.score}</span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {sorted.map((p, i) => (
        <div 
          key={p.id}
          className={`leaderboard-item ${i < 3 ? 'animate-slide-up' : ''}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className={`leaderboard-rank ${
            i === 0 ? 'leaderboard-rank-1' : i === 1 ? 'leaderboard-rank-2' : i === 2 ? 'leaderboard-rank-3' : 'bg-white/10'
          }`}>
            {i === 0 ? '👑' : i + 1}
          </div>
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: p.avatarColor || '#6B7280' }}
          >
            {p.avatar ? getAvatarEmoji(p.avatar) : '🐺'}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">{p.name}</p>
            {p.isHost && <span className="text-xs text-yellow-400">Host</span>}
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${i === 0 ? 'text-gradient-gold' : 'text-white'}`}>
              {p.score}
            </p>
            <p className="text-xs text-white/50">punti</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Card Gioco Premium
function GameCard({ 
  emoji, 
  title, 
  subtitle,
  description,
  gradient, 
  onClick, 
  disabled 
}: { 
  emoji: string;
  title: string;
  subtitle: string;
  description?: string;
  gradient: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-white text-center transition-all duration-500 ${gradient} disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shadow-xl shadow-black/30 touch-manipulation`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      <div className="relative z-10">
        <div className="text-3xl sm:text-6xl mb-2 sm:mb-4 drop-shadow-lg">{emoji}</div>
        <div className="text-base sm:text-2xl font-black mb-1 sm:mb-2 tracking-tight">{title}</div>
        <div className="text-white/90 font-semibold text-xs sm:text-sm mb-2 sm:mb-3">{subtitle}</div>
        {description && (
          <p className="text-white/70 text-sm leading-relaxed text-left px-1 border-t border-white/15 pt-3 mt-2">
            {description}
          </p>
        )}
      </div>
      
      {/* Border glow */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
           style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.2)' }} />
    </button>
  );
}

// Player Card Premium
function PlayerCard({ player, showScore = false }: { player: Player; showScore?: boolean }) {
  return (
    <div className="glass-card p-4 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
      <div 
        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3 ring-2 ring-white/20"
        style={{ backgroundColor: player.avatarColor || '#6B7280' }}
      >
        {player.avatar ? getAvatarEmoji(player.avatar) : '❓'}
      </div>
      <p className="text-white font-bold truncate">{player.name}</p>
      {player.isHost && (
        <span className="inline-flex items-center gap-1 text-xs text-yellow-400 font-semibold">
          👑 Host
        </span>
      )}
      {showScore && player.score > 0 && (
        <p className="text-purple-300 font-bold mt-1">{player.score} pts</p>
      )}
    </div>
  );
}

export default function HostPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostPlayer, setHostPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<'lobby' | 'playing' | 'results'>('lobby');
  const [currentGameType, setCurrentGameType] = useState<GameType | null>(null);
  
  // Trivia state
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [currentRoundNum, setCurrentRoundNum] = useState(0);
  const [totalRoundsNum, setTotalRoundsNum] = useState(10);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<string | null>(null);
  
  // Prompt game state
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  
  // Secret game state  
  const [secretData, setSecretData] = useState<SecretData | null>(null);

  // Host trivia state
  const hostTriviaRoundIdRef = useRef<string | null>(null);
  const [hostTriviaResult, setHostTriviaResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    correctAnswerText?: string;
    pointsEarned: number;
  } | null>(null);

  // Game state hook (tabellone + partecipazione host come giocatore)
  const {
    handleGameEvent,
    controllerView,
    roundData,
    hasSubmitted,
    markAsSubmitted,
    resetHasSubmitted,
    timeRemaining,
  } = useGameEvents();

  // Carica i dati iniziali
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const storedPlayer = localStorage.getItem('lupo_player');
        if (storedPlayer) {
          setHostPlayer(JSON.parse(storedPlayer));
        }

        const response = await fetch(`/api/rooms?code=${roomCode}`);
        const data = await response.json();

        if (data.success) {
          setPlayers(data.data.players);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Errore nel caricamento della stanza');
      } finally {
        setIsLoading(false);
      }
    };

    if (roomCode) {
      loadRoom();
    }
  }, [roomCode]);

  // Timer trivia tabellone (30s)
  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0 && currentGameType === 'TRIVIA') {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, timeLeft, currentGameType]);

  useEffect(() => {
    if (gamePhase !== 'playing' || !roomCode) return;
    const id = setInterval(() => {
      void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [gamePhase, roomCode]);

  // Pusher handlers
  const handleMemberAdded = useCallback(() => {
    fetch(`/api/rooms?code=${roomCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPlayers(data.data.players);
      });
  }, [roomCode]);

  const handleMemberRemoved = useCallback(() => {
    // Non usare member.id per togliere dalla lista: è legato alla presence Pusher; quando i telefoni
    // passano play → lobby si disconnettono un attimo e l'host riceveva member_removed per tutti → lista vuota.
    fetch(`/api/rooms?code=${roomCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPlayers(data.data.players);
      });
  }, [roomCode]);

  const handleAvatarSelected = useCallback((event: AvatarSelectedEvent) => {
    setPlayers(prev => prev.map(p => 
      p.id === event.playerId 
        ? { ...p, avatar: event.avatar, avatarColor: event.avatarColor }
        : p
    ));
  }, []);

  const handleCustomGameEvent = useCallback((eventName: string, data: unknown) => {
    console.log('🎮 Game event:', eventName, data);
    const eventData = data as Record<string, unknown>;
    
    if (eventName === 'game-started') {
      setGamePhase('playing');
      setCurrentGameType(eventData.gameType as GameType);
    }
    
    if (eventName === 'round-started') {
      if (eventData.gameType === 'TRIVIA') {
        const roundData = eventData.data as { questionId: string; question: string; category?: string; options: { A: string; B: string; C: string; D: string }; timeLimit?: number; roundId?: string };
        setCurrentQuestion({
          id: roundData.questionId,
          question: roundData.question,
          category: roundData.category,
          options: roundData.options,
        });
        setCurrentRoundNum(eventData.roundNumber as number);
        setTotalRoundsNum((eventData.totalRounds as number) || 5);
        setTimeLeft(roundData.timeLimit || 30);
        setShowCorrectAnswer(null);
        setHostTriviaResult(null);
        hostTriviaRoundIdRef.current = roundData.roundId ?? null;
      }
      
      if (eventData.gameType === 'CONTINUE_PHRASE') {
        const roundData = eventData.data as { phraseId: string; phrase: string; phase?: 'WRITING' | 'VOTING' | 'RESULTS' };
        const phase = (eventData.phase as typeof roundData.phase) || roundData.phase || 'WRITING';
        setPromptData({
          phraseId: roundData.phraseId,
          phrase: roundData.phrase,
          phase,
        });
        setCurrentRoundNum(eventData.roundNumber as number);
      }
      
      if (eventData.gameType === 'WHO_WAS_IT') {
        const roundData = eventData.data as {
          secret?: string;
          secretContent?: string;
          players?: SecretData['players'];
        };
        const ph = (eventData.phase as 'COLLECTING' | 'GUESSING' | 'REVEAL') || 'GUESSING';
        setSecretData({
          secretContent: roundData.secret ?? roundData.secretContent,
          phase: ph,
          players: roundData.players,
        });
        setCurrentRoundNum(eventData.roundNumber as number);
      }
    }

    if (eventName === 'phase-changed') {
      const pd = eventData as { gameType: string; phase: string; data?: { responses?: { id: string; response: string }[] } };
      if (pd.gameType === 'CONTINUE_PHRASE' && pd.phase === 'VOTING' && pd.data?.responses) {
        setPromptData((prev) =>
          prev
            ? {
                ...prev,
                phase: 'VOTING',
                responses: pd.data!.responses!.map((r) => ({
                  id: r.id,
                  playerId: '',
                  playerName: '???',
                  response: r.response,
                })),
              }
            : null
        );
        resetHasSubmitted();
      }
      if (pd.gameType === 'WHO_WAS_IT' && pd.phase === 'GUESSING') {
        resetHasSubmitted();
      }
    }

    if (eventName === 'round-results') {
      if (eventData.gameType === 'CONTINUE_PHRASE') {
        const results = eventData.results as Array<{
          responseId: string;
          response: string;
          playerId: string;
          playerName: string;
          voteCount: number;
        }>;
        setPromptData((prev) =>
          prev
            ? {
                ...prev,
                phase: 'RESULTS',
                responses: results.map((r) => ({
                  id: r.responseId,
                  playerId: r.playerId,
                  playerName: r.playerName,
                  response: r.response,
                  voteCount: r.voteCount,
                })),
              }
            : null
        );
      }
      if (eventData.gameType === 'WHO_WAS_IT') {
        const r = eventData.results as {
          secret: string;
          owner: { id: string; name: string; avatar: string | null };
        };
        setSecretData((prev) => ({
          ...prev!,
          phase: 'REVEAL',
          secretContent: r.secret,
          actualPlayer: { id: r.owner.id, name: r.owner.name },
        }));
      }
    }
    
    if (eventName === 'show-results' && eventData.correctAnswer) {
      setShowCorrectAnswer(eventData.correctAnswer as string);
      setHostTriviaResult((prev) =>
        prev || {
          isCorrect: false,
          correctAnswer: eventData.correctAnswer as string,
          correctAnswerText: undefined,
          pointsEarned: 0,
        }
      );
    }
    
    if (eventName === 'prompt-responses') {
      const responses = eventData.responses as Array<{ id: string; playerId: string; playerName: string; response: string; voteCount?: number }>;
      setPromptData(prev => prev ? { ...prev, phase: 'VOTING', responses } : null);
      resetHasSubmitted();
    }
    
    if (eventName === 'prompt-results') {
      const responses = eventData.responses as Array<{ id: string; playerId: string; playerName: string; response: string; voteCount?: number }>;
      setPromptData(prev => prev ? { ...prev, phase: 'RESULTS', responses } : null);
    }
    
    if (eventName === 'secret-reveal') {
      const actualPlayer = eventData.actualPlayer as { id: string; name: string };
      setSecretData(prev => prev ? { ...prev, phase: 'REVEAL', actualPlayer } : null);
    }
    
    if (eventName === 'game-ended') {
      // L'host resta sul tabellone per avviare una nuova partita
      setGamePhase('lobby');
      setCurrentQuestion(null);
      setPromptData(null);
      setSecretData(null);
      setCurrentGameType(null);
      setShowCorrectAnswer(null);
      fetch(`/api/rooms?code=${roomCode}`)
        .then((res) => res.json())
        .then((d) => {
          if (d.success) setPlayers(d.data.players);
        });
    }
    
    handleGameEvent(eventName, data);
  }, [roomCode, handleGameEvent, resetHasSubmitted]);

  const handleHostPromptResponse = useCallback(
    async (response: string) => {
      if (!hostPlayer || !roundData || currentGameType !== 'CONTINUE_PHRASE') return;
      const rd = roundData as PromptRoundData & { roundId?: string };
      if (!rd.roundId) return;
      try {
        const res = await fetch('/api/game/prompt/response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            playerId: hostPlayer.id,
            roundId: rd.roundId,
            response,
          }),
        });
        const data = await res.json();
        if (data.success) markAsSubmitted();
      } catch (e) {
        console.error('Host prompt response:', e);
      }
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  const handleHostPromptVote = useCallback(
    async (responseId: string) => {
      if (!hostPlayer || !roundData || currentGameType !== 'CONTINUE_PHRASE') return;
      const rd = roundData as PromptRoundData & { roundId?: string };
      if (!rd.roundId) return;
      const res = await fetch('/api/game/prompt/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: hostPlayer.id,
          roundId: rd.roundId,
          responseId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Voto non registrato');
      }
      markAsSubmitted();
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  const handleHostSecretSubmit = useCallback(
    async (secret: string) => {
      if (!hostPlayer) return;
      try {
        const res = await fetch('/api/game/secret/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            playerId: hostPlayer.id,
            secret,
          }),
        });
        const data = await res.json();
        if (data.success) markAsSubmitted();
      } catch (e) {
        console.error('Host secret submit:', e);
      }
    },
    [hostPlayer, roomCode, markAsSubmitted]
  );

  const handleHostSecretVote = useCallback(
    async (suspectedPlayerId: string) => {
      if (!hostPlayer || !roundData || currentGameType !== 'WHO_WAS_IT') return;
      const rd = roundData as SecretRoundData & { roundId?: string };
      if (!rd.roundId) return;
      const res = await fetch('/api/game/secret/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: hostPlayer.id,
          roundId: rd.roundId,
          suspectedPlayerId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Voto non registrato');
      }
      markAsSubmitted();
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  const handleHostTriviaAnswer = useCallback(
    async (answer: 'A' | 'B' | 'C' | 'D', responseTimeMs: number) => {
      if (!hostPlayer || !roundData || currentGameType !== 'TRIVIA') return;
      const rd = roundData as TriviaRoundData & { roundId?: string };
      if (!rd.roundId) return;
      const sentRoundId = rd.roundId;
      const res = await fetch('/api/game/trivia/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: hostPlayer.id,
          roundId: sentRoundId,
          answer,
          responseTimeMs,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Risposta non inviata');
      if (hostTriviaRoundIdRef.current !== null && hostTriviaRoundIdRef.current !== sentRoundId) {
        return;
      }
      setHostTriviaResult({
        isCorrect: data.data.isCorrect,
        correctAnswer: data.data.correctAnswer as string,
        correctAnswerText: data.data.correctAnswerText as string | undefined,
        pointsEarned: data.data.pointsEarned,
      });
      markAsSubmitted();
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  const hostPromptRoundForController: (PromptRoundData & { roundId?: string }) | null =
    promptData &&
    roundData &&
    currentGameType === 'CONTINUE_PHRASE' &&
    (promptData.phase === 'WRITING' || promptData.phase === 'VOTING')
      ? {
          ...(roundData as PromptRoundData),
          phrase: promptData.phrase,
          phraseId: promptData.phraseId,
          phase: promptData.phase === 'WRITING' ? 'WRITING' : 'VOTING',
          timeLimit: (roundData as PromptRoundData).timeLimit ?? 60,
          roundId: (roundData as PromptRoundData & { roundId?: string }).roundId,
        }
      : null;

  // Pusher connection
  const { isConnected, memberCount } = usePresenceChannel({
    roomCode,
    playerId: hostPlayer?.id || '',
    playerName: hostPlayer?.name || 'Host',
    isHost: true,
    onMemberAdded: handleMemberAdded,
    onMemberRemoved: handleMemberRemoved,
    onAvatarSelected: handleAvatarSelected,
    onGameEvent: handleCustomGameEvent,
  });

  // Start game
  const startGame = async (gameType: GameType) => {
    setIsLoadingGame(true);
    try {
      const endpoints: Record<GameType, string> = {
        'TRIVIA': '/api/game/trivia',
        'CONTINUE_PHRASE': '/api/game/prompt',
        'WHO_WAS_IT': '/api/game/secret',
      };

      const response = await fetch(endpoints[gameType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, rounds: gameType === 'TRIVIA' ? 10 : 5 }),
      });

      const data = await response.json();
      if (data.success) {
        setGamePhase('playing');
        setCurrentGameType(gameType);
        
        if (gameType === 'TRIVIA' && data.data.question) {
          setCurrentQuestion({
            id: data.data.question.id,
            question: data.data.question.question,
            category: data.data.question.category,
            options: data.data.question.options,
          });
          setCurrentRoundNum(data.data.currentRound);
          setTotalRoundsNum(data.data.totalRounds);
          setTimeLeft(30);
        }
        
        if (gameType === 'CONTINUE_PHRASE' && data.data.phrase) {
          setPromptData({
            phraseId: data.data.phrase.id,
            phrase: data.data.phrase.phrase,
            phase: 'WRITING',
          });
        }
        
        if (gameType === 'WHO_WAS_IT') {
          setSecretData({
            phase: 'COLLECTING',
          });
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError('Errore nell\'avvio del gioco');
    } finally {
      setIsLoadingGame(false);
    }
  };

  // End game
  const endGame = async () => {
    try {
      const response = await fetch('/api/game/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });
      const data = await response.json();
      if (data.success) {
        setGamePhase('lobby');
        setCurrentQuestion(null);
        setPromptData(null);
        setSecretData(null);
        setCurrentGameType(null);
        const roomRes = await fetch(`/api/rooms?code=${roomCode}`);
        const roomData = await roomRes.json();
        if (roomData.success) setPlayers(roomData.data.players);
      }
    } catch {
      setError('Errore nel terminare il gioco');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-stars" />
        <div className="text-center z-10">
          <div className="text-8xl animate-bounce mb-6">🐺</div>
          <div className="text-white text-2xl font-bold animate-pulse">Caricamento stanza...</div>
          <div className="mt-4 w-48 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-stars" />
        <div className="glass-card p-10 text-center max-w-md z-10 animate-bounce-in">
          <div className="text-7xl mb-6">😢</div>
          <p className="text-red-400 text-xl font-bold mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-lupo">
            🏠 Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="bg-stars" />
      
      {/* Header — responsive */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-xl sm:text-3xl animate-float shrink-0">🐺</span>
            <div className="min-w-0">
              <span className="text-white font-black text-sm sm:text-xl block truncate">LUPO GAMES</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-white/60 text-xs sm:text-sm">{memberCount} online</span>
              </div>
            </div>
          </div>
          
          <div className="room-code text-sm sm:text-base px-2 sm:px-4 py-1 tracking-widest shrink-0">
            {roomCode}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {gamePhase === 'playing' && (
              <button
                onClick={endGame}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs sm:text-base transition-all"
              >
                ⏹️ Stop
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8 px-3 sm:px-6 pt-4 relative z-10">
        
        {/* LOBBY VIEW */}
        {gamePhase === 'lobby' && (
          <div className="max-w-6xl mx-auto animate-slide-up">
            
            {/* Join Instructions */}
            <div className="glass-card p-4 sm:p-10 mb-4 sm:mb-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
              <div className="relative z-10">
                <h1 className="text-xl sm:text-4xl font-black text-white mb-2 sm:mb-4">
                  🎮 Unisciti alla Partita!
                </h1>
                <p className="text-purple-200 text-sm sm:text-xl mb-3 sm:mb-6">
                  Vai su <span className="font-bold text-gradient">lupogames.vercel.app</span>
                </p>
                <div className="inline-flex items-center gap-2 sm:gap-4 bg-black/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6">
                  <span className="text-white/80 text-sm sm:text-lg">Codice:</span>
                  <span className="text-2xl sm:text-5xl font-black text-gradient-gold tracking-wider">{roomCode}</span>
                </div>
              </div>
            </div>

            {/* Players Grid */}
            <div className="glass-card p-4 sm:p-8 mb-4 sm:mb-10">
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>👥</span> Giocatori
                </h2>
                <span className="badge text-xs sm:text-sm">{players.length}/15</span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                {players.map((player) => (
                  <PlayerCard key={player.id} player={player} showScore />
                ))}
                
                {players.length < 4 && Array.from({ length: 4 - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="glass-card p-2 sm:p-4 text-center border-2 border-dashed border-white/20"
                  >
                    <div className="w-10 sm:w-16 h-10 sm:h-16 mx-auto rounded-full flex items-center justify-center text-xl sm:text-3xl mb-1 sm:mb-3 bg-white/5">
                      <span className="animate-pulse">⏳</span>
                    </div>
                    <p className="text-white/40 font-medium text-[10px] sm:text-sm">In attesa...</p>
                  </div>
                ))}
              </div>
            </div>

            {players.length >= 2 && (
              <div className="glass-card p-4 sm:p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-lg sm:text-2xl font-black text-white mb-4 sm:mb-8 text-center flex items-center justify-center gap-2">
                  <span>🎯</span> Scegli il Gioco
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <GameCard
                    emoji="🧠"
                    title="La Corsa del Sapere"
                    subtitle="Quiz • 10 domande • 30 sec"
                    description="Rispondi A/B/C/D dal telefono."
                    gradient="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600"
                    onClick={() => startGame('TRIVIA')}
                    disabled={isLoadingGame}
                  />
                  <GameCard
                    emoji="💬"
                    title="Continua la Frase"
                    subtitle="5 round • 45 sec + 45 sec"
                    description="Scrivi e vota la risposta migliore."
                    gradient="bg-gradient-to-br from-pink-600 via-rose-600 to-red-600"
                    onClick={() => startGame('CONTINUE_PHRASE')}
                    disabled={isLoadingGame}
                  />
                  <GameCard
                    emoji="🕵️"
                    title="Chi è Stato?"
                    subtitle="5 round • 45 sec + 45 sec"
                    description="Indovina chi ha scritto il segreto."
                    gradient="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600"
                    onClick={() => startGame('WHO_WAS_IT')}
                    disabled={isLoadingGame}
                  />
                </div>
                
                {isLoadingGame && (
                  <div className="text-center mt-4">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                      <span className="animate-spin text-xl">🎲</span>
                      <span className="text-white font-bold text-sm">Preparando...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {players.length < 2 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 animate-bounce">⏳</div>
                <p className="text-purple-200 text-sm sm:text-xl font-medium">
                  Aspettando almeno <span className="text-gradient font-bold">2 giocatori</span>...
                </p>
              </div>
            )}
            
                        {players.some(p => p.score > 0) && (
              <div className="glass-card p-4 sm:p-8 mt-4 sm:mt-10">
                <h2 className="text-lg sm:text-2xl font-black text-white mb-3 sm:mb-6 flex items-center gap-2">
                  <span>🏆</span> Classifica
                </h2>
                <Leaderboard players={players} />
              </div>
            )}
          </div>
        )}

        {/* TRIVIA PLAYING VIEW */}
        {gamePhase === 'playing' && currentGameType === 'TRIVIA' && currentQuestion && (
          <div className="max-w-4xl mx-auto">
            {/* HOST TRIVIA CONTROLLER — rispondi dal telefono */}
            {hostPlayer && roundData && (controllerView === 'trivia-answer' || (controllerView === 'results' && currentGameType === 'TRIVIA')) && (
              <div className="glass-card p-3 sm:p-5 mb-4 max-w-2xl mx-auto border-2 border-amber-400/40 bg-amber-500/5">
                <p className="text-center text-amber-200 font-bold mb-2 text-sm">👑 Rispondi!</p>
                <TriviaController
                  roundData={roundData as TriviaRoundData}
                  onAnswer={handleHostTriviaAnswer}
                  hasAnswered={hasSubmitted}
                  timeRemaining={timeRemaining}
                  result={hostTriviaResult || undefined}
                  players={players.map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    avatar: p.avatar,
                    score: p.score,
                    trackPosition: p.trackPosition,
                  }))}
                  currentPlayerId={hostPlayer.id}
                />
              </div>
            )}

            <div className="glass-card p-3 sm:p-6 mt-2">
              <h3 className="text-sm sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>🏆</span> Classifica
              </h3>
              <Leaderboard players={players} compact />
            </div>
          </div>
        )}

        {/* PROMPT GAME VIEW */}
        {gamePhase === 'playing' && currentGameType === 'CONTINUE_PHRASE' && promptData && (
          <div className="max-w-4xl mx-auto">
            {/* HOST CONTROLLER — prima di tutto, ben visibile */}
            {hostPlayer &&
              hostPromptRoundForController &&
              (promptData.phase === 'WRITING' || promptData.phase === 'VOTING') && (
              <div className="glass-card p-4 sm:p-6 mb-6 max-w-2xl mx-auto border-2 border-amber-400/40 bg-amber-500/5">
                <p className="text-center text-amber-200 font-bold mb-3 text-base">
                  👑 La tua risposta / voto
                </p>
                <PromptController
                  roundData={hostPromptRoundForController}
                  phase={promptData.phase === 'VOTING' ? 'VOTING' : 'WRITING'}
                  onSubmitResponse={handleHostPromptResponse}
                  onVote={handleHostPromptVote}
                  hasSubmitted={hasSubmitted}
                  responses={(promptData.responses ?? []).map((r) => ({
                    id: r.id,
                    response: r.response,
                  }))}
                />
              </div>
            )}

            <div className="badge badge-gold text-lg px-4 py-2 mb-6">
              💬 Round {currentRoundNum}
            </div>

            <div className="glass-card p-6 sm:p-10 mb-6 text-center">
              <p className="text-white/60 text-sm sm:text-lg mb-2 uppercase tracking-wider">Completa la frase:</p>
              <h2 className="text-xl sm:text-4xl font-black text-gradient leading-relaxed">
                &ldquo;{promptData.phrase}...&rdquo;
              </h2>
            </div>
            
            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                promptData.phase === 'WRITING' ? 'bg-blue-500/20 text-blue-400' :
                promptData.phase === 'VOTING' ? 'bg-purple-500/20 text-purple-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                <span>{promptData.phase === 'WRITING' ? '✍️' : promptData.phase === 'VOTING' ? '🗳️' : '🎉'}</span>
                <span className="font-bold">
                  {promptData.phase === 'WRITING' ? 'Stanno scrivendo…' :
                   promptData.phase === 'VOTING' ? 'Votazione!' : 'Risultati!'}
                </span>
              </div>
            </div>
            
            {promptData.responses && promptData.responses.length > 0 && (
              <div className="space-y-3">
                {[...promptData.responses]
                  .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                  .map((r, i) => (
                  <div key={r.id} className={`glass-card p-4 sm:p-6 ${i === 0 && promptData.phase === 'RESULTS' ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-2xl text-white font-bold mb-1">&ldquo;{r.response}&rdquo;</p>
                        <p className="text-purple-300 text-sm">— {r.playerName}</p>
                      </div>
                      {promptData.phase === 'RESULTS' && (
                        <div className="text-center shrink-0">
                          <p className="text-2xl sm:text-3xl font-black text-gradient-gold">{r.voteCount || 0}</p>
                          <p className="text-[10px] text-white/60">voti</p>
                        </div>
                      )}
                    </div>
                    {i === 0 && promptData.phase === 'RESULTS' && (
                      <p className="text-center text-xs font-bold text-yellow-400 mt-2">👑 Vincitore!</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECRET GAME VIEW */}
        {gamePhase === 'playing' && currentGameType === 'WHO_WAS_IT' && secretData && (
          <div className="max-w-4xl mx-auto">
            {/* HOST CONTROLLER — prima di tutto, ben visibile */}
            {hostPlayer &&
              (secretData.phase === 'COLLECTING' || secretData.phase === 'GUESSING') && (
              <div className="glass-card p-4 sm:p-6 mb-6 max-w-2xl mx-auto border-2 border-amber-400/40 bg-amber-500/5">
                <p className="text-center text-amber-200 font-bold mb-3 text-base">
                  👑 Il tuo segreto / voto
                </p>
                <SecretController
                  phase={secretData.phase === 'COLLECTING' ? 'COLLECTING' : 'GUESSING'}
                  secret={secretData.secretContent}
                  players={(secretData.players ?? []).map((p) => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    avatarColor: p.avatarColor ?? null,
                  }))}
                  onSubmitSecret={handleHostSecretSubmit}
                  onVote={handleHostSecretVote}
                  hasSubmitted={hasSubmitted}
                  currentPlayerId={hostPlayer.id}
                />
              </div>
            )}

            <div className="badge badge-gold text-lg px-4 py-2 mb-6">
              🕵️ Round {currentRoundNum}
            </div>
            
            {secretData.phase === 'COLLECTING' && (
              <div className="glass-card p-6 sm:p-10 text-center">
                <div className="text-4xl mb-4">🤫</div>
                <h2 className="text-xl sm:text-3xl font-black text-white mb-2">
                  Stanno scrivendo i segreti...
                </h2>
                <div className="animate-spin text-2xl mt-4">⏳</div>
              </div>
            )}
            
            {secretData.phase === 'GUESSING' && secretData.secretContent && (
              <div className="glass-card p-6 sm:p-10 mb-6 text-center">
                <p className="text-white/60 text-sm sm:text-lg mb-2 uppercase tracking-wider">Il segreto è:</p>
                <h2 className="text-xl sm:text-4xl font-black text-gradient leading-relaxed">
                  &ldquo;{secretData.secretContent}&rdquo;
                </h2>
                <p className="text-purple-300 text-sm mt-4">🔍 Chi l&apos;ha scritto? Vota sopra!</p>
              </div>
            )}
            
            {secretData.phase === 'REVEAL' && secretData.actualPlayer && (
              <div className="glass-card p-6 sm:p-10 text-center">
                <div className="text-4xl mb-4">🎭</div>
                <h2 className="text-xl sm:text-3xl font-black text-white mb-3">Era di...</h2>
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl px-6 py-3">
                  <span className="text-3xl">{players.find(p => p.id === secretData.actualPlayer?.id)?.avatar ? getAvatarEmoji(players.find(p => p.id === secretData.actualPlayer?.id)?.avatar || '') : '🐺'}</span>
                  <span className="text-2xl font-black text-white">{secretData.actualPlayer.name}</span>
                </div>
              </div>
            )}
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
