// Logica condivisa Continua la Frase — fasi e avanzamento round

import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

const VOTING_SEC = 45;
const READ_ONLY_SEC = 20;
const RESULTS_DWELL_MS = 3000;

export async function startPromptVotingPhase(roomCode: string, roundId: string, roomId: string) {
  // Atomic: only transition WRITING → VOTING once
  const transitioned = await prisma.promptRound.updateMany({
    where: { id: roundId, phase: 'WRITING' },
    data: { phase: 'VOTING' },
  });
  if (transitioned.count === 0) return;

  const responses = await prisma.promptResponse.findMany({
    where: { promptRoundId: roundId },
    include: { player: true },
  });

  if (responses.length === 0) {
    await skipPromptRoundWithNoResponses(roomCode, roomId, roundId);
    return;
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: true },
  });
  const shouldAllowVoting = (room?.players.length ?? 0) > 2;
  const phaseTimeSec = shouldAllowVoting ? VOTING_SEC : READ_ONLY_SEC;

  await prisma.gameState.update({
    where: { roomId },
    data: {
      timerEndsAt: new Date(Date.now() + phaseTimeSec * 1000),
    },
  });

  const shuffledResponses = responses
    .sort(() => Math.random() - 0.5)
    .map((r: { id: string; response: string }) => ({
      id: r.id,
      response: r.response,
    }));

  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'CONTINUE_PHRASE',
    phase: 'VOTING',
    data: {
      responses: shuffledResponses,
      timeLimit: phaseTimeSec,
    },
  });
}

async function skipPromptRoundWithNoResponses(roomCode: string, roomId: string, roundId: string) {
  await prisma.promptRound.update({
    where: { id: roundId },
    data: { phase: 'RESULTS', endedAt: new Date() },
  });
  await schedulePromptAdvance(roomCode, roomId);
}

export async function showPromptRoundResults(roomCode: string, roundId: string, roomId: string) {
  // Atomic phase transition: only one caller can win
  const transitioned = await prisma.promptRound.updateMany({
    where: { id: roundId, phase: 'VOTING' },
    data: { phase: 'RESULTS', endedAt: new Date() },
  });
  if (transitioned.count === 0) return;

  // Schedule advance FIRST so the game never gets stuck even if scoring fails
  await schedulePromptAdvance(roomCode, roomId);

  try {
    const responses = await prisma.promptResponse.findMany({
      where: { promptRoundId: roundId },
      include: {
        player: true,
        votes: true,
      },
    });

    const results = await Promise.all(
      responses.map(
        async (r: {
          id: string;
          response: string;
          playerId: string;
          player: { name: string; avatar: string | null };
          votes: unknown[];
        }) => {
          const points = r.votes.length * 100;
          await prisma.$transaction([
            prisma.promptResponse.update({
              where: { id: r.id },
              data: {
                voteCount: r.votes.length,
                pointsEarned: points,
              },
            }),
            prisma.player.update({
              where: { id: r.playerId },
              data: { score: { increment: points } },
            }),
          ]);
          return {
            responseId: r.id,
            response: r.response,
            playerId: r.playerId,
            playerName: r.player.name,
            avatar: r.player.avatar,
            voteCount: r.votes.length,
            pointsEarned: points,
          };
        }
      )
    );

    results.sort((a, b) => b.voteCount - a.voteCount);

    await sendToRoom(roomCode, 'round-results', {
      gameType: 'CONTINUE_PHRASE',
      results,
      winner: results[0],
    });
  } catch (err) {
    console.error('Prompt scoring/broadcast failed, advance still scheduled:', err);
    await sendToRoom(roomCode, 'round-results', {
      gameType: 'CONTINUE_PHRASE',
      results: [],
      winner: null,
    });
  }
}

async function schedulePromptAdvance(roomCode: string, roomId: string) {
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  if (!gs) return;
  const st = (gs.state || {}) as Record<string, unknown>;
  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  await prisma.gameState.update({
    where: { roomId },
    data: {
      timerEndsAt: until,
      state: {
        ...st,
        promptAdvanceAt: until.toISOString(),
      },
    },
  });
}

export async function advancePromptToNextOrEnd(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true },
  });
  if (!room?.gameState || room.currentGame !== 'CONTINUE_PHRASE') return false;

  const gs = room.gameState;
  const state = (gs.state || {}) as {
    phraseIds?: string[];
    currentPhraseIndex?: number;
    currentRoundId?: string;
    promptAdvanceAt?: string;
  };

  if (!state.phraseIds?.length) return false;

  const nextIdx = state.currentPhraseIndex ?? 0;
  if (nextIdx >= state.phraseIds.length) {
    await endPromptGame(roomCode, room.id);
    return true;
  }

  const phraseId = state.phraseIds[nextIdx];
  const phrase = await prisma.promptPhrase.findUnique({ where: { id: phraseId } });
  if (!phrase) {
    await endPromptGame(roomCode, room.id);
    return true;
  }

  const roundNumber = room.currentRound + 1;
  const promptRound = await prisma.promptRound.create({
    data: {
      roomId: room.id,
      phraseId,
      roundNumber,
      phase: 'WRITING',
    },
  });

  const WRITING_SEC = 45;
  await prisma.$transaction([
    prisma.room.update({
      where: { id: room.id },
      data: { currentRound: roundNumber },
    }),
    prisma.gameState.update({
      where: { roomId: room.id },
      data: {
        currentRound: roundNumber,
        timerEndsAt: new Date(Date.now() + WRITING_SEC * 1000),
        state: {
          ...state,
          currentPhraseIndex: nextIdx + 1,
          currentRoundId: promptRound.id,
          promptAdvanceAt: null,
        },
      },
    }),
    prisma.promptPhrase.update({
      where: { id: phraseId },
      data: { timesUsed: { increment: 1 } },
    }),
  ]);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber,
    totalRounds: gs.totalRounds,
    gameType: 'CONTINUE_PHRASE',
    phase: 'WRITING',
    data: {
      phraseId: phrase.id,
      phrase: phrase.phrase,
      timeLimit: WRITING_SEC,
      roundId: promptRound.id,
    },
  });

  return true;
}

async function endPromptGame(roomCode: string, roomId: string) {
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { score: 'desc' },
  });

  await prisma.$transaction([
    prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'LOBBY',
        currentGame: null,
        currentRound: 0,
      },
    }),
    prisma.gameState.update({
      where: { roomId },
      data: {
        state: {},
        currentRound: 0,
        totalRounds: 5,
        timerEndsAt: null,
      },
    }),
  ]);

  await sendToRoom(roomCode, 'game-ended', {
    gameType: 'CONTINUE_PHRASE',
    finalScores: players.map(
      (p: { id: string; name: string; avatar: string | null; score: number }, i: number) => ({
        rank: i + 1,
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        score: p.score,
      })
    ),
  });
}

export async function forcePromptWritingTimeout(
  roomCode: string,
  roundId: string,
  roomId: string
) {
  const pr = await prisma.promptRound.findUnique({
    where: { id: roundId },
    include: { responses: true },
  });
  if (!pr || pr.phase !== 'WRITING') return;
  await startPromptVotingPhase(roomCode, roundId, roomId);
}

export async function forcePromptVotingTimeout(
  roomCode: string,
  roundId: string,
  roomId: string
) {
  const pr = await prisma.promptRound.findUnique({ where: { id: roundId } });
  if (!pr || pr.phase !== 'VOTING') return;
  await showPromptRoundResults(roomCode, roundId, roomId);
}

export async function tryAdvancePromptIfCooldownDone(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true },
  });
  if (!room?.gameState || room.currentGame !== 'CONTINUE_PHRASE') return false;

  const gs = room.gameState;
  const state = (gs.state || {}) as { promptAdvanceAt?: string; currentRoundId?: string };

  // If promptAdvanceAt is set, respect the dwell time
  if (state.promptAdvanceAt && new Date(state.promptAdvanceAt).getTime() > Date.now()) {
    return false;
  }

  // If phase is RESULTS, advance (even if promptAdvanceAt is missing — safety net)
  if (!state.currentRoundId) return false;
  const round = await prisma.promptRound.findUnique({
    where: { id: state.currentRoundId },
  });
  if (!round || round.phase !== 'RESULTS') return false;

  return advancePromptToNextOrEnd(roomCode);
}
