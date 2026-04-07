// 🐺 LUPO GAMES - API Termina Gioco
// Quando l'Host dice "basta", si torna in lobby!

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

// POST /api/game/end - Termina il gioco e torna in lobby
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode } = body;

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { 
        players: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Stanza non trovata' },
        { status: 404 }
      );
    }

    // Prepara classifica finale
    const finalScores = room.players.map((p: { id: string; name: string; avatar: string | null; avatarColor: string | null; score: number; trackPosition: number }, index: number) => ({
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      avatarColor: p.avatarColor,
      score: p.score,
      trackPosition: p.trackPosition,
      rank: index + 1,
    }));

    // Riporta la stanza in LOBBY
    await prisma.$transaction([
      prisma.room.update({
        where: { id: room.id },
        data: {
          status: 'LOBBY',
          currentGame: null,
          currentRound: 0,
        },
      }),
      prisma.gameState.update({
        where: { roomId: room.id },
        data: {
          state: {},
          currentRound: 0,
          totalRounds: 10,
          timerEndsAt: null,
        },
      }),
    ]);

    // Notifica tutti
    await sendToRoom(roomCode, 'game-ended', {
      reason: 'host_ended',
      finalScores,
    });

    console.log(`🐺 Gioco terminato nella stanza ${roomCode}`);

    return NextResponse.json({
      success: true,
      data: {
        finalScores,
      },
    });

  } catch (error) {
    console.error('🐺 Errore terminazione gioco:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel terminare il gioco' },
      { status: 500 }
    );
  }
}
