import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRoomCode,
  validatePlayerName,
  validateRoomCode,
  calculateTriviaPoints,
  calculateSecretPoints,
  pickRandom,
  formatTimeRemaining,
} from '@/lib/utils';

describe('createRoomCode', () => {
  it('genera 4 caratteri maiuscoli dall’alfabeto stanza', () => {
    const code = createRoomCode();
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });
});

describe('validatePlayerName', () => {
  it('rifiuta nome troppo corto', () => {
    expect(validatePlayerName('a').valid).toBe(false);
  });
  it('accetta nome valido', () => {
    expect(validatePlayerName('Mario').valid).toBe(true);
  });
  it('rifiuta caratteri non ammessi', () => {
    expect(validatePlayerName('foo@bar').valid).toBe(false);
  });
});

describe('validateRoomCode', () => {
  it('richiede 4 lettere', () => {
    expect(validateRoomCode('ABC').valid).toBe(false);
  });
  it('accetta 4 lettere maiuscole', () => {
    expect(validateRoomCode('abcd').valid).toBe(true);
  });
});

describe('calculateTriviaPoints', () => {
  it('0 se risposta errata', () => {
    expect(calculateTriviaPoints(false, 1000, 15000)).toBe(0);
  });
  it('premia risposta corretta e velocità', () => {
    const pts = calculateTriviaPoints(true, 0, 15000);
    expect(pts).toBeGreaterThanOrEqual(100);
  });
});

describe('calculateSecretPoints', () => {
  it('0 se non corretto', () => {
    expect(calculateSecretPoints(false, 5, 1)).toBe(0);
  });
 it('>0 se corretto', () => {
    expect(calculateSecretPoints(true, 4, 1)).toBeGreaterThan(0);
  });
});

describe('pickRandom', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('restituisce al massimo count elementi', () => {
    const out = pickRandom([1, 2, 3, 4], 2);
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('formatTimeRemaining', () => {
  it('formatta 0', () => {
    expect(formatTimeRemaining(0)).toBe('0:00');
  });
  it('formatta minuti e secondi', () => {
    expect(formatTimeRemaining(65)).toBe('1:05');
  });
});
