// 🐺 LUPO GAMES - API Trivia Answer
// Ricevi e processa le risposte dei giocatori

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { calculateTriviaPoints } from '@/lib/utils';
import { checkAllPlayersCompleted } from '@/lib/server-utils';

// POST /api/game/trivia/answer - Invia una risposta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, answer, responseTimeMs } = body;

    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      return NextResponse.json(
        { success: false, error: 'Risposta non valida. A, B, C o D!' },
        { status: 400 }
      );
    }

    // Trova il round
    const triviaRound = await prisma.triviaRound.findUnique({
      where: { id: roundId },
      include: {
        question: true,
        room: true,
        answers: true,
      },
    });

    if (!triviaRound) {
      return NextResponse.json(
        { success: false, error: 'Round non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il giocatore non abbia già risposto
    const alreadyAnswered = triviaRound.answers.find((a: { playerId: string }) => a.playerId === playerId);
    if (alreadyAnswered) {
      return NextResponse.json(
        { success: false, error: 'Hai già risposto a questa domanda!' },
        { status: 400 }
      );
    }

    // Calcola se è corretta e i punti
    const isCorrect = answer === triviaRound.question.correctAnswer;
    const points = calculateTriviaPoints(isCorrect, responseTimeMs, 15000);

    // Determina se è il più veloce tra quelli corretti
    const correctAnswers = triviaRound.answers.filter((a: { isCorrect: boolean }) => a.isCorrect);
    const isFastest = isCorrect && correctAnswers.length === 0;

    // Bonus per il più veloce
    const fastestBonus = isFastest ? 50 : 0;
    const totalPoints = points + fastestBonus;

    // Salva la risposta
    await prisma.triviaAnswer.create({
      data: {
        playerId,
        triviaRoundId: roundId,
        answer,
        isCorrect,
        responseTimeMs,
        pointsEarned: totalPoints,
      },
    });

    // Aggiorna punteggio e posizione del giocatore
    const player = await prisma.player.update({
      where: { id: playerId },
      data: {
        score: { increment: totalPoints },
        // Avanza sulla pista: 1 casella per risposta corretta, 2 se più veloce
        trackPosition: isCorrect
          ? { increment: isFastest ? 2 : 1 }
          : undefined,
      },
    });

    // Notifica tutti del movimento
    await sendToRoom(triviaRound.room.code, 'player-advanced', {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      newPosition: player.trackPosition,
      isCorrect,
      isFastest,
      pointsEarned: totalPoints,
    });

    // 🚀 AUTO-ADVANCE: Controlla se tutti hanno risposto
    const allCompleted = await checkAllPlayersCompleted(
      triviaRound.room.code,
      'TRIVIA',
      roundId,
      'answer'
    );

    if (allCompleted) {
      console.log(`🐺 Tutti hanno risposto! Auto-advancing...`);
      // Notifica che tutti hanno risposto e il round sta per avanzare
      await sendToRoom(triviaRound.room.code, 'all-players-completed', {
        message: 'Tutti hanno risposto! Prossima domanda in arrivo...',
      });
    }

    console.log(
      `🐺 ${player.name} ha risposto ${answer} (${isCorrect ? '✓' : '✗'}) - ${totalPoints} punti`
    );

    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        isFastest,
        pointsEarned: totalPoints,
        newTrackPosition: player.trackPosition,
      },
    });

  } catch (error) {
    console.error('🐺 Errore risposta trivia:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'invio della risposta' },
      { status: 500 }
    );
  }
}
