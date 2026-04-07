// 🐺 LUPO GAMES - Utility Functions
// Funzioni utili che userai ovunque

import { customAlphabet } from 'nanoid';

// Genera codici stanza di 4 lettere (solo maiuscole, niente numeri ambigui)
// Evitiamo I, O, L, 0, 1 per non confondere nessuno dopo 3 birre
const roomCodeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(roomCodeAlphabet, 4);

export function createRoomCode(): string {
  return generateRoomCode();
}

// Formatta il tempo rimanente in modo carino
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calcola i punti per il trivia (più sei veloce, più prendi)
export function calculateTriviaPoints(
  isCorrect: boolean,
  responseTimeMs: number,
  maxTimeMs: number = 15000
): number {
  if (!isCorrect) return 0;
  
  // Base: 100 punti per risposta corretta
  // Bonus: fino a 100 punti extra per velocità
  const basePoints = 100;
  const speedBonus = Math.max(0, Math.floor((1 - responseTimeMs / maxTimeMs) * 100));
  
  return basePoints + speedBonus;
}

// Calcola i punti per chi indovina il segreto
export function calculateSecretPoints(
  isCorrect: boolean,
  totalVoters: number,
  correctGuessers: number
): number {
  if (!isCorrect) return 0;
  
  // Più persone sbagliano, più punti prendi tu
  // Se solo tu indovini tra 15 persone = jackpot!
  const basePoints = 50;
  const rarityBonus = Math.floor(((totalVoters - correctGuessers) / totalVoters) * 100);
  
  return basePoints + rarityBonus;
}

// Punti per chi ha scritto il segreto che nessuno indovina
export function calculateSecretAuthorPoints(
  totalVoters: number,
  wrongGuessers: number
): number {
  // Per ogni persona che sbaglia, l'autore prende punti
  return wrongGuessers * 10;
}

// Mescola un array (Fisher-Yates shuffle)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pesca N elementi random da un array
export function pickRandom<T>(array: T[], count: number = 1): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

// Valida il nome del giocatore
export function validatePlayerName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Il nome deve avere almeno 2 caratteri, dai!' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Max 20 caratteri, non stiamo scrivendo un romanzo' };
  }
  
  // Solo lettere, numeri, spazi e alcuni caratteri speciali
  const validPattern = /^[a-zA-Z0-9àèéìòùÀÈÉÌÒÙ\s\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Usa solo lettere e numeri, niente geroglifici' };
  }
  
  return { valid: true };
}

// Valida il codice stanza
export function validateRoomCode(code: string): { valid: boolean; error?: string } {
  const trimmed = code.trim().toUpperCase();
  
  if (trimmed.length !== 4) {
    return { valid: false, error: 'Il codice deve essere di 4 lettere' };
  }
  
  if (!/^[A-Z]+$/.test(trimmed)) {
    return { valid: false, error: 'Solo lettere maiuscole, niente numeri' };
  }
  
  return { valid: true };
}

// Delay helper per animazioni e timing
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Determina se siamo su mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Colori disponibili per gli avatar
export const AVATAR_COLORS = [
  '#FF6B6B', // Rosso corallo
  '#4ECDC4', // Turchese
  '#45B7D1', // Azzurro
  '#96CEB4', // Verde menta
  '#FFEAA7', // Giallo pastello
  '#DDA0DD', // Prugna
  '#98D8C8', // Verde acqua
  '#F7DC6F', // Giallo oro
  '#BB8FCE', // Viola chiaro
  '#85C1E9', // Blu cielo
  '#F8B500', // Arancione
  '#FF69B4', // Rosa shocking
  '#00CED1', // Ciano scuro
  '#32CD32', // Verde lime
  '#FF7F50', // Corallo
];

// Lista avatar di default
export const DEFAULT_AVATARS = [
  { name: 'Lupo', emoji: '🐺' },
  { name: 'Pecora', emoji: '🐑' },
  { name: 'Maiale', emoji: '🐷' },
  { name: 'Volpe', emoji: '🦊' },
  { name: 'Orso', emoji: '🐻' },
  { name: 'Leone', emoji: '🦁' },
  { name: 'Tigre', emoji: '🐯' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Coniglio', emoji: '🐰' },
  { name: 'Gatto', emoji: '🐱' },
  { name: 'Cane', emoji: '🐶' },
  { name: 'Unicorno', emoji: '🦄' },
  { name: 'Drago', emoji: '🐲' },
  { name: 'Gufo', emoji: '🦉' },
  { name: 'Pinguino', emoji: '🐧' },
];
