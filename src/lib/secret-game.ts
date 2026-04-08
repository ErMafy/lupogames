import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';

const GUESS_SEC = 45;
const REVEAL_DWELL_MS = 4000;

export async function endSecretGame(roomCode: string, roomId: string) {
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
        timerEndsAt: null,
      },
    }),
  ]);

  await sendToRoom(roomCode, 'game-ended', {
    gameType: 'WHO_WAS_IT',
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

export async function startGuessingRound(roomCode: string, roomId: string, roundNumber: number) {
  const secrets = await prisma.secret.findMany({
    where: {
      player: { roomId },
      isUsed: false,
    },
    include: { player: true },
  });

  if (secrets.length === 0) {
    await endSecretGame(roomCode, roomId);
    return;
  }

  const selectedSecret = (pickRandom(secrets, 1) as { id: string; content: string; playerId: string }[])[0];

  const secretRound = await prisma.secretRound.create({
    data: {
      roomId,
      secretId: selectedSecret.id,
      roundNumber,
      phase: 'GUESSING',
    },
  });

  const gsPrev = await prisma.gameState.findUnique({ where: { roomId } });
  const prevSt = (gsPrev?.state || {}) as Record<string, unknown>;

  await prisma.$transaction([
    prisma.secret.update({
      where: { id: selectedSecret.id },
      data: { isUsed: true },
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { currentRound: roundNumber },
    }),
    prisma.gameState.update({
      where: { roomId },
      data: {
        state: {
          ...prevSt,
          phase: 'GUESSING',
          currentRoundId: secretRound.id,
          currentSecretId: selectedSecret.id,
          secretOwnerId: selectedSecret.playerId,
          secretAdvanceAt: null,
        },
        currentRound: roundNumber,
        timerEndsAt: new Date(Date.now() + GUESS_SEC * 1000),
      },
    }),
  ]);

  const players = await prisma.player.findMany({
    where: { roomId },
    select: { id: true, name: true, avatar: true, avatarColor: true },
  });

  await sendToRoom(roomCode, 'round-started', {
    roundNumber,
    gameType: 'WHO_WAS_IT',
    phase: 'GUESSING',
    data: {
      secret: selectedSecret.content,
      roundId: secretRound.id,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        avatarColor: p.avatarColor,
      })),
      timeLimit: GUESS_SEC,
    },
  });
}

export async function showSecretRoundResults(roomCode: string, roundId: string, roomId: string) {
  const secretRound = await prisma.secretRound.findUnique({
    where: { id: roundId },
    include: {
      secret: { include: { player: true } },
      votes: { include: { player: true } },
    },
  });

  if (!secretRound) return;

  await prisma.secretRound.update({
    where: { id: roundId },
    data: { phase: 'REVEAL', endedAt: new Date() },
  });

  const results = {
    secret: secretRound.secret.content,
    owner: {
      id: secretRound.secret.player.id,
      name: secretRound.secret.player.name,
      avatar: secretRound.secret.player.avatar,
    },
    votes: secretRound.votes.map(
      (v: {
        playerId: string;
        player: { name: string; avatar: string | null };
        isCorrect: boolean;
        pointsEarned: number;
      }) => ({
        playerId: v.playerId,
        playerName: v.player.name,
        avatar: v.player.avatar,
        guessedCorrectly: v.isCorrect,
        pointsEarned: v.pointsEarned,
      })
    ),
    correctGuesses: secretRound.votes.filter((v: { isCorrect: boolean }) => v.isCorrect).length,
    totalVotes: secretRound.votes.length,
  };

  await sendToRoom(roomCode, 'round-results', {
    gameType: 'WHO_WAS_IT',
    results,
  });

  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  const until = new Date(Date.now() + REVEAL_DWELL_MS);
  await prisma.gameState.update({
    where: { roomId },
    data: {
      timerEndsAt: until,
      state: {
        ...st,
        phase: 'REVEAL',
        secretAdvanceAt: until.toISOString(),
      },
    },
  });

  await sendToRoom(roomCode, 'secret-reveal', {
    actualPlayer: results.owner,
    secretContent: results.secret,
  });
}

export async function advanceSecretAfterReveal(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true },
  });
  if (!room?.gameState || room.currentGame !== 'WHO_WAS_IT') return false;

  const gs = room.gameState;
  const state = (gs.state || {}) as {
    secretAdvanceAt?: string;
    totalRounds?: number;
  };

  if (!state.secretAdvanceAt || new Date(state.secretAdvanceAt).getTime() > Date.now()) {
    return false;
  }

  const lastRound = await prisma.secretRound.findFirst({
    where: { roomId: room.id },
    orderBy: { roundNumber: 'desc' },
  });
  if (!lastRound) return false;

  const nextRound = lastRound.roundNumber + 1;
  const totalRounds = state.totalRounds || 5;

  if (nextRound > totalRounds) {
    await endSecretGame(roomCode, room.id);
    return true;
  }

  const secrets = await prisma.secret.findMany({
    where: { player: { roomId: room.id }, isUsed: false },
  });

  if (secrets.length === 0) {
    await endSecretGame(roomCode, room.id);
    return true;
  }

  await startGuessingRound(roomCode, room.id, nextRound);
  return true;
}

export async function forceSecretCollectingTimeout(roomCode: string, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: true },
  });
  if (!room) return;
  const count = await prisma.secret.count({
    where: { player: { roomId } },
  });
  if (count === 0) {
    await endSecretGame(roomCode, roomId);
    return;
  }
  await startGuessingRound(roomCode, roomId, 1);
}

export async function forceSecretGuessingTimeout(roomCode: string, roundId: string, roomId: string) {
  const sr = await prisma.secretRound.findUnique({ where: { id: roundId } });
  if (!sr || sr.phase !== 'GUESSING') return;
  await showSecretRoundResults(roomCode, roundId, roomId);
}
