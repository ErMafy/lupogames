import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

const QUESTION_SEC = 30;
/** Tempo in cui tutti vedono esito + classifica prima del round successivo (sync Pusher / HTTP). */
export const TRIVIA_RESULTS_DWELL_SEC = 4;

interface TriviaGameState {
  questionIds: string[];
  currentQuestionIndex: number;
  currentRoundId?: string;
  showingResults?: boolean;
}

// IMPORTANTISSIMO: tutti gli `sendToRoom` devono essere fatti DOPO il
// commit della transazione. Pusher e` velocissimo (sub-50ms): se emettiamo
// `round-started` mentre la transazione non e` ancora committata, il client
// reagisce e POSTa la risposta col nuovo roundId, ma l'endpoint
// /api/game/trivia/answer (che gira fuori dalla transazione) non vede
// ancora il nuovo round → 404 "Round non trovato" → loop infinito a
// partire dal round 2. Per questo accumuliamo gli eventi e li mandiamo
// dopo la return della transazione.
type PendingEvent = { event: string; payload: Record<string, unknown> };

async function advanceTriviaFromResultsDwell(
  roomCode: string,
  roomId: string,
): Promise<{ gameEnded: boolean }> {
  const result = await prisma.$transaction<{ gameEnded: boolean; events: PendingEvent[] }>(async (tx) => {
    const gs = await tx.gameState.findUnique({ where: { roomId } });
    if (!gs) return { gameEnded: true, events: [] };
    const st = gs.state as unknown as TriviaGameState;
    if (!st.showingResults) {
      return { gameEnded: false, events: [] };
    }

    const room = await tx.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    if (!room) return { gameEnded: true, events: [] };

    const nextIndex = st.currentQuestionIndex;

    if (nextIndex >= st.questionIds.length) {
      const ended = await tx.gameState.updateMany({
        where: { id: gs.id, updatedAt: gs.updatedAt },
        data: { state: {}, currentRound: 0, timerEndsAt: null },
      });
      if (ended.count === 0) return { gameEnded: false, events: [] };

      await tx.room.update({
        where: { id: roomId },
        data: { status: 'LOBBY', currentGame: null, currentRound: 0 },
      });

      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      return {
        gameEnded: true,
        events: [
          {
            event: 'game-ended',
            payload: {
              finalScores: sorted.map((p) => ({
                playerId: p.id,
                playerName: p.name,
                avatar: p.avatar,
                score: p.score,
                trackPosition: p.trackPosition,
              })),
            },
          },
        ],
      };
    }

    const question = await tx.triviaQuestion.findUnique({
      where: { id: st.questionIds[nextIndex] },
    });
    if (!question) {
      const ended = await tx.gameState.updateMany({
        where: { id: gs.id, updatedAt: gs.updatedAt },
        data: { state: {}, currentRound: 0, timerEndsAt: null },
      });
      if (ended.count === 0) return { gameEnded: false, events: [] };

      await tx.room.update({
        where: { id: roomId },
        data: { status: 'LOBBY', currentGame: null, currentRound: 0 },
      });

      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      return {
        gameEnded: true,
        events: [
          {
            event: 'game-ended',
            payload: {
              finalScores: sorted.map((p) => ({
                playerId: p.id,
                playerName: p.name,
                avatar: p.avatar,
                score: p.score,
                trackPosition: p.trackPosition,
              })),
            },
          },
        ],
      };
    }

    const triviaRound = await tx.triviaRound.create({
      data: { roomId, questionId: question.id, roundNumber: nextIndex + 1 },
    });

    const updated = await tx.gameState.updateMany({
      where: { id: gs.id, updatedAt: gs.updatedAt },
      data: {
        state: {
          ...st,
          currentQuestionIndex: nextIndex + 1,
          currentRoundId: triviaRound.id,
          showingResults: false,
        },
        currentRound: nextIndex + 1,
        timerEndsAt: new Date(Date.now() + QUESTION_SEC * 1000),
      },
    });

    if (updated.count === 0) {
      await tx.triviaRound.delete({ where: { id: triviaRound.id } });
      return { gameEnded: false, events: [] };
    }

    await tx.room.update({
      where: { id: roomId },
      data: { currentRound: nextIndex + 1 },
    });

    await tx.triviaQuestion.update({
      where: { id: question.id },
      data: { timesUsed: { increment: 1 } },
    });

    return {
      gameEnded: false,
      events: [
        {
          event: 'round-started',
          payload: {
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
          },
        },
      ],
    };
  });

  // Emetti gli eventi DOPO il commit della transazione (vedi commento sopra).
  for (const ev of result.events) {
    await sendToRoom(roomCode, ev.event, ev.payload);
  }

  return { gameEnded: result.gameEnded };
}

export async function advanceTriviaRound(
  roomCode: string,
  opts?: { force?: boolean }
): Promise<{ gameEnded: boolean }> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true },
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

  const gsFresh = await prisma.gameState.findUnique({ where: { roomId: room.id } });
  if (!gsFresh) return { gameEnded: true };
  const inner = gsFresh.state as unknown as TriviaGameState;

  if (inner.showingResults) {
    if (!opts?.force && gsFresh.timerEndsAt && gsFresh.timerEndsAt.getTime() > Date.now()) {
      return { gameEnded: false };
    }
    return advanceTriviaFromResultsDwell(roomCode, room.id);
  }

  const up = await prisma.gameState.updateMany({
    where: { id: gsFresh.id, updatedAt: gsFresh.updatedAt },
    data: {
      state: { ...inner, showingResults: true } as object,
      timerEndsAt: new Date(Date.now() + TRIVIA_RESULTS_DWELL_SEC * 1000),
    },
  });
  if (up.count === 0) {
    return { gameEnded: false };
  }

  const currentRoundId = inner.currentRoundId;
  if (currentRoundId) {
    const currentRound = await prisma.triviaRound.findUnique({
      where: { id: currentRoundId },
      include: { question: true },
    });

    if (currentRound?.question) {
      const q = currentRound.question;
      const letter = q.correctAnswer as 'A' | 'B' | 'C' | 'D';
      const optionText: Record<string, string> = {
        A: q.optionA,
        B: q.optionB,
        C: q.optionC,
        D: q.optionD,
      };
      await sendToRoom(roomCode, 'show-results', {
        correctAnswer: letter,
        correctAnswerText: optionText[letter] ?? '',
        roundId: currentRoundId,
        resultsDwellSec: TRIVIA_RESULTS_DWELL_SEC,
      });
      await sendToRoom(roomCode, 'timer-tick', {
        timeRemaining: TRIVIA_RESULTS_DWELL_SEC,
      });
    }
  }

  return { gameEnded: false };
}
