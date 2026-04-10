import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom,
} from '@/lib/new-game-utils';

const ACCUSE_SEC = 30;
const DEFENSE_SEC = 20;
const VERDICT_SEC = 20;
const RESULTS_DWELL_MS = 4000;

export async function startTribunalGame(roomCode: string, rounds = 5) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 3) throw new Error('min 3');

  const contents = await getContentForGame('TRIBUNAL', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'TRIBUNAL');
  const first = contents[0];
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'TRIBUNAL', roundNumber: 1, phase: 'ACCUSING', state: { accusation: first.content, contentId: first.id } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'TRIBUNAL', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + ACCUSE_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + ACCUSE_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'TRIBUNAL', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'TRIBUNAL', phase: 'ACCUSING',
    data: { accusation: first.content, roundId: gr.id, timeLimit: ACCUSE_SEC,
      players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) },
  });
  return { roundId: gr.id };
}

export async function handleAccusation(roomCode: string, playerId: string, roundId: string, accusedPlayerId: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'ACCUSING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'ACCUSE', { accusedPlayerId });
  if (count >= room.players.length) await startDefensePhase(roomCode, roundId, room.id);
}

async function startDefensePhase(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'ACCUSING' }, data: { phase: 'DEFENSE' } });
  if (transitioned.count === 0) return;

  const actions = await getAllActions(roundId, 'ACCUSE');
  const voteCounts: Record<string, number> = {};
  for (const a of actions) {
    const accused = (a.data as { accusedPlayerId: string }).accusedPlayerId;
    voteCounts[accused] = (voteCounts[accused] || 0) + 1;
  }
  const defendantId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0];
  const defendant = await prisma.player.findUnique({ where: { id: defendantId } });

  const currentGr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const grState = (currentGr?.state || {}) as Record<string, unknown>;
  await prisma.gameRound.update({ where: { id: roundId }, data: { state: { ...grState, defendantId } } });
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + DEFENSE_SEC * 1000) } });

  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'TRIBUNAL', phase: 'DEFENSE',
    data: { defendantId, defendantName: defendant?.name, timeLimit: DEFENSE_SEC, voteResults: voteCounts },
  });
}

export async function handleDefense(roomCode: string, playerId: string, roundId: string, defense: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'DEFENSE') throw new Error('wrong phase');
  const state = gr.state as { defendantId?: string };
  if (state.defendantId !== playerId) throw new Error('not defendant');

  await prisma.gameAction.upsert({
    where: { roundId_playerId_actionType: { roundId, playerId, actionType: 'DEFENSE' } },
    create: { roundId, playerId, actionType: 'DEFENSE', data: { defense } },
    update: { data: { defense } },
  });

  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
  if (room) await startVerdictPhase(roomCode, roundId, room.id, defense);
}

async function startVerdictPhase(roomCode: string, roundId: string, roomId: string, defense: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'DEFENSE' }, data: { phase: 'VERDICT' } });
  if (transitioned.count === 0) return;

  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + VERDICT_SEC * 1000) } });

  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'TRIBUNAL', phase: 'VERDICT', data: { defense, timeLimit: VERDICT_SEC },
  });
}

export async function handleVerdict(roomCode: string, playerId: string, roundId: string, verdict: 'INNOCENT' | 'GUILTY') {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VERDICT') throw new Error('wrong phase');
  const state = gr.state as { defendantId?: string };
  if (state.defendantId === playerId) throw new Error('defendant cant vote');

  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const eligible = room.players.length - 1;
  const count = await upsertActionAndCount(roundId, playerId, 'VERDICT', { verdict });
  if (count >= eligible) await showTribunalResults(roomCode, roundId, room.id);
}

export async function showTribunalResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'VERDICT' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  const verdicts = await getAllActions(roundId, 'VERDICT');
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const state = gr?.state as { defendantId?: string };

  const innocent = verdicts.filter(v => (v.data as { verdict: string }).verdict === 'INNOCENT').length;
  const guilty = verdicts.filter(v => (v.data as { verdict: string }).verdict === 'GUILTY').length;
  const isInnocent = innocent >= guilty;

  if (isInnocent && state?.defendantId) {
    await prisma.player.update({ where: { id: state.defendantId }, data: { score: { increment: 200 } } });
  } else {
    const accusers = await getAllActions(roundId, 'ACCUSE');
    for (const a of accusers) {
      if ((a.data as { accusedPlayerId: string }).accusedPlayerId === state?.defendantId) {
        await prisma.player.update({ where: { id: a.playerId }, data: { score: { increment: 100 } } });
      }
    }
  }

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'TRIBUNAL', results: { innocent, guilty, isInnocent, defendantId: state?.defendantId },
  });
}

export async function advanceTribunal(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true } });
  if (!room?.gameState || room.currentGame !== 'TRIBUNAL') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string };
  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'TRIBUNAL'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'TRIBUNAL'); return true; }

  const roundNumber = room.currentRound + 1;
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'TRIBUNAL', roundNumber, phase: 'ACCUSING', state: { accusation: content.content, contentId: content.id } },
  });

  const players = await prisma.player.findMany({ where: { roomId: room.id }, select: { id: true, name: true, avatar: true } });
  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + ACCUSE_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'TRIBUNAL', phase: 'ACCUSING',
    data: { accusation: content.content, roundId: gr.id, timeLimit: ACCUSE_SEC, players },
  });
  return true;
}

export async function forceTribunalTimeout(roomCode: string, roundId: string, roomId: string) {
  // Re-read both round AND gameState to avoid acting on stale data from a previous phase
  const [gr, gs] = await Promise.all([
    prisma.gameRound.findUnique({ where: { id: roundId } }),
    prisma.gameState.findUnique({ where: { roomId } }),
  ]);
  if (!gr) return;

  // Only force timeout if the timer for the CURRENT phase has actually expired
  const timerEnd = gs?.timerEndsAt?.getTime() || 0;
  if (timerEnd > Date.now()) return;

  if (gr.phase === 'ACCUSING') {
    await startDefensePhase(roomCode, roundId, roomId);
  } else if (gr.phase === 'DEFENSE') {
    const defense = '(Nessuna difesa presentata)';
    const defendantId = (gr.state as any).defendantId || '';
    if (defendantId) {
      await prisma.gameAction.upsert({
        where: { roundId_playerId_actionType: { roundId, playerId: defendantId, actionType: 'DEFENSE' } },
        create: { roundId, playerId: defendantId, actionType: 'DEFENSE', data: { defense } },
        update: { data: { defense } },
      });
    }
    await startVerdictPhase(roomCode, roundId, roomId, defense);
  } else if (gr.phase === 'VERDICT') {
    await showTribunalResults(roomCode, roundId, roomId);
  }
}
