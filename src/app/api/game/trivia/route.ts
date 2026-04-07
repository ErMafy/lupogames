// 🐺 LUPO GAMES - API Trivia Game
// La Corsa del Sapere - dove l'ignoranza viene punita pubblicamente

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';

// POST /api/game/trivia - Inizia una partita trivia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, rounds = 15 } = body;

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true, gameState: true },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Stanza non trovata' },
        { status: 404 }
      );
    }

    if (room.players.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Servono almeno 2 giocatori per iniziare!' },
        { status: 400 }
      );
    }

    // Pesca domande random per tutti i round
    const questions = await prisma.triviaQuestion.findMany({
      take: rounds * 2, // Prendiamo il doppio per sicurezza
      orderBy: { timesUsed: 'asc' }, // Priorità a quelle meno usate
    });

    if (questions.length < rounds) {
      return NextResponse.json(
        { success: false, error: 'Non ci sono abbastanza domande nel database!' },
        { status: 400 }
      );
    }

    const selectedQuestions = pickRandom(questions, rounds);
    const firstQuestion = selectedQuestions[0];

    // Crea il primo round
    const triviaRound = await prisma.triviaRound.create({
      data: {
        roomId: room.id,
        questionId: firstQuestion.id,
        roundNumber: 1,
      },
    });

    // Aggiorna lo stato della stanza
    await prisma.$transaction([
      prisma.room.update({
        where: { id: room.id },
        data: {
          status: 'PLAYING',
          currentGame: 'TRIVIA',
          currentRound: 1,
        },
      }),
      // Reset posizioni giocatori
      prisma.player.updateMany({
        where: { roomId: room.id },
        data: { trackPosition: 0, score: 0 },
      }),
      // Salva lo stato del gioco
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {
            questionIds: selectedQuestions.map((q: { id: string }) => q.id),
            currentQuestionIndex: 1, // Già al primo
            currentRoundId: triviaRound.id,
          },
          totalRounds: rounds,
          currentRound: 1,
          timerEndsAt: new Date(Date.now() + 15000), // 15 secondi
        },
      }),
      // Incrementa il contatore di utilizzo
      prisma.triviaQuestion.update({
        where: { id: firstQuestion.id },
        data: { timesUsed: { increment: 1 } },
      }),
    ]);

    // Notifica tutti che il gioco è iniziato
    await sendToRoom(roomCode, 'game-started', {
      gameType: 'TRIVIA',
      totalRounds: rounds,
      playerCount: room.players.length,
    });

    // Invia subito la prima domanda
    await sendToRoom(roomCode, 'round-started', {
      roundNumber: 1,
      totalRounds: rounds,
      gameType: 'TRIVIA',
      data: {
        questionId: firstQuestion.id,
        question: firstQuestion.question,
        category: firstQuestion.category,
        options: {
          A: firstQuestion.optionA,
          B: firstQuestion.optionB,
          C: firstQuestion.optionC,
          D: firstQuestion.optionD,
        },
        timeLimit: 15,
        roundId: triviaRound.id,
      },
    });

    console.log(`🐺 Trivia iniziato nella stanza ${roomCode} - Prima domanda: "${firstQuestion.question.substring(0, 40)}..."`);

    return NextResponse.json({
      success: true,
      data: {
        gameType: 'TRIVIA',
        totalRounds: rounds,
        currentRound: 1,
        question: {
          id: firstQuestion.id,
          question: firstQuestion.question,
          category: firstQuestion.category,
          options: {
            A: firstQuestion.optionA,
            B: firstQuestion.optionB,
            C: firstQuestion.optionC,
            D: firstQuestion.optionD,
          },
        },
      },
    });

  } catch (error) {
    console.error('🐺 Errore avvio trivia:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'avvio del trivia' },
      { status: 500 }
    );
  }
}
