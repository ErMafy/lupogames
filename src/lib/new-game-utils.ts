import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';

export async function getContentForGame(gameType: string, count: number) {
  const items = await prisma.gameContent.findMany({
    where: { gameType: gameType as any },
    orderBy: { timesUsed: 'asc' },
    take: count * 2,
  });
  return pickRandom(items, count) as { id: string; content: string }[];
}

export async function incrementContentUsage(id: string) {
  await prisma.gameContent.update({
    where: { id },
    data: { timesUsed: { increment: 1 } },
  });
}

export async function endGenericGame(roomCode: string, roomId: string, gameType: string) {
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { score: 'desc' },
  });

  await prisma.$transaction([
    prisma.room.update({
      where: { id: roomId },
      data: { status: 'LOBBY', currentGame: null, currentRound: 0 },
    }),
    prisma.gameState.update({
      where: { roomId },
      data: { state: {}, currentRound: 0, timerEndsAt: null },
    }),
  ]);

  await sendToRoom(roomCode, 'game-ended', {
    gameType,
    finalScores: players.map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      score: p.score,
    })),
  });
}

export async function countActions(roundId: string, actionType: string): Promise<number> {
  return prisma.gameAction.count({ where: { roundId, actionType } });
}

export async function upsertAction(
  roundId: string,
  playerId: string,
  actionType: string,
  data: Record<string, unknown>,
) {
  return prisma.gameAction.upsert({
    where: { roundId_playerId_actionType: { roundId, playerId, actionType } },
    create: { roundId, playerId, actionType, data },
    update: { data },
  });
}

export async function upsertActionAndCount(
  roundId: string,
  playerId: string,
  actionType: string,
  data: Record<string, unknown>,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.gameAction.upsert({
      where: { roundId_playerId_actionType: { roundId, playerId, actionType } },
      create: { roundId, playerId, actionType, data },
      update: { data },
    });
    return tx.gameAction.count({ where: { roundId, actionType } });
  });
}

export async function getAllActions(roundId: string, actionType: string) {
  return prisma.gameAction.findMany({
    where: { roundId, actionType },
    include: { player: true },
  });
}

export async function cleanupOldRounds(roomId: string, gameType: string) {
  await prisma.gameRound.deleteMany({
    where: { roomId, gameType: gameType as any },
  });
}

export { sendToRoom, pickRandom };
