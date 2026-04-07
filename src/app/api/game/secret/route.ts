// 🐺 LUPO GAMES - API Chi è Stato?
// Il gioco dei segreti imbarazzanti

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

// POST /api/game/secret - Inizia una partita "Chi è Stato?"
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

    if (room.players.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Servono almeno 3 giocatori per Chi è Stato!' },
        { status: 400 }
      );
    }

    // Aggiorna lo stato della stanza - Fase raccolta segreti
    await prisma.$transaction([
      prisma.room.update({
        where: { id: room.id },
        data: {
          status: 'PLAYING',
          currentGame: 'WHO_WAS_IT',
          currentRound: 0,
        },
      }),
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {
            phase: 'COLLECTING',
            totalRounds: Math.min(rounds, room.players.length),
          },
          totalRounds: Math.min(rounds, room.players.length),
          currentRound: 0,
          timerEndsAt: new Date(Date.now() + 90000), // 90 secondi per scrivere segreti
        },
      }),
      // Elimina vecchi segreti della stanza
      prisma.secret.deleteMany({
        where: { player: { roomId: room.id } },
      }),
    ]);

    // Notifica tutti
    await sendToRoom(roomCode, 'game-started', {
      gameType: 'WHO_WAS_IT',
      totalRounds: Math.min(rounds, room.players.length),
      playerCount: room.players.length,
    });

    // Chiedi a tutti di scrivere un segreto
    await sendToRoom(roomCode, 'phase-changed', {
      gameType: 'WHO_WAS_IT',
      phase: 'COLLECTING',
      data: {
        instruction: 'Scrivi un segreto o un aneddoto imbarazzante su di te!',
        timeLimit: 90,
      },
    });

    console.log(`🐺 Chi è Stato iniziato - Raccolta segreti`);

    return NextResponse.json({
      success: true,
      data: {
        gameType: 'WHO_WAS_IT',
        phase: 'COLLECTING',
        totalRounds: Math.min(rounds, room.players.length),
        instruction: 'Scrivi un segreto o un aneddoto imbarazzante su di te!',
      },
    });

  } catch (error) {
    console.error('🐺 Errore avvio Chi è Stato:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'avvio del gioco' },
      { status: 500 }
    );
  }
}
