import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom,
} from '@/lib/new-game-utils';

const VOTE_SEC = 20;
const RESULTS_DWELL_MS = 4000;

export async function startSwipeTrashGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { players: true, gameState: true },
  });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 2) throw new Error('min 2');

  const contents = await getContentForGame('SWIPE_TRASH', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'SWIPE_TRASH');

  const first = contents[0];
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'SWIPE_TRASH', roundNumber: 1, phase: 'VOTING', state: { concept: first.content, contentId: first.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'SWIPE_TRASH', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'SWIPE_TRASH', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'SWIPE_TRASH', phase: 'VOTING',
    data: { concept: first.content, roundId: gr.id, timeLimit: VOTE_SEC },
  });

  return { roundId: gr.id, concept: first.content };
}

export async function handleSwipeVote(roomCode: string, playerId: string, roundId: string, vote: 'YES' | 'NO') {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') throw new Error('wrong phase');

  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'VOTE', { vote });
  if (count >= room.players.length) {
    await showSwipeResults(roomCode, roundId, room.id);
  }
}

export async function showSwipeResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({
    where: { id: roundId, phase: 'VOTING' }, data: { phase: 'RESULTS', endedAt: new Date() },
  });
  if (transitioned.count === 0) return;

  const actions = await getAllActions(roundId, 'VOTE');
  const yesCount = actions.filter(a => (a.data as { vote: string }).vote === 'YES').length;
  const noCount = actions.filter(a => (a.data as { vote: string }).vote === 'NO').length;
  const majority = yesCount >= noCount ? 'YES' : 'NO';
  const points = 100;

  for (const a of actions) {
    const v = (a.data as { vote: string }).vote;
    if (v === majority) {
      await prisma.player.update({ where: { id: a.playerId }, data: { score: { increment: points } } });
    }
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({
    where: { roomId },
    data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } },
  });

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'SWIPE_TRASH', results: { yesCount, noCount, majority },
    voters: actions.map(a => ({ playerId: a.playerId, playerName: a.player.name, vote: (a.data as { vote: string }).vote, won: (a.data as { vote: string }).vote === majority })),
  });
}

export async function advanceSwipeTrash(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true } });
  if (!room?.gameState || room.currentGame !== 'SWIPE_TRASH') return false;

  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string };
  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'SWIPE_TRASH'); return true; }

  const contentId = contentIds[nextIdx];
  const content = await prisma.gameContent.findUnique({ where: { id: contentId } });
  if (!content) { await endGenericGame(roomCode, room.id, 'SWIPE_TRASH'); return true; }

  const roundNumber = room.currentRound + 1;
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'SWIPE_TRASH', roundNumber, phase: 'VOTING', state: { concept: content.content, contentId } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({
      where: { roomId: room.id },
      data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } },
    }),
  ]);
  await incrementContentUsage(contentId);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'SWIPE_TRASH', phase: 'VOTING',
    data: { concept: content.content, roundId: gr.id, timeLimit: VOTE_SEC },
  });
  return true;
}

export async function forceSwipeTimeout(roomCode: string, roundId: string, roomId: string) {
  await showSwipeResults(roomCode, roundId, roomId);
}
