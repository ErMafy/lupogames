import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom,
} from '@/lib/new-game-utils';

const ANSWER_SEC = 25;
const RESULTS_DWELL_MS = 8000;

export async function startHerdMindGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 3) throw new Error('min 3');

  const contents = await getContentForGame('HERD_MIND', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'HERD_MIND');
  const first = contents[0];
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'HERD_MIND', roundNumber: 1, phase: 'ANSWERING', state: { question: first.content, contentId: first.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'HERD_MIND', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + ANSWER_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + ANSWER_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'HERD_MIND', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'HERD_MIND', phase: 'ANSWERING',
    data: { question: first.content, roundId: gr.id, timeLimit: ANSWER_SEC },
  });
  return { roundId: gr.id };
}

export async function handleHerdAnswer(roomCode: string, playerId: string, roundId: string, answer: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'ANSWERING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const normalized = answer.trim().toLowerCase().replace(/[^a-zà-ú0-9\s]/g, '');
  const count = await upsertActionAndCount(roundId, playerId, 'ANSWER', { answer: normalized, original: answer.trim() });
  if (count >= room.players.length) await showHerdResults(roomCode, roundId, room.id);
}

export async function showHerdResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'ANSWERING' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const actions = await getAllActions(roundId, 'ANSWER');
  const clusters: Record<string, Array<{ playerId: string; playerName: string; original: string }>> = {};
  for (const a of actions) {
    const d = a.data as { answer: string; original: string };
    if (!clusters[d.answer]) clusters[d.answer] = [];
    clusters[d.answer].push({ playerId: a.playerId, playerName: a.player.name, original: d.original });
  }

  let maxSize = 0;
  let winningAnswer = '';
  for (const [answer, members] of Object.entries(clusters)) {
    if (members.length > maxSize) { maxSize = members.length; winningAnswer = answer; }
  }

  const winnerIds = new Set((clusters[winningAnswer] || []).map(m => m.playerId));
  const points = 150;
  for (const id of winnerIds) {
    await prisma.player.update({ where: { id }, data: { score: { increment: points } } });
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'HERD_MIND',
    results: {
      clusters: Object.entries(clusters).map(([answer, members]) => ({ answer, members, isWinner: answer === winningAnswer })),
      winningAnswer: clusters[winningAnswer]?.[0]?.original || winningAnswer,
    },
  });
}

export async function advanceHerdMind(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true } });
  if (!room?.gameState || room.currentGame !== 'HERD_MIND') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string; currentRoundId?: string };
  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  if (st.currentRoundId) {
    const curRound = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (curRound && curRound.phase !== 'RESULTS') return false;
  }

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'HERD_MIND'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'HERD_MIND'); return true; }

  const roundNumber = room.currentRound + 1;
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'HERD_MIND', roundNumber, phase: 'ANSWERING', state: { question: content.content, contentId: content.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + ANSWER_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'HERD_MIND', phase: 'ANSWERING',
    data: { question: content.content, roundId: gr.id, timeLimit: ANSWER_SEC },
  });
  return true;
}

export async function forceHerdTimeout(roomCode: string, roundId: string, roomId: string) {
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  if (gs?.timerEndsAt && gs.timerEndsAt.getTime() > Date.now()) return;
  await showHerdResults(roomCode, roundId, roomId);
}
