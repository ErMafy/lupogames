// 🐺 LUPO GAMES - API Trivia Round
// Gestisce un singolo round di trivia

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

// POST /api/game/trivia/round - Avvia un nuovo round
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode } = body;

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        gameState: true,
        players: true,
      },
    });

    if (!room || !room.gameState) {
      return NextResponse.json(
        { success: false, error: 'Partita non trovata' },
        { status: 404 }
      );
    }

    const gameState = room.gameState.state as {
      questionIds: string[];
      currentQuestionIndex: number;
    };

    const nextIndex = gameState.currentQuestionIndex;
    if (nextIndex >= gameState.questionIds.length) {
      // Gioco finito!
      await sendToRoom(roomCode, 'game-ended', {
        finalScores: room.players.map(p => ({
          playerId: p.id,
          playerName: p.name,
          avatar: p.avatar,
          score: p.score,
          trackPosition: p.trackPosition,
        })).sort((a, b) => b.score - a.score),
      });

      return NextResponse.json({
        success: true,
        data: { gameEnded: true },
      });
    }

    // Pesca la prossima domanda
    const question = await prisma.triviaQuestion.findUnique({
      where: { id: gameState.questionIds[nextIndex] },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Domanda non trovata' },
        { status: 404 }
      );
    }

    // Crea il round nel DB
    const triviaRound = await prisma.triviaRound.create({
      data: {
        roomId: room.id,
        questionId: question.id,
        roundNumber: nextIndex + 1,
      },
    });

    // Aggiorna lo stato
    await prisma.$transaction([
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {
            ...gameState,
            currentQuestionIndex: nextIndex + 1,
            currentRoundId: triviaRound.id,
          },
          currentRound: nextIndex + 1,
          timerEndsAt: new Date(Date.now() + 15000), // 15 secondi
        },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { currentRound: nextIndex + 1 },
      }),
      // Incrementa il contatore di utilizzo della domanda
      prisma.triviaQuestion.update({
        where: { id: question.id },
        data: { timesUsed: { increment: 1 } },
      }),
    ]);

    // Invia la domanda a tutti
    await sendToRoom(roomCode, 'round-started', {
      roundNumber: nextIndex + 1,
      gameType: 'TRIVIA',
      data: {
        questionId: question.id,
        question: question.question,
        options: {
          A: question.optionA,
          B: question.optionB,
          C: question.optionC,
          D: question.optionD,
        },
        timeLimit: 15,
        roundId: triviaRound.id,
      },
    });

    console.log(`🐺 Round ${nextIndex + 1} iniziato: "${question.question.substring(0, 50)}..."`);

    return NextResponse.json({
      success: true,
      data: {
        roundNumber: nextIndex + 1,
        questionId: question.id,
      },
    });

  } catch (error) {
    console.error('🐺 Errore round trivia:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel round' },
      { status: 500 }
    );
  }
}
