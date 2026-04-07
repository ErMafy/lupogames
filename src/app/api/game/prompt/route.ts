// 🐺 LUPO GAMES - API Continua la Frase
// Dove la creatività incontra l'imbarazzo

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';

// POST /api/game/prompt - Inizia una partita "Continua la Frase"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, rounds = 5 } = body;

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
        { success: false, error: 'Servono almeno 2 giocatori!' },
        { status: 400 }
      );
    }

    // Pesca frasi random
    const phrases = await prisma.promptPhrase.findMany({
      take: rounds * 2,
      orderBy: { timesUsed: 'asc' },
    });

    if (phrases.length < rounds) {
      return NextResponse.json(
        { success: false, error: 'Non ci sono abbastanza frasi nel database!' },
        { status: 400 }
      );
    }

    const selectedPhrases = pickRandom(phrases, rounds);
    const firstPhrase = selectedPhrases[0];

    // Crea il primo round
    const promptRound = await prisma.promptRound.create({
      data: {
        roomId: room.id,
        phraseId: firstPhrase.id,
        roundNumber: 1,
        phase: 'WRITING',
      },
    });

    // Aggiorna lo stato della stanza
    await prisma.$transaction([
      prisma.room.update({
        where: { id: room.id },
        data: {
          status: 'PLAYING',
          currentGame: 'CONTINUE_PHRASE',
          currentRound: 1,
        },
      }),
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {
            phraseIds: selectedPhrases.map(p => p.id),
            currentPhraseIndex: 1,
            currentRoundId: promptRound.id,
          },
          totalRounds: rounds,
          currentRound: 1,
          timerEndsAt: new Date(Date.now() + 60000), // 60 secondi per scrivere
        },
      }),
      prisma.promptPhrase.update({
        where: { id: firstPhrase.id },
        data: { timesUsed: { increment: 1 } },
      }),
    ]);

    // Notifica tutti
    await sendToRoom(roomCode, 'game-started', {
      gameType: 'CONTINUE_PHRASE',
      totalRounds: rounds,
      playerCount: room.players.length,
    });

    // Invia la prima frase
    await sendToRoom(roomCode, 'round-started', {
      roundNumber: 1,
      totalRounds: rounds,
      gameType: 'CONTINUE_PHRASE',
      phase: 'WRITING',
      data: {
        phraseId: firstPhrase.id,
        phrase: firstPhrase.phrase,
        timeLimit: 60,
        roundId: promptRound.id,
      },
    });

    console.log(`🐺 Continua la Frase iniziato: "${firstPhrase.phrase}"`);

    return NextResponse.json({
      success: true,
      data: {
        gameType: 'CONTINUE_PHRASE',
        totalRounds: rounds,
        currentRound: 1,
        phrase: {
          id: firstPhrase.id,
          phrase: firstPhrase.phrase,
        },
        roundId: promptRound.id,
      },
    });

  } catch (error) {
    console.error('🐺 Errore avvio Continua la Frase:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'avvio del gioco' },
      { status: 500 }
    );
  }
}
