import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom,
} from '@/lib/new-game-utils';

const VOTE_SEC = 25;
const RESULTS_DWELL_MS = 4000;

export async function startThermometerGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 2) throw new Error('min 2');

  const contents = await getContentForGame('THERMOMETER', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'THERMOMETER');
  const first = contents[0];
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'THERMOMETER', roundNumber: 1, phase: 'VOTING', state: { concept: first.content, contentId: first.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'THERMOMETER', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'THERMOMETER', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'THERMOMETER', phase: 'VOTING',
    data: { concept: first.content, roundId: gr.id, timeLimit: VOTE_SEC },
  });
  return { roundId: gr.id, concept: first.content };
}

export async function handleThermometerVote(roomCode: string, playerId: string, roundId: string, value: number) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'VOTE', { value: Math.min(100, Math.max(0, Math.round(value))) });
  if (count >= room.players.length) await showThermometerResults(roomCode, roundId, room.id);
}

export async function showThermometerResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'VOTING' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const actions = await getAllActions(roundId, 'VOTE');
  const values = actions.map(a => ({ playerId: a.playerId, playerName: a.player.name, value: (a.data as { value: number }).value }));
  const avg = values.length > 0 ? values.reduce((s, v) => s + v.value, 0) / values.length : 50;

  // Points proportional to closeness to average (max 200 for exact match)
  for (const v of values) {
    const distance = Math.abs(v.value - avg);
    const points = Math.max(0, Math.round(200 - distance * 4));
    if (points > 0) await prisma.player.update({ where: { id: v.playerId }, data: { score: { increment: points } } });
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'THERMOMETER', results: { average: Math.round(avg * 10) / 10, votes: values },
  });
}

export async function advanceThermometer(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true } });
  if (!room?.gameState || room.currentGame !== 'THERMOMETER') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string; currentRoundId?: string };
  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  if (st.currentRoundId) {
    const curRound = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (curRound && curRound.phase !== 'RESULTS') return false;
  }

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'THERMOMETER'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'THERMOMETER'); return true; }

  const roundNumber = room.currentRound + 1;
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'THERMOMETER', roundNumber, phase: 'VOTING', state: { concept: content.content, contentId: content.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'THERMOMETER', phase: 'VOTING',
    data: { concept: content.content, roundId: gr.id, timeLimit: VOTE_SEC },
  });
  return true;
}

export async function forceThermometerTimeout(roomCode: string, roundId: string, roomId: string) {
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  if (gs?.timerEndsAt && gs.timerEndsAt.getTime() > Date.now()) return;
  await showThermometerResults(roomCode, roundId, roomId);
}
