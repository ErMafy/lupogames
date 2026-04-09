import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom, pickRandom,
} from '@/lib/new-game-utils';

const WRITE_SEC = 30;
const VOTE_SEC = 25;
const RESULTS_DWELL_MS = 4000;

export async function startSplitRoomGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 3) throw new Error('min 3');

  const contents = await getContentForGame('SPLIT_ROOM', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'SPLIT_ROOM');
  const first = contents[0];
  const author = (pickRandom(room.players, 1) as { id: string }[])[0];

  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'SPLIT_ROOM', roundNumber: 1, phase: 'WRITING',
      state: { dilemmaStart: first.content, contentId: first.id, authorId: author.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'SPLIT_ROOM', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + WRITE_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + WRITE_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'SPLIT_ROOM', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'SPLIT_ROOM', phase: 'WRITING',
    data: { dilemmaStart: first.content, roundId: gr.id, authorId: author.id, timeLimit: WRITE_SEC },
  });
  return { roundId: gr.id };
}

export async function handleSplitWrite(roomCode: string, playerId: string, roundId: string, completion: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'WRITING') throw new Error('wrong phase');
  const state = gr.state as { authorId: string; dilemmaStart: string };
  if (state.authorId !== playerId) throw new Error('not author');

  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
  if (!room) throw new Error('room not found');

  await prisma.gameAction.upsert({
    where: { roundId_playerId_actionType: { roundId, playerId, actionType: 'WRITE' } },
    create: { roundId, playerId, actionType: 'WRITE', data: { completion: completion.trim() } },
    update: { data: { completion: completion.trim() } },
  });

  await startSplitVoting(roomCode, roundId, room.id, state.dilemmaStart, completion.trim());
}

async function startSplitVoting(roomCode: string, roundId: string, roomId: string, dilemmaStart: string, completion: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'WRITING' }, data: { phase: 'VOTING' } });
  if (transitioned.count === 0) return;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) } });

  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'SPLIT_ROOM', phase: 'VOTING',
    data: { dilemma: `${dilemmaStart} ${completion}`, timeLimit: VOTE_SEC },
  });
}

export async function handleSplitVote(roomCode: string, playerId: string, roundId: string, vote: 'YES' | 'NO') {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') throw new Error('wrong phase');
  const state = gr.state as { authorId?: string };
  if (state.authorId === playerId) throw new Error('author cant vote');

  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const eligible = room.players.length - 1;
  const count = await upsertActionAndCount(roundId, playerId, 'VOTE', { vote });
  if (count >= eligible) await showSplitResults(roomCode, roundId, room.id);
}

export async function showSplitResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'VOTING' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const votes = await getAllActions(roundId, 'VOTE');
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const state = gr?.state as { authorId: string };

  const yesCount = votes.filter(v => (v.data as { vote: string }).vote === 'YES').length;
  const noCount = votes.filter(v => (v.data as { vote: string }).vote === 'NO').length;
  const total = yesCount + noCount;

  // Points for author: max 300 if perfect 50/50 split
  const splitRatio = total > 0 ? Math.min(yesCount, noCount) / (total / 2) : 0;
  const authorPoints = Math.round(splitRatio * 300);
  if (authorPoints > 0 && state?.authorId) {
    await prisma.player.update({ where: { id: state.authorId }, data: { score: { increment: authorPoints } } });
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'SPLIT_ROOM',
    results: { yesCount, noCount, authorId: state?.authorId, authorPoints, splitPercent: total > 0 ? Math.round((yesCount / total) * 100) : 50 },
  });
}

export async function advanceSplitRoom(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true, players: true } });
  if (!room?.gameState || room.currentGame !== 'SPLIT_ROOM') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string };
  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'SPLIT_ROOM'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'SPLIT_ROOM'); return true; }

  const roundNumber = room.currentRound + 1;
  const author = (pickRandom(room.players, 1) as { id: string }[])[0];
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'SPLIT_ROOM', roundNumber, phase: 'WRITING',
      state: { dilemmaStart: content.content, contentId: content.id, authorId: author.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + WRITE_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'SPLIT_ROOM', phase: 'WRITING',
    data: { dilemmaStart: content.content, roundId: gr.id, authorId: author.id, timeLimit: WRITE_SEC },
  });
  return true;
}

export async function forceSplitTimeout(roomCode: string, roundId: string, roomId: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr) return;
  if (gr.phase === 'WRITING') {
    const state = gr.state as { dilemmaStart: string; authorId: string };
    await prisma.gameAction.upsert({
      where: { roundId_playerId_actionType: { roundId, playerId: state.authorId, actionType: 'WRITE' } },
      create: { roundId, playerId: state.authorId, actionType: 'WRITE', data: { completion: '...' } },
      update: {},
    });
    await startSplitVoting(roomCode, roundId, roomId, state.dilemmaStart, '...');
  }
  if (gr.phase === 'VOTING') await showSplitResults(roomCode, roundId, roomId);
}
