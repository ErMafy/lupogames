// 🐺 LUPO GAMES - Tipi TypeScript
// Perché any è per i deboli e i codardi

import type { Room, Player, RoomStatus } from '@prisma/client';

// Re-export Prisma types for convenience
export type { Room, Player, RoomStatus } from '@prisma/client';

// GameType locale (evita dipendenza da Prisma nel client)
export type GameType = 'TRIVIA' | 'CONTINUE_PHRASE' | 'WHO_WAS_IT'
  | 'SWIPE_TRASH' | 'TRIBUNAL' | 'BOMB' | 'THERMOMETER'
  | 'HERD_MIND' | 'CHAMELEON' | 'SPLIT_ROOM' | 'INTERVIEW';

// ============================================
// 🎮 EVENTI PUSHER
// ============================================

export interface PusherMember {
  id: string;
  info: {
    name: string;
    avatar: string | null;
    avatarColor: string | null;
    isHost: boolean;
  };
}

export interface PresenceChannelData {
  me: PusherMember;
  members: Record<string, PusherMember['info']>;
  count: number;
}

// Eventi che volano per la stanza
export type PusherEventType =
  | 'avatar-selected'      // Qualcuno ha scelto un avatar
  | 'avatar-deselected'    // Qualcuno ha cambiato idea
  | 'game-started'         // Si parte!
  | 'game-ended'           // Fine, andate a dormire
  | 'round-started'        // Nuovo round
  | 'round-ended'          // Round finito
  | 'answer-received'      // Risposta ricevuta (per il trivia)
  | 'player-advanced'      // Pedina avanza sulla pista
  | 'vote-received'        // Voto ricevuto
  | 'timer-tick'           // Tic tac tic tac
  | 'show-results'         // Mostra risultati
  | 'player-kicked'        // Arrivederci!
  | 'host-changed';        // Nuovo padrone di casa

export interface AvatarSelectedEvent {
  playerId: string;
  playerName: string;
  avatar: string;
  avatarColor: string;
}

export interface GameStartedEvent {
  gameType: GameType;
  totalRounds: number;
}

export interface RoundStartedEvent {
  roundNumber: number;
  gameType: GameType;
  data: TriviaRoundData | PromptRoundData | SecretRoundData;
}

export interface PlayerAdvancedEvent {
  playerId: string;
  newPosition: number;
  isCorrect: boolean;
  isFastest: boolean;
  pointsEarned: number;
}

// ============================================
// 🧠 TRIVIA - La Corsa del Sapere
// ============================================

export interface TriviaRoundData {
  questionId: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  timeLimit: number; // secondi
}

export interface TriviaAnswerPayload {
  answer: 'A' | 'B' | 'C' | 'D';
  responseTimeMs: number;
}

export interface TriviaResultData {
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  playerResults: Array<{
    playerId: string;
    playerName: string;
    answer: string;
    isCorrect: boolean;
    isFastest: boolean;
    pointsEarned: number;
    newTrackPosition: number;
  }>;
}

// ============================================
// 💬 CONTINUA LA FRASE
// ============================================

export interface PromptRoundData {
  phraseId: string;
  phrase: string;
  timeLimit: number;
  phase: 'WRITING' | 'VOTING' | 'RESULTS';
}

export interface PromptResponsePayload {
  response: string;
}

export interface PromptVotePayload {
  responseId: string;
}

export interface PromptResultData {
  responses: Array<{
    id: string;
    playerId: string;
    playerName: string;
    response: string;
    voteCount: number;
    pointsEarned: number;
  }>;
  winnerId: string;
}

// ============================================
// 🕵️ CHI È STATO?
// ============================================

export interface SecretRoundData {
  secretContent: string;
  phase: 'COLLECTING' | 'GUESSING' | 'REVEAL';
  players: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
}

export interface SecretVotePayload {
  suspectedPlayerId: string;
}

export interface SecretResultData {
  actualPlayerId: string;
  actualPlayerName: string;
  voterResults: Array<{
    playerId: string;
    playerName: string;
    votedFor: string;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
}

// ============================================
// 🎨 AVATAR
// ============================================

export interface AvailableAvatar {
  id: string;
  name: string;
  emoji: string;
  defaultColor: string;
  isSelected: boolean;
  selectedBy?: string;
}

// ============================================
// 📡 API RESPONSES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateRoomResponse {
  room: Room;
  hostPlayer: Player;
}

export interface JoinRoomResponse {
  room: Room;
  player: Player;
  existingPlayers: Array<{
    id: string;
    name: string;
    avatar: string | null;
  }>;
}

// ============================================
// 🎯 SCREEN ORIENTATION
// ============================================

export type OrientationType = 'portrait' | 'landscape';

export interface OrientationRequirement {
  required: OrientationType;
  message: string;
}

// ============================================
// 🏆 LEADERBOARD
// ============================================

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  avatarColor: string;
  score: number;
  trackPosition: number;
  rank: number;
}

// ============================================
// 🎮 CONTROLLER STATE
// ============================================

export type ControllerView =
  | 'waiting'           // In attesa che inizi il gioco
  | 'avatar-selection'  // Scegli il tuo avatar
  | 'trivia-answer'     // Rispondi alla domanda
  | 'prompt-write'      // Scrivi la risposta
  | 'prompt-vote'       // Vota la migliore
  | 'secret-write'      // Scrivi il tuo segreto
  | 'secret-vote'       // Chi sarà stato?
  | 'new-game-play'     // Controller generico per i nuovi giochi
  | 'results'           // Guarda i risultati
  | 'final-scores';     // Classifica finale

export interface ControllerState {
  view: ControllerView;
  canInteract: boolean;
  timeRemaining?: number;
  data?: unknown;
}
