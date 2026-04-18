import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  cleanupOldRounds, sendToRoom, pickRandom,
} from '@/lib/new-game-utils';

const INITIAL_TIMER_SEC = 30;
const RESULTS_DWELL_MS = 8000;

export async function startBombGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 3) throw new Error('min 3');

  const contents = await getContentForGame('BOMB', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'BOMB');
  const first = contents[0];
  const bombHolder = (pickRandom(room.players, 1) as { id: string }[])[0];
  const timerEnd = new Date(Date.now() + INITIAL_TIMER_SEC * 1000);

  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'BOMB', roundNumber: 1, phase: 'PLAYING',
      state: { category: first.content, contentId: first.id, bombHolderId: bombHolder.id, words: [] } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'BOMB', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: timerEnd },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: timerEnd },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'BOMB', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'BOMB', phase: 'PLAYING',
    data: { category: first.content, roundId: gr.id, bombHolderId: bombHolder.id, timeLimit: INITIAL_TIMER_SEC },
  });
  return { roundId: gr.id };
}

export async function handleBombPass(roomCode: string, playerId: string, roundId: string, word: string) {
  // Atomic read-check-update inside a transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    const gr = await tx.gameRound.findUnique({ where: { id: roundId } });
    if (!gr || gr.phase !== 'PLAYING') throw new Error('wrong phase');
    const state = gr.state as { bombHolderId: string; words: string[]; category: string };
    if (state.bombHolderId !== playerId) throw new Error('you dont have the bomb');

    const room = await tx.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
    if (!room) throw new Error('room not found');

    const otherPlayers = room.players.filter(p => p.id !== playerId);
    if (otherPlayers.length === 0) throw new Error('no other players');
    const nextHolder = (pickRandom(otherPlayers, 1) as { id: string }[])[0];
    const newWords = [...state.words, word.trim()];

    const gs = room.gameState;
    // Estensione SEMPRE additiva ma mai a partire da un timer già scaduto.
    // Se il timer corrente è nel passato (timer scaduto ma round ancora PLAYING per un breve istante),
    // partiamo da Date.now() così l'estensione di +5s è realmente percepita dal giocatore.
    const currentEnd = Math.max(Date.now(), gs?.timerEndsAt?.getTime() || Date.now());
    const extension = 5 * 1000;
    const newEnd = new Date(currentEnd + extension);

    await tx.gameRound.update({
      where: { id: roundId },
      data: { state: { ...state, bombHolderId: nextHolder.id, words: newWords } },
    });
    await tx.gameState.update({ where: { roomId: room.id }, data: { timerEndsAt: newEnd } });

    return { nextHolderId: nextHolder.id, newEnd, roomCode };
  });

  await sendToRoom(roomCode, 'bomb-passed', {
    gameType: 'BOMB', previousHolder: playerId, newBombHolderId: result.nextHolderId,
    word, remainingMs: result.newEnd.getTime() - Date.now(),
  });
}

export async function explodeBomb(roomCode: string, roundId: string, roomId: string) {
  // Atomically check that timer has truly expired AND no pass concurrently extended it,
  // then transition phase. Use a transaction so the timer check and phase update can't race
  // with handleBombPass.
  const transitioned = await prisma.$transaction(async (tx) => {
    const freshGs = await tx.gameState.findUnique({ where: { roomId } });
    if (freshGs?.timerEndsAt && freshGs.timerEndsAt.getTime() > Date.now()) return 0;
    const result = await tx.gameRound.updateMany({
      where: { id: roundId, phase: 'PLAYING' },
      data: { phase: 'EXPLODED', endedAt: new Date() },
    });
    return result.count;
  });
  if (transitioned === 0) return;

  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const state = gr?.state as { bombHolderId: string; words: string[]; category: string };
  const loser = await prisma.player.findUnique({ where: { id: state.bombHolderId } });

  // Everyone except bomb holder gets points
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  if (room) {
    for (const p of room.players) {
      if (p.id !== state.bombHolderId) {
        await prisma.player.update({ where: { id: p.id }, data: { score: { increment: 100 } } });
      }
    }
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'BOMB', results: { loserId: state.bombHolderId, loserName: loser?.name, words: state.words, category: state.category },
  });
}

export async function advanceBomb(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true, players: true } });
  if (!room?.gameState || room.currentGame !== 'BOMB') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string; currentRoundId?: string };

  // If bomb is still active, explode it
  if (st.currentRoundId) {
    const gr = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (gr?.phase === 'PLAYING') { await explodeBomb(roomCode, st.currentRoundId, room.id); return true; }
    // Only advance past a round that has fully exploded
    if (gr && gr.phase !== 'EXPLODED') return false;
  }

  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'BOMB'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'BOMB'); return true; }

  const roundNumber = room.currentRound + 1;
  const bombHolder = (pickRandom(room.players, 1) as { id: string }[])[0];
  const timerEnd = new Date(Date.now() + INITIAL_TIMER_SEC * 1000);

  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'BOMB', roundNumber, phase: 'PLAYING',
      state: { category: content.content, contentId: content.id, bombHolderId: bombHolder.id, words: [] } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: timerEnd, state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'BOMB', phase: 'PLAYING',
    data: { category: content.content, roundId: gr.id, bombHolderId: bombHolder.id, timeLimit: INITIAL_TIMER_SEC },
  });
  return true;
}
