// 🐺 LUPO GAMES - Host View PREMIUM (Tabellone)
// La pagina che va sul PC/TV grande - qui si vede il CAOS in 4K!

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import { useGameEvents } from '@/hooks/useGameEvents';
import { PromptController } from '@/components/game/PromptController';
import { SecretController } from '@/components/game/SecretController';
import { TriviaController } from '@/components/game/TriviaController';
import { TriviaVictoryAnimation } from '@/components/game/TriviaVictoryAnimation';
import { SwipeTrashController } from '@/components/game/SwipeTrashController';
import { TribunaleController } from '@/components/game/TribunaleController';
import { BombController } from '@/components/game/BombController';
import { ThermometerController } from '@/components/game/ThermometerController';
import { HerdMindController } from '@/components/game/HerdMindController';
import { ChameleonController } from '@/components/game/ChameleonController';
import { SplitRoomController } from '@/components/game/SplitRoomController';
import { InterviewController } from '@/components/game/InterviewController';
import { LobbyChat, dispatchLobbyChatFromPusher, type LobbyChatMessage } from '@/components/lobby/LobbyChat';
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
  skipVoting?: boolean; // Flag per saltare votazione in 2 giocatori
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
function Leaderboard({ players, compact = false, scoreSnapshot }: { players: Player[]; compact?: boolean; scoreSnapshot?: Record<string, number> }) {
  const displayPlayers = scoreSnapshot
    ? players.map(p => ({ ...p, score: Math.max(0, p.score - (scoreSnapshot[p.id] || 0)) }))
    : players;
  const sorted = [...displayPlayers].sort((a, b) => b.score - a.score);
  
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

const GAME_DETAILS: Record<string, string> = {
  'La Corsa del Sapere': 'Rispondi a domande di cultura generale prima degli altri! 4 opzioni, 1 risposta giusta, 30 secondi per decidere. Più sei veloce, più punti guadagni!',
  'Continua la Frase': 'Ti diamo l\'inizio di una frase assurda e tu la completi. Poi tutti votano la risposta più divertente. Creatività e umorismo vincono!',
  'Chi è Stato?': 'Uno scrive un segreto anonimo. Gli altri devono indovinare chi l\'ha scritto. Bluffa o confessa: a te la scelta!',
  'Swipe Trash': 'Il termometro dell\'indignazione! Ti mostriamo concetti controversi e voti SÌ o NO. Chi vota con la maggioranza prende punti. Segui l\'istinto della massa!',
  'Il Tribunale del Popolo': 'Rovina le amicizie puntando il dito! Una domanda infame, tutti votano in segreto. Chi prende più voti diventa l\'Imputato e deve difendersi. Poi il verdetto finale!',
  'La Bomba': 'La patata bollente digitale! Hai la bomba? Scrivi una parola nella categoria e passala velocemente. Chi ce l\'ha quando esplode... perde tutto!',
  'Il Termometro del Disagio': 'Indovina cosa pensa la stanza! Un concetto, uno slider da 0 a 100. Più ti avvicini alla media del gruppo, più punti fai. Conosci i tuoi amici?',
  'Mente di Gregge': 'L\'originalità fa schifo! Una categoria, una risposta. Solo chi scrive la stessa cosa della maggioranza prende punti. Pensa come la massa!',
  'Il Camaleonte': 'Mimetizzati tra gli innocenti! Tutti conoscono la parola segreta tranne il Camaleonte. Scrivi un indizio senza farti scoprire... o scova chi finge!',
  'Lo Spacca-Stanza': 'Crea dilemmi impossibili! Completa un dilemma e tutti votano SÌ o NO. Fai più punti se spacchi il gruppo esattamente a metà. 50/50 è l\'obiettivo!',
  'Colloquio Disperato': 'Costruisci frasi rubando le parole degli altri! Prima rispondi a domande rompighiaccio, poi le tue parole vengono mischiate. Crea la frase migliore e vota!',
};

function GameInfoModal({ title, emoji, onClose }: { title: string; emoji: string; onClose: () => void }) {
  const detail = GAME_DETAILS[title] || '';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-[24px] p-[1px] animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-purple-500/50 via-white/[0.08] to-pink-500/30" />
        <div className="relative rounded-[23px] bg-[#0c0c20]/97 backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="p-6">
            <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/40 text-sm active:scale-90 transition-transform hover:bg-white/[0.12]">
              ✕
            </button>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/15 border border-white/[0.08] flex items-center justify-center text-3xl mb-4 shadow-lg shadow-purple-500/10">
              {emoji}
            </div>
            <h3 className="text-white font-black text-xl mb-3 pr-8">{title}</h3>
            <p className="text-white/55 text-sm leading-relaxed font-medium">{detail}</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />
        </div>
      </div>
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
  disabled,
  onInfo,
}: { 
  emoji: string;
  title: string;
  subtitle: string;
  description?: string;
  gradient: string;
  onClick: () => void;
  disabled: boolean;
  onInfo: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full group relative overflow-hidden p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-white text-center transition-all duration-500 ${gradient} disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shadow-xl shadow-black/30 touch-manipulation`}
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
        
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
             style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.2)' }} />
      </button>
      {/* Info button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onInfo(); }}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 text-xs sm:text-sm font-bold z-20 active:scale-90 transition-transform hover:bg-black/60"
      >
        ?
      </button>
    </div>
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
  const [secretOwnerId, setSecretOwnerId] = useState<string | null>(null);

  // Generic new game state
  const [newGameData, setNewGameData] = useState<Record<string, unknown> | null>(null);
  const newGameRoundIdRef = useRef<string | null>(null);
  // Phase corrente "viva" tracciata via ref (non da state chiuso): senza
  // questo, il guard in handleNewGameAction confrontava due letture della
  // stessa closure di newGameData → sempre uguali → markAsSubmitted veniva
  // chiamato anche dopo un cambio fase, lasciando l'host bloccato.
  const newGamePhaseRef = useRef<string | null>(null);
  // Idempotenza phase-changed (chiave roundId::gameType::phase)
  const lastLocalPhaseKeyRef = useRef<string | null>(null);
  
  // Victory animation state
  const [showVictory, setShowVictory] = useState(false);
  const [victoryWinner, setVictoryWinner] = useState<{ playerId: string; playerName: string; avatar: string; score: number } | null>(null);

  // Game info modal
  const [infoModal, setInfoModal] = useState<{ title: string; emoji: string } | null>(null);

  // Score snapshot at game start (to compute per-game deltas)
  const scoreSnapshotRef = useRef<Record<string, number>>({});
  const lastHostSyncRevisionRef = useRef<string | null>(null);
  const lastHostKnownSyncVersionRef = useRef<number | null>(null);
  const handleCustomGameEventRef = useRef<(eventName: string, data: unknown) => void>(() => {});
  const lastRoundNumberRef = useRef<number>(0);

  // Host trivia state
  const hostTriviaRoundIdRef = useRef<string | null>(null);
  // Tiene traccia di per QUALE roundId e` valido `hostTriviaResult`. Senza
  // questo, il merge in show-results preservava `correctAnswerText` del round
  // precedente (es. round 1 "Hertz") anche dopo l'avanzo a round 2 ("Charles
  // Darwin"), facendo apparire un overlay "Sbagliato A: Hertz" sopra la nuova
  // domanda + bloccando visivamente il flusso del round successivo.
  const hostTriviaResultRoundIdRef = useRef<string | null>(null);
  const [hostTriviaResult, setHostTriviaResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    correctAnswerText?: string;
    pointsEarned: number;
  } | null>(null);

  // Round-ID refs to guard against stale markAsSubmitted calls
  const hostPromptRoundIdRef = useRef<string | null>(null);
  const hostPromptPhaseRef = useRef<string | null>(null);
  const hostSecretRoundIdRef = useRef<string | null>(null);

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
    }, 2000);
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

    if (eventName === 'lobby-chat' && roomCode) {
      const msg = data as LobbyChatMessage;
      if (msg?.id) dispatchLobbyChatFromPusher(roomCode, msg);
      return;
    }
    
    if (eventName === 'game-started') {
      setGamePhase('playing');
      setCurrentGameType(eventData.gameType as GameType);
      if (eventData.totalRounds) setTotalRoundsNum(eventData.totalRounds as number);
      // Snapshot punteggi solo alla prima game-started (lastRoundNumberRef=0).
      // NON resettare lastRoundNumberRef: il sync rimanda game-started ogni 2.5s
      // e resettarlo permetterebbe a round-started stale di passare la guardia
      // e sovrascrivere lo stato del round corrente (es. triviaResult, roundIdRef).
      if (lastRoundNumberRef.current === 0) {
        const snap: Record<string, number> = {};
        for (const p of players) snap[p.id] = p.score;
        scoreSnapshotRef.current = snap;
      }
    }
    
    if (eventName === 'round-started') {
      const incomingRoundNum = typeof eventData.roundNumber === 'number' ? eventData.roundNumber : 0;
      if (incomingRoundNum > 0 && incomingRoundNum < lastRoundNumberRef.current) {
        return;
      }
      if (incomingRoundNum > 0) {
        lastRoundNumberRef.current = incomingRoundNum;
      }
      if (eventData.gameType === 'TRIVIA') {
        const roundData = eventData.data as { questionId: string; question: string; category?: string; options: { A: string; B: string; C: string; D: string }; timeLimit?: number; roundId?: string };
        const sameTriviaRound = !!roundData.roundId && roundData.roundId === hostTriviaRoundIdRef.current;
        if (!sameTriviaRound && roundData.roundId) {
          // Aggiorna SOLO con un id valido per non azzerare il ref e bloccare i click.
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
          hostTriviaRoundIdRef.current = roundData.roundId;
          hostTriviaResultRoundIdRef.current = null;
        }
      }
      
      if (eventData.gameType === 'CONTINUE_PHRASE') {
        const roundData = eventData.data as { phraseId: string; phrase: string; phase?: 'WRITING' | 'VOTING' | 'RESULTS'; roundId?: string };
        const samePromptRound = !!roundData.roundId && roundData.roundId === hostPromptRoundIdRef.current;
        if (!samePromptRound) {
          const phase = (eventData.phase as typeof roundData.phase) || roundData.phase || 'WRITING';
          setPromptData({
            phraseId: roundData.phraseId,
            phrase: roundData.phrase,
            phase,
          });
          setCurrentRoundNum(eventData.roundNumber as number);
          hostPromptRoundIdRef.current = roundData.roundId ?? null;
          hostPromptPhaseRef.current = phase ?? 'WRITING';
        }
      }
      
      if (eventData.gameType === 'WHO_WAS_IT') {
        const roundData = eventData.data as {
          secret?: string;
          secretContent?: string;
          roundId?: string;
          secretOwnerId?: string;
          players?: SecretData['players'];
        };
        const sameSecretRound = !!roundData.roundId && roundData.roundId === hostSecretRoundIdRef.current;
        if (!sameSecretRound) {
          const ph = (eventData.phase as 'COLLECTING' | 'GUESSING' | 'REVEAL') || 'GUESSING';
          setSecretData({
            secretContent: roundData.secret ?? roundData.secretContent,
            phase: ph,
            players: roundData.players,
          });
          setCurrentRoundNum(eventData.roundNumber as number);
          hostSecretRoundIdRef.current = roundData.roundId ?? null;
          setSecretOwnerId(roundData.secretOwnerId ?? null);
        }
      }

      // New games: store round data generically
      const newGameTypes = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes.includes(eventData.gameType as string)) {
        const ev = eventData as Record<string, unknown>;
        const nested = (ev.data as Record<string, unknown>) || {};
        const topChameleon = typeof ev.chameleonId === 'string' ? ev.chameleonId : '';
        const rd: Record<string, unknown> = {
          ...nested,
          ...(topChameleon ? { chameleonId: topChameleon } : {}),
        };
        const newRoundId = (rd.roundId as string) ?? null;
        const prevRoundId = newGameRoundIdRef.current;
        const sameRound = !!newRoundId && newRoundId === prevRoundId;
        const incomingPhase = (ev.phase as string) || (nested.phase as string) || 'ACTIVE';
        setNewGameData((prev) => {
          if (sameRound && prev) {
            const merged: Record<string, unknown> = { ...prev };
            for (const [k, v] of Object.entries(rd)) {
              if (merged[k] === undefined || merged[k] === null) merged[k] = v;
            }
            if (typeof prev.phase !== 'string' || prev.phase !== 'RESULTS') {
              merged.phase = incomingPhase;
            } else {
              merged.phase = prev.phase;
            }
            merged.gameType = ev.gameType;
            return merged;
          }
          return {
            ...rd,
            gameType: ev.gameType,
            phase: incomingPhase,
            ...(ev.gameType === 'CHAMELEON'
              ? {
                  liveHints: [],
                  chameleonHintCount: 0,
                  chameleonPlayerCount: Array.isArray(nested.players) ? nested.players.length : players.length,
                }
              : {}),
          };
        });
        setCurrentRoundNum(eventData.roundNumber as number);
        setTotalRoundsNum((eventData.totalRounds as number) || 5);
        newGameRoundIdRef.current = newRoundId;
        // Sullo stesso round NON facciamo downgrade della phase ref:
        // un sync HTTP "in ritardo" potrebbe rispedire round-started
        // con la phase server piu` "vecchia" e sovrascriverebbe il
        // ref dopo un phase-changed/round-results gia` applicato.
        if (!sameRound || newGamePhaseRef.current === null) {
          newGamePhaseRef.current = incomingPhase;
        } else if (incomingPhase === 'RESULTS' || incomingPhase === 'EXPLODED') {
          newGamePhaseRef.current = incomingPhase;
        }
        if (!sameRound) {
          resetHasSubmitted();
          lastLocalPhaseKeyRef.current = null;
        }
        if (ev.gameType === 'CHAMELEON' && roomCode && hostPlayer?.id) {
          void fetch(
            `/api/game/chameleon/context?code=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(hostPlayer.id)}`,
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
    }

    if (eventName === 'phase-changed') {
      const pd = eventData as { gameType: string; phase: string; skipVoting?: boolean; data?: { responses?: { id: string; response: string }[]; roundId?: string } };
      // Idempotenza phase-changed (sync HTTP la rimanda ogni 2.5s)
      const phaseRid = pd.data?.roundId || newGameRoundIdRef.current || hostPromptRoundIdRef.current || hostSecretRoundIdRef.current || '';
      const localPhaseKey = `${phaseRid}::${pd.gameType}::${pd.phase}`;
      if (lastLocalPhaseKeyRef.current === localPhaseKey) {
        return;
      }
      lastLocalPhaseKeyRef.current = localPhaseKey;
      if (pd.gameType === 'CONTINUE_PHRASE' && pd.phase === 'VOTING' && pd.data?.responses) {
        hostPromptPhaseRef.current = 'VOTING';
        setPromptData((prev) =>
          prev
            ? {
                ...prev,
                phase: 'VOTING',
                skipVoting: pd.skipVoting || false,
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
      // New games: update phase and merge data
      const newGameTypes2 = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes2.includes(pd.gameType)) {
        const pdx = pd as { data?: Record<string, unknown>; chameleonId?: string };
        const payload = pdx.data || {};
        if (typeof payload.roundId === 'string' && payload.roundId) {
          newGameRoundIdRef.current = payload.roundId;
        }
        newGamePhaseRef.current = pd.phase;
        const topCh = typeof pdx.chameleonId === 'string' ? pdx.chameleonId : '';
        setNewGameData(prev => ({
          ...prev,
          ...payload,
          ...(topCh ? { chameleonId: topCh } : {}),
          phase: pd.phase,
          gameType: pd.gameType,
          ...(pd.gameType === 'CHAMELEON' && pd.phase === 'VOTING' ? { liveHints: [] } : {}),
        }));
        resetHasSubmitted();
      }
    }

    if (eventName === 'round-results') {
      // GUARDIA STALE: round-results in ritardo del round precedente
      // sovrascriverebbero la phase sul nuovo round bloccando i click.
      const rdRoundId = typeof (eventData as { roundId?: string }).roundId === 'string'
        ? ((eventData as { roundId: string }).roundId)
        : null;
      const isStaleNewGame =
        !!rdRoundId && !!newGameRoundIdRef.current && rdRoundId !== newGameRoundIdRef.current;
      const isStalePrompt =
        eventData.gameType === 'CONTINUE_PHRASE' && !!rdRoundId && !!hostPromptRoundIdRef.current && rdRoundId !== hostPromptRoundIdRef.current;
      const isStaleSecret =
        eventData.gameType === 'WHO_WAS_IT' && !!rdRoundId && !!hostSecretRoundIdRef.current && rdRoundId !== hostSecretRoundIdRef.current;
      if (isStaleNewGame || isStalePrompt || isStaleSecret) {
        return;
      }
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
      // New games: store results in newGameData
      const newGameTypes3 = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'];
      if (newGameTypes3.includes(eventData.gameType as string)) {
        newGamePhaseRef.current = 'RESULTS';
        setNewGameData(prev => ({ ...prev, phase: 'RESULTS', results: eventData.results }));
      }

      // Refresh player scores from DB after every round-results
      fetch(`/api/rooms?code=${roomCode}`)
        .then(res => res.json())
        .then(d => { if (d.success) setPlayers(d.data.players); })
        .catch(() => {});
    }
    
    if (eventName === 'bomb-passed') {
      const bp = eventData as { newBombHolderId: string; word: string; remainingMs: number };
      setNewGameData(prev => ({
        ...prev,
        bombHolderId: bp.newBombHolderId,
        words: [...((prev?.words as string[]) || []), bp.word],
      }));
      resetHasSubmitted();
    }
    
    if (eventName === 'chameleon-hint') {
      const ch = eventData as {
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
    
    if (eventName === 'show-results' && eventData.correctAnswer) {
      const srRoundId = typeof eventData.roundId === 'string' ? eventData.roundId : null;
      if (srRoundId && hostTriviaRoundIdRef.current && srRoundId !== hostTriviaRoundIdRef.current) {
        return;
      }
      const letter = eventData.correctAnswer as string;
      const txt =
        typeof (eventData as { correctAnswerText?: string }).correctAnswerText === 'string'
          ? (eventData as { correctAnswerText?: string }).correctAnswerText
          : undefined;
      setShowCorrectAnswer(letter);
      // ROUND-AWARE MERGE: se prev non e` per srRoundId, REPLACE (no merge),
      // altrimenti l'overlay del round precedente si "appiccica" al round nuovo
      // perche` `prev.correctAnswerText || txt` mantiene il testo vecchio.
      const prevForSameRound =
        srRoundId && hostTriviaResultRoundIdRef.current === srRoundId;
      setHostTriviaResult((prev) => {
        if (!prev || !prevForSameRound) {
          return {
            isCorrect: false,
            correctAnswer: letter,
            correctAnswerText: txt,
            pointsEarned: 0,
          };
        }
        return {
          ...prev,
          correctAnswer: letter,
          correctAnswerText: prev.correctAnswerText || txt,
        };
      });
      if (srRoundId) hostTriviaResultRoundIdRef.current = srRoundId;
      // Refresh scores after trivia round results
      fetch(`/api/rooms?code=${roomCode}`)
        .then(res => res.json())
        .then(d => { if (d.success) setPlayers(d.data.players); })
        .catch(() => {});
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
      // Reset guardia round e ref dei giochi specifici per il prossimo gioco
      lastRoundNumberRef.current = 0;
      hostTriviaRoundIdRef.current = null;
      hostTriviaResultRoundIdRef.current = null;
      hostPromptRoundIdRef.current = null;
      hostPromptPhaseRef.current = null;
      hostSecretRoundIdRef.current = null;
      newGameRoundIdRef.current = null;
      newGamePhaseRef.current = null;
      lastLocalPhaseKeyRef.current = null;

      const gameEndedData = eventData as { finalScores?: Array<{ playerId: string; playerName: string; avatar: string; score: number }> };
      
      if (gameEndedData.finalScores && gameEndedData.finalScores.length > 0) {
        const topPlayer = gameEndedData.finalScores[0];
        setVictoryWinner({
          playerId: topPlayer.playerId,
          playerName: topPlayer.playerName,
          avatar: topPlayer.avatar,
          score: topPlayer.score,
        });
        setShowVictory(true);
        
        setTimeout(() => {
          setShowVictory(false);
          setGamePhase('lobby');
          setCurrentQuestion(null);
          setPromptData(null);
          setSecretData(null);
          setNewGameData(null);
          setCurrentGameType(null);
          setShowCorrectAnswer(null);
          fetch(`/api/rooms?code=${roomCode}`)
            .then((res) => res.json())
            .then((d) => {
              if (d.success) setPlayers(d.data.players);
            });
        }, 5000);
      } else {
        setGamePhase('lobby');
        setCurrentQuestion(null);
        setPromptData(null);
        setSecretData(null);
        setNewGameData(null);
        setCurrentGameType(null);
        setShowCorrectAnswer(null);
        fetch(`/api/rooms?code=${roomCode}`)
          .then((res) => res.json())
          .then((d) => {
            if (d.success) setPlayers(d.data.players);
          });
      }
    }
    
    handleGameEvent(eventName, data);
  }, [roomCode, handleGameEvent, resetHasSubmitted, players, hostPlayer]);

  handleCustomGameEventRef.current = handleCustomGameEvent;

  const applyHostGameSync = useCallback(async () => {
    if (!roomCode) return;
    try {
      const qs = new URLSearchParams({ code: roomCode });
      if (lastHostKnownSyncVersionRef.current !== null) {
        qs.set('sinceVersion', String(lastHostKnownSyncVersionRef.current));
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
        lastHostKnownSyncVersionRef.current = null;
        lastHostSyncRevisionRef.current = null;
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
      if (rev !== undefined && rev === lastHostSyncRevisionRef.current) {
        return;
      }
      for (const ev of d.events) {
        handleCustomGameEventRef.current(ev.name, ev.data);
      }
      if (rev !== undefined) {
        lastHostSyncRevisionRef.current = rev;
      }
      if (typeof d.syncVersion === 'number') {
        lastHostKnownSyncVersionRef.current = d.syncVersion;
      }
    } catch (e) {
      console.error('host game sync:', e);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    void (async () => {
      await applyHostGameSync();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode, applyHostGameSync]);

  useEffect(() => {
    if (!roomCode) return;
    const id = setInterval(() => {
      void applyHostGameSync();
    }, 3000);
    return () => clearInterval(id);
  }, [roomCode, applyHostGameSync]);

  const handleHostPromptResponse = useCallback(
    async (response: string) => {
      if (!hostPlayer || currentGameType !== 'CONTINUE_PHRASE') return;
      const sentRoundId =
        hostPromptRoundIdRef.current ??
        ((roundData as PromptRoundData & { roundId?: string } | null)?.roundId ?? null);
      if (!sentRoundId) return;
      try {
        const res = await fetch('/api/game/prompt/response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            playerId: hostPlayer.id,
            roundId: sentRoundId,
            response,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (hostPromptRoundIdRef.current !== sentRoundId) return;
          markAsSubmitted(sentRoundId);
        }
      } catch (e) {
        console.error('Host prompt response:', e);
      }
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  const handleHostPromptVote = useCallback(
    async (responseId: string) => {
      if (!hostPlayer || currentGameType !== 'CONTINUE_PHRASE') return;
      const sentRoundId =
        hostPromptRoundIdRef.current ??
        ((roundData as PromptRoundData & { roundId?: string } | null)?.roundId ?? null);
      if (!sentRoundId) return;
      const res = await fetch('/api/game/prompt/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: hostPlayer.id,
          roundId: sentRoundId,
          responseId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Voto non registrato');
      }
      if (hostPromptRoundIdRef.current !== sentRoundId) return;
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
    },
    [hostPlayer, roundData, currentGameType, roomCode]
  );

  const handleHostSecretSubmit = useCallback(
    async (secret: string) => {
      if (!hostPlayer) return;
      const sentRoundIdAtStart = hostSecretRoundIdRef.current;
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
        if (data.success) {
          if (hostSecretRoundIdRef.current !== sentRoundIdAtStart) return;
          markAsSubmitted(sentRoundIdAtStart);
        }
      } catch (e) {
        console.error('Host secret submit:', e);
      }
    },
    [hostPlayer, roomCode, markAsSubmitted]
  );

  const handleHostSecretVote = useCallback(
    async (suspectedPlayerId: string) => {
      if (!hostPlayer || currentGameType !== 'WHO_WAS_IT') return;
      const sentRoundId =
        hostSecretRoundIdRef.current ??
        ((roundData as SecretRoundData & { roundId?: string } | null)?.roundId ?? null);
      if (!sentRoundId) return;
      const res = await fetch('/api/game/secret/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId: hostPlayer.id,
          roundId: sentRoundId,
          suspectedPlayerId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Voto non registrato');
      }
      if (hostSecretRoundIdRef.current !== sentRoundId) return;
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 1500);
    },
    [hostPlayer, roundData, currentGameType, roomCode]
  );

  const handleHostTriviaAnswer = useCallback(
    async (answer: 'A' | 'B' | 'C' | 'D', responseTimeMs: number) => {
      if (!hostPlayer || currentGameType !== 'TRIVIA') return;
      const sentRoundId =
        hostTriviaRoundIdRef.current ??
        ((roundData as TriviaRoundData & { roundId?: string } | null)?.roundId ?? null);
      if (!sentRoundId) return;
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
      hostTriviaResultRoundIdRef.current = sentRoundId;
      markAsSubmitted(sentRoundId);
    },
    [hostPlayer, roundData, currentGameType, roomCode, markAsSubmitted]
  );

  // Generic handler for new games
  const handleNewGameAction = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      if (!hostPlayer) return;
      // Snapshot SINCRONO via ref del solo roundId. NON usiamo guardia su
      // phase: spesso il click stesso e` quello che fa scattare la transizione
      // (es. ultimo voto / ultima accusa) e il phase-changed via Pusher arriva
      // PRIMA della response. Una guardia "phase==same" lasciava hasSubmitted
      // a false e l'utente cliccava di nuovo, finendo in loop sulle round
      // successive al primo.
      const sentRoundId = newGameRoundIdRef.current;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId: hostPlayer.id, roundId: sentRoundId, ...body }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Azione non riuscita');
      if (newGameRoundIdRef.current !== sentRoundId) return;
      markAsSubmitted(sentRoundId);
      setTimeout(() => { void fetch(`/api/game/tick?code=${roomCode}`).catch(() => {}); }, 800);
    },
    [hostPlayer, roomCode, markAsSubmitted]
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
    onPresenceReady: () => {
      void applyHostGameSync();
    },
  });

  // Start game
  const startGame = async (gameType: GameType) => {
    setIsLoadingGame(true);
    try {
      const endpoints: Record<GameType, string> = {
        'TRIVIA': '/api/game/trivia',
        'CONTINUE_PHRASE': '/api/game/prompt',
        'WHO_WAS_IT': '/api/game/secret',
        'SWIPE_TRASH': '/api/game/swipe',
        'TRIBUNAL': '/api/game/tribunal',
        'BOMB': '/api/game/bomb',
        'THERMOMETER': '/api/game/thermometer',
        'HERD_MIND': '/api/game/herd',
        'CHAMELEON': '/api/game/chameleon',
        'SPLIT_ROOM': '/api/game/split',
        'INTERVIEW': '/api/game/interview',
      };

      const response = await fetch(endpoints[gameType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, rounds: gameType === 'TRIVIA' ? 10 : gameType === 'INTERVIEW' ? 3 : 5 }),
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
          <Image src="/logolupo.png" alt="Lupo" width={120} height={120} className="mx-auto animate-bounce mb-6 drop-shadow-2xl" />
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

      {/* Game info modal */}
      {infoModal && (
        <GameInfoModal title={infoModal.title} emoji={infoModal.emoji} onClose={() => setInfoModal(null)} />
      )}
      
      {/* Header — responsive */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Image src="/logolupo.png" alt="Lupo" width={44} height={44} className="shrink-0 sm:w-12 sm:h-12 drop-shadow-lg" />
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
            
            {/* Join Instructions + Share */}
            <div className="glass-card p-4 sm:p-10 mb-4 sm:mb-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
              <div className="relative z-10">
                <h1 className="text-xl sm:text-4xl font-black text-white mb-2 sm:mb-4">
                  🎮 Unisciti alla Partita!
                </h1>
                <p className="text-purple-200 text-sm sm:text-xl mb-3 sm:mb-6">
                  Vai su <span className="font-bold text-gradient">lupogames.vercel.app</span>
                </p>
                <div className="inline-flex items-center gap-2 sm:gap-4 bg-black/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4">
                  <span className="text-white/80 text-sm sm:text-lg">Codice:</span>
                  <span className="text-2xl sm:text-5xl font-black text-gradient-gold tracking-wider">{roomCode}</span>
                </div>
                <div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/?join=${roomCode}`;
                      if (navigator.share) {
                        navigator.share({ title: 'Lupo Games', text: `Unisciti alla mia stanza su Lupo Games! Codice: ${roomCode}`, url }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(url).then(() => {
                          const btn = document.getElementById('share-btn-host');
                          if (btn) { btn.textContent = 'Link copiato!'; setTimeout(() => { btn.textContent = '🔗 Condividi link'; }, 2000); }
                        }).catch(() => {});
                      }
                    }}
                    id="share-btn-host"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all text-sm sm:text-base"
                  >
                    🔗 Condividi link
                  </button>
                </div>
              </div>
            </div>

            {hostPlayer && (
              <div className="max-w-lg mx-auto mb-4 sm:mb-8">
                <LobbyChat
                  roomCode={roomCode}
                  playerId={hostPlayer.id}
                  playerName={hostPlayer.name}
                />
              </div>
            )}

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

            {(
              <div className="glass-card p-4 sm:p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-lg sm:text-2xl font-black text-white mb-4 sm:mb-8 text-center flex items-center justify-center gap-2">
                  <span>🎯</span> Scegli il Gioco
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <GameCard
                    emoji="🧠"
                    title="La Corsa del Sapere"
                    subtitle="Quiz • 10 domande • 30 sec"
                    description={`Rispondi A/B/C/D dal telefono.${players.length < 2 ? ' (min. 2 giocatori)' : ''}`}
                    gradient="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600"
                    onClick={() => startGame('TRIVIA')}
                    disabled={isLoadingGame || players.length < 2}
                    onInfo={() => setInfoModal({ title: 'La Corsa del Sapere', emoji: '🧠' })}
                  />
                  <GameCard
                    emoji="💬"
                    title="Continua la Frase"
                    subtitle="5 round • 45 sec + 45 sec"
                    description={`Scrivi e vota la risposta migliore.${players.length < 2 ? ' (min. 2 giocatori)' : ''}`}
                    gradient="bg-gradient-to-br from-pink-600 via-rose-600 to-red-600"
                    onClick={() => startGame('CONTINUE_PHRASE')}
                    disabled={isLoadingGame || players.length < 2}
                    onInfo={() => setInfoModal({ title: 'Continua la Frase', emoji: '💬' })}
                  />
                  <GameCard
                    emoji="🕵️"
                    title="Chi è Stato?"
                    subtitle="5 round • 45 sec + 45 sec"
                    description={`Indovina chi ha scritto il segreto.${players.length < 3 ? ' (min. 3 giocatori)' : ''}`}
                    gradient="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600"
                    onClick={() => startGame('WHO_WAS_IT')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'Chi è Stato?', emoji: '🕵️' })}
                  />
                  <GameCard
                    emoji="🗑️"
                    title="Swipe Trash"
                    subtitle="5 round • 20 sec"
                    description={`Il termometro dell'indignazione. Vota SÌ o NO.${players.length < 2 ? ' (min. 2 giocatori)' : ''}`}
                    gradient="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600"
                    onClick={() => startGame('SWIPE_TRASH')}
                    disabled={isLoadingGame || players.length < 2}
                    onInfo={() => setInfoModal({ title: 'Swipe Trash', emoji: '🗑️' })}
                  />
                  <GameCard
                    emoji="⚖️"
                    title="Il Tribunale del Popolo"
                    subtitle="5 round • 30+20+20 sec"
                    description={`Rovina le amicizie puntando il dito.${players.length < 3 ? ' (min. 3)' : ''}`}
                    gradient="bg-gradient-to-br from-red-700 via-red-600 to-orange-600"
                    onClick={() => startGame('TRIBUNAL')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'Il Tribunale del Popolo', emoji: '⚖️' })}
                  />
                  <GameCard
                    emoji="💣"
                    title="La Bomba"
                    subtitle="5 round • 30 sec"
                    description={`Pensa in fretta o esplodi.${players.length < 3 ? ' (min. 3)' : ''}`}
                    gradient="bg-gradient-to-br from-gray-700 via-gray-600 to-red-700"
                    onClick={() => startGame('BOMB')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'La Bomba', emoji: '💣' })}
                  />
                  <GameCard
                    emoji="🌡️"
                    title="Il Termometro del Disagio"
                    subtitle="5 round • 25 sec"
                    description={`Indovina cosa pensa la stanza da 0 a 100.${players.length < 2 ? ' (min. 2 giocatori)' : ''}`}
                    gradient="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600"
                    onClick={() => startGame('THERMOMETER')}
                    disabled={isLoadingGame || players.length < 2}
                    onInfo={() => setInfoModal({ title: 'Il Termometro del Disagio', emoji: '🌡️' })}
                  />
                  <GameCard
                    emoji="🐑"
                    title="Mente di Gregge"
                    subtitle="5 round • 25 sec"
                    description={`L'originalità fa schifo. Pensa come la massa.${players.length < 3 ? ' (min. 3)' : ''}`}
                    gradient="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600"
                    onClick={() => startGame('HERD_MIND')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'Mente di Gregge', emoji: '🐑' })}
                  />
                  <GameCard
                    emoji="🦎"
                    title="Il Camaleonte"
                    subtitle="5 round • 30+8+25 sec"
                    description={`Mimetizzati tra gli innocenti o scovali tutti.${players.length < 4 ? ' (min. 4)' : ''}`}
                    gradient="bg-gradient-to-br from-lime-600 via-green-600 to-emerald-700"
                    onClick={() => startGame('CHAMELEON')}
                    disabled={isLoadingGame || players.length < 4}
                    onInfo={() => setInfoModal({ title: 'Il Camaleonte', emoji: '🦎' })}
                  />
                  <GameCard
                    emoji="⚡"
                    title="Lo Spacca-Stanza"
                    subtitle="5 round • 30+25 sec"
                    description={`Crea dilemmi impossibili per dividere il gruppo.${players.length < 3 ? ' (min. 3)' : ''}`}
                    gradient="bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600"
                    onClick={() => startGame('SPLIT_ROOM')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'Lo Spacca-Stanza', emoji: '⚡' })}
                  />
                  <GameCard
                    emoji="📝"
                    title="Colloquio Disperato"
                    subtitle="3 round • 40+30+25 sec"
                    description={`Costruisci frasi rubando le parole degli altri.${players.length < 3 ? ' (min. 3)' : ''}`}
                    gradient="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600"
                    onClick={() => startGame('INTERVIEW')}
                    disabled={isLoadingGame || players.length < 3}
                    onInfo={() => setInfoModal({ title: 'Colloquio Disperato', emoji: '📝' })}
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
              <div className="text-center py-4">
                <p className="text-amber-300 text-xs sm:text-sm font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 inline-block">
                  ⏳ Aspettando almeno <span className="font-bold">2 giocatori</span> per iniziare...
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
                  scoreSnapshot={scoreSnapshotRef.current}
                />
              </div>
            )}

            <div className="glass-card p-3 sm:p-6 mt-2">
              <h3 className="text-sm sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>🏆</span> Classifica
              </h3>
              <Leaderboard players={players} compact scoreSnapshot={scoreSnapshotRef.current} />
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
                  skipVoting={promptData.skipVoting}
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
            
            {promptData.phase === 'RESULTS' && promptData.responses && promptData.responses.length > 0 && (
              <div className="space-y-3">
                {[...promptData.responses]
                  .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                  .map((r, i) => (
                  <div key={r.id} className={`glass-card p-4 sm:p-6 ${i === 0 ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-2xl text-white font-bold mb-1">&ldquo;{r.response}&rdquo;</p>
                        <p className="text-purple-300 text-sm">— {r.playerName}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-2xl sm:text-3xl font-black text-gradient-gold">{r.voteCount || 0}</p>
                        <p className="text-[10px] text-white/60">voti</p>
                      </div>
                    </div>
                    {i === 0 && (
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
                  isSecretOwner={!!secretOwnerId && secretOwnerId === hostPlayer.id}
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
            
            {secretData.phase === 'GUESSING' && secretData.secretContent && !hostPlayer && (
              <div className="glass-card p-6 sm:p-10 mb-6 text-center">
                <p className="text-white/60 text-sm sm:text-lg mb-2 uppercase tracking-wider">Il segreto è:</p>
                <h2 className="text-xl sm:text-4xl font-black text-gradient leading-relaxed">
                  &ldquo;{secretData.secretContent}&rdquo;
                </h2>
                <p className="text-purple-300 text-sm mt-4">🔍 Chi l&apos;ha scritto?</p>
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

        {/* NEW GAMES — Host participates using controllers */}
        {gamePhase === 'playing' && newGameData && hostPlayer && (() => {
          const gt = currentGameType;
          const phase = newGameData.phase as string;
          const results = newGameData.results as any;
          const isResults = phase === 'RESULTS' || phase === 'EXPLODED';

          if (gt === 'SWIPE_TRASH') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">🗑️ Swipe Trash</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <SwipeTrashController concept={(newGameData.concept as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onVote={async (v) => { await handleNewGameAction('/api/game/swipe/vote', { vote: v }); }}
                hasVoted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'TRIBUNAL') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">⚖️ Tribunale</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <TribunaleController
                phase={(phase as any) || 'ACCUSING'}
                accusation={(newGameData.accusation as string) || ''} players={players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))}
                currentPlayerId={hostPlayer.id} defendantId={newGameData.defendantId as string}
                defendantName={newGameData.defendantName as string} defense={newGameData.defense as string}
                roundId={newGameRoundIdRef.current || ''}
                onAccuse={async (id) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'accuse', accusedPlayerId: id }); }}
                onDefense={async (d) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'defense', defense: d }); }}
                onVerdict={async (v) => { await handleNewGameAction('/api/game/tribunal/action', { action: 'verdict', verdict: v }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'BOMB') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">💣 La Bomba</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <BombController category={(newGameData.category as string) || ''} bombHolderId={(newGameData.bombHolderId as string) || ''}
                currentPlayerId={hostPlayer.id} roundId={newGameRoundIdRef.current || ''}
                onPass={async (w) => { await handleNewGameAction('/api/game/bomb/pass', { word: w }); }}
                timeRemaining={timeRemaining} words={(newGameData.words as string[]) || []}
                results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'THERMOMETER') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">🌡️ Termometro</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <ThermometerController concept={(newGameData.concept as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onVote={async (v) => { await handleNewGameAction('/api/game/thermometer/vote', { value: v }); }}
                hasVoted={hasSubmitted} timeRemaining={timeRemaining} currentPlayerId={hostPlayer.id}
                results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'HERD_MIND') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">🐑 Mente di Gregge</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <HerdMindController question={(newGameData.question as string) || ''} roundId={newGameRoundIdRef.current || ''}
                onAnswer={async (a) => { await handleNewGameAction('/api/game/herd/answer', { answer: a }); }}
                hasAnswered={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'CHAMELEON') {
            const _curId = String(hostPlayer.id || '').trim();
            const _chId = String(newGameData.chameleonId ?? '').trim();
            const _meIsChameleon = _curId.length > 0 && _chId.length > 0 && _curId === _chId;
            return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">🦎 Camaleonte</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <ChameleonController phase={(phase as any) || 'HINTING'}
                secretWord={_meIsChameleon ? null : (newGameData.secretWord as string)}
                chameleonId={_chId} currentPlayerId={_curId}
                hintsSubmitted={typeof newGameData.chameleonHintCount === 'number' ? newGameData.chameleonHintCount : undefined}
                hintsTotal={typeof newGameData.chameleonPlayerCount === 'number' ? newGameData.chameleonPlayerCount : undefined}
                players={players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))}
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
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">⚡ Spacca-Stanza</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <SplitRoomController phase={(phase as any) || 'WRITING'}
                dilemmaStart={(newGameData.dilemmaStart as string)} dilemma={(newGameData.dilemma as string)}
                authorId={(newGameData.authorId as string)} currentPlayerId={hostPlayer.id}
                roundId={newGameRoundIdRef.current || ''}
                onWrite={async (c) => { await handleNewGameAction('/api/game/split/action', { action: 'write', completion: c }); }}
                onVote={async (v) => { await handleNewGameAction('/api/game/split/action', { action: 'vote', vote: v }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          if (gt === 'INTERVIEW') return (
            <div className="glass-card p-4 sm:p-8 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-black text-white">📝 Colloquio</h2>
                <span className="text-purple-300 text-sm font-bold">Round {currentRoundNum}/{totalRoundsNum}</span>
              </div>
              <InterviewController phase={(phase as any) || 'COLLECTING'}
                questions={(newGameData.questions as string[])} prompt={(newGameData.prompt as string)}
                words={(newGameData.playerWords as Record<string, string[]>)?.[hostPlayer.id] || (newGameData.words as string[]) || []}
                sentences={(newGameData.sentences as any)} currentPlayerId={hostPlayer.id}
                roundId={newGameRoundIdRef.current || ''}
                onCollect={async (a) => { await handleNewGameAction('/api/game/interview/action', { action: 'collect', answers: a }); }}
                onBuild={async (s) => { await handleNewGameAction('/api/game/interview/action', { action: 'build', sentence: s }); }}
                onVote={async (id) => { await handleNewGameAction('/api/game/interview/action', { action: 'vote', votedPlayerId: id }); }}
                hasSubmitted={hasSubmitted} timeRemaining={timeRemaining} results={isResults ? results : undefined} />
            </div>
          );

          return null;
        })()}

        {/* Victory Animation */}
        {showVictory && victoryWinner && (
          <div className="fixed inset-0 z-[9999]">
            <TriviaVictoryAnimation
              winner={{
                playerId: victoryWinner.playerId,
                playerName: victoryWinner.playerName,
                avatar: victoryWinner.avatar || 'Lupo',
                score: victoryWinner.score,
                trackPosition: 15,
              }}
              allPlayers={players.map(p => ({
                playerId: p.id,
                playerName: p.name,
                avatar: p.avatar || 'Lupo',
                score: p.score,
                trackPosition: p.trackPosition,
              }))}
              onComplete={() => {}}
            />
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
