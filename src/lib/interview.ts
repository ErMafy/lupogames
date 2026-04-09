import { prisma } from '@/lib/prisma';
import {
  getContentForGame, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom, pickRandom,
} from '@/lib/new-game-utils';
import { shuffleArray } from '@/lib/utils';

const COLLECT_SEC = 40;
const BUILD_SEC = 30;
const VOTE_SEC = 25;
const RESULTS_DWELL_MS = 4000;

export async function startInterviewGame(roomCode: string, rounds = 3) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 3) throw new Error('min 3');

  const contents = await getContentForGame('INTERVIEW', rounds * 3);
  if (contents.length < 3) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'INTERVIEW');

  // Pick 2 questions for collecting phase, 1 prompt per build round
  const questions = contents.slice(0, 2).map(c => c.content);
  const buildPrompts = contents.slice(2, 2 + rounds).map(c => c.content);

  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'INTERVIEW', roundNumber: 1, phase: 'COLLECTING',
      state: { questions, buildPrompts, currentBuildIndex: 0 } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'INTERVIEW', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { currentRoundId: gr.id, collectingDone: false }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + COLLECT_SEC * 1000) },
      update: { state: { currentRoundId: gr.id, collectingDone: false }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + COLLECT_SEC * 1000) },
    }),
  ]);

  await sendToRoom(roomCode, 'game-started', { gameType: 'INTERVIEW', totalRounds: rounds });
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'INTERVIEW', phase: 'COLLECTING',
    data: { questions, roundId: gr.id, timeLimit: COLLECT_SEC },
  });
  return { roundId: gr.id };
}

export async function handleInterviewCollect(roomCode: string, playerId: string, roundId: string, answers: string[]) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'COLLECTING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'COLLECT', { answers: answers.map(a => a.trim()) });
  if (count >= room.players.length) await startBuildPhase(roomCode, roundId, room.id);
}

async function extractWordPool(roundId: string): Promise<string[]> {
  const actions = await getAllActions(roundId, 'COLLECT');
  const allWords: string[] = [];
  for (const a of actions) {
    const answers = (a.data as { answers: string[] }).answers;
    for (const answer of answers) {
      const words = answer.replace(/[^\w\sàèéìòùÀÈÉÌÒÙ]/g, '').split(/\s+/).filter(w => w.length > 1);
      allWords.push(...words);
    }
  }
  return [...new Set(allWords)];
}

async function startBuildPhase(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'COLLECTING' }, data: { phase: 'BUILDING' } });
  if (transitioned.count === 0) return;

  const wordPool = await extractWordPool(roundId);
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const state = gr?.state as { buildPrompts: string[]; currentBuildIndex: number };
  const prompt = state.buildPrompts[state.currentBuildIndex] || 'Descrivi la tua giornata ideale';

  // Each player gets 20 random words from pool
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  const playerWords: Record<string, string[]> = {};
  for (const p of (room?.players || [])) {
    playerWords[p.id] = shuffleArray(wordPool).slice(0, Math.min(20, wordPool.length));
  }

  await prisma.gameRound.update({ where: { id: roundId }, data: { state: { ...state, wordPool, playerWords } } });

  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const gst = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({
    where: { roomId },
    data: { timerEndsAt: new Date(Date.now() + BUILD_SEC * 1000), state: { ...gst, collectingDone: true } },
  });

  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'INTERVIEW', phase: 'BUILDING',
    data: { prompt, playerWords, timeLimit: BUILD_SEC },
  });
}

export async function handleInterviewBuild(roomCode: string, playerId: string, roundId: string, sentence: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'BUILDING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'BUILD', { sentence: sentence.trim() });
  if (count >= room.players.length) await startInterviewVoting(roomCode, roundId, room.id);
}

async function startInterviewVoting(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'BUILDING' }, data: { phase: 'VOTING' } });
  if (transitioned.count === 0) return;

  const builds = await getAllActions(roundId, 'BUILD');
  const sentences = builds.map(b => ({
    playerId: b.playerId, playerName: b.player.name, sentence: (b.data as { sentence: string }).sentence,
  }));

  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) } });
  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'INTERVIEW', phase: 'VOTING', data: { sentences: shuffleArray(sentences), timeLimit: VOTE_SEC },
  });
}

export async function handleInterviewVote(roomCode: string, playerId: string, roundId: string, votedPlayerId: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') throw new Error('wrong phase');
  if (votedPlayerId === playerId) throw new Error('self-vote');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const count = await upsertActionAndCount(roundId, playerId, 'VOTE', { votedPlayerId });
  if (count >= room.players.length) await showInterviewResults(roomCode, roundId, room.id);
}

export async function showInterviewResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'VOTING' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const votes = await getAllActions(roundId, 'VOTE');
  const voteCounts: Record<string, number> = {};
  for (const v of votes) { const t = (v.data as { votedPlayerId: string }).votedPlayerId; voteCounts[t] = (voteCounts[t] || 0) + 1; }

  const builds = await getAllActions(roundId, 'BUILD');
  for (const b of builds) {
    const pts = (voteCounts[b.playerId] || 0) * 100;
    if (pts > 0) await prisma.player.update({ where: { id: b.playerId }, data: { score: { increment: pts } } });
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  const results = builds.map(b => ({
    playerId: b.playerId, playerName: b.player.name,
    sentence: (b.data as { sentence: string }).sentence,
    votes: voteCounts[b.playerId] || 0,
  })).sort((a, b) => b.votes - a.votes);

  await sendToRoom(roomCode, 'round-results', { gameType: 'INTERVIEW', results });
}

export async function advanceInterview(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true, players: true } });
  if (!room?.gameState || room.currentGame !== 'INTERVIEW') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { currentRoundId?: string; advanceAt?: string; collectingDone?: boolean };

  // If still collecting, force build phase
  if (st.currentRoundId && !st.collectingDone) {
    const gr = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (gr?.phase === 'COLLECTING') { await startBuildPhase(roomCode, st.currentRoundId, room.id); return true; }
  }

  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  // Check current round state for phase transitions
  if (st.currentRoundId) {
    const gr = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (gr?.phase === 'BUILDING') { await startInterviewVoting(roomCode, st.currentRoundId, room.id); return true; }
    if (gr?.phase === 'VOTING') { await showInterviewResults(roomCode, st.currentRoundId, room.id); return true; }
  }

  // Move to next build round (reuse same collecting data)
  const currentGr = st.currentRoundId ? await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } }) : null;
  if (!currentGr) { await endGenericGame(roomCode, room.id, 'INTERVIEW'); return true; }

  const grState = currentGr.state as { buildPrompts: string[]; currentBuildIndex: number; wordPool?: string[]; playerWords?: Record<string, string[]> };
  const nextBuildIdx = grState.currentBuildIndex + 1;
  if (nextBuildIdx >= grState.buildPrompts.length) { await endGenericGame(roomCode, room.id, 'INTERVIEW'); return true; }

  // Create new round for next build phase
  const roundNumber = room.currentRound + 1;
  const prompt = grState.buildPrompts[nextBuildIdx];
  const wordPool = grState.wordPool || [];
  const playerWords: Record<string, string[]> = {};
  for (const p of room.players) {
    playerWords[p.id] = shuffleArray(wordPool).slice(0, Math.min(20, wordPool.length));
  }

  const newGr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'INTERVIEW', roundNumber, phase: 'BUILDING',
      state: { ...grState, currentBuildIndex: nextBuildIdx, playerWords } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + BUILD_SEC * 1000), state: { ...st, currentRoundId: newGr.id, advanceAt: null } } }),
  ]);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'INTERVIEW', phase: 'BUILDING',
    data: { prompt, playerWords, roundId: newGr.id, timeLimit: BUILD_SEC },
  });
  return true;
}
