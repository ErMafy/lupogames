import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

const QUESTION_SEC = 30;
const RESULTS_DWELL_SEC = 3;

interface TriviaGameState {
  questionIds: string[];
  currentQuestionIndex: number;
  currentRoundId?: string;
  showingResults?: boolean;
}

export async function advanceTriviaRound(
  roomCode: string,
  opts?: { force?: boolean }
): Promise<{ gameEnded: boolean }> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true, players: true },
  });

  if (!room?.gameState) {
    return { gameEnded: true };
  }

  if (
    !opts?.force &&
    room.gameState.timerEndsAt &&
    room.gameState.timerEndsAt.getTime() > Date.now()
  ) {
    return { gameEnded: false };
  }

  const gameState = room.gameState.state as unknown as TriviaGameState;

  // ── PHASE 2: dwell expired → advance to next question ──
  if (gameState.showingResults) {
    const nextIndex = gameState.currentQuestionIndex;

    if (nextIndex >= gameState.questionIds.length) {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      await prisma.$transaction([
        prisma.room.update({
          where: { id: room.id },
          data: { status: 'LOBBY', currentGame: null, currentRound: 0 },
        }),
        prisma.gameState.update({
          where: { roomId: room.id },
          data: { state: {}, currentRound: 0, timerEndsAt: null },
        }),
      ]);

      await sendToRoom(roomCode, 'game-ended', {
        finalScores: sorted.map((p) => ({
          playerId: p.id,
          playerName: p.name,
          avatar: p.avatar,
          score: p.score,
          trackPosition: p.trackPosition,
        })),
      });

      return { gameEnded: true };
    }

    const question = await prisma.triviaQuestion.findUnique({
      where: { id: gameState.questionIds[nextIndex] },
    });
    if (!question) return { gameEnded: true };

    const triviaRound = await prisma.triviaRound.create({
      data: { roomId: room.id, questionId: question.id, roundNumber: nextIndex + 1 },
    });

    await prisma.$transaction([
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {
            ...gameState,
            currentQuestionIndex: nextIndex + 1,
            currentRoundId: triviaRound.id,
            showingResults: false,
          },
          currentRound: nextIndex + 1,
          timerEndsAt: new Date(Date.now() + QUESTION_SEC * 1000),
        },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { currentRound: nextIndex + 1 },
      }),
      prisma.triviaQuestion.update({
        where: { id: question.id },
        data: { timesUsed: { increment: 1 } },
      }),
    ]);

    await sendToRoom(roomCode, 'round-started', {
      roundNumber: nextIndex + 1,
      gameType: 'TRIVIA',
      data: {
        questionId: question.id,
        question: question.question,
        category: question.category,
        options: {
          A: question.optionA,
          B: question.optionB,
          C: question.optionC,
          D: question.optionD,
        },
        timeLimit: QUESTION_SEC,
        roundId: triviaRound.id,
      },
    });

    return { gameEnded: false };
  }

  // ── PHASE 1: question time expired / all answered → show results dwell ──
  const currentRoundId = gameState.currentRoundId;
  if (currentRoundId) {
    const currentRound = await prisma.triviaRound.findUnique({
      where: { id: currentRoundId },
      include: { question: true },
    });

    if (currentRound?.question) {
      await sendToRoom(roomCode, 'show-results', {
        correctAnswer: currentRound.question.correctAnswer,
      });
    }
  }

  await prisma.gameState.update({
    where: { roomId: room.id },
    data: {
      state: { ...gameState, showingResults: true },
      timerEndsAt: new Date(Date.now() + RESULTS_DWELL_SEC * 1000),
    },
  });

  return { gameEnded: false };
}
