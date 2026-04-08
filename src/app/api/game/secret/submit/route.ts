// 🐺 LUPO GAMES - API Invia Segreto
// Dove i giocatori confessano le loro vergogne

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { checkAllPlayersCompleted } from '@/lib/server-utils';
import { startGuessingRound } from '@/lib/secret-game';

// POST /api/game/secret/submit - Invia un segreto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, secret } = body;

    if (!secret || secret.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Il segreto deve avere almeno 5 caratteri!' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true, gameState: true },
    });

    if (!room || room.currentGame !== 'WHO_WAS_IT') {
      return NextResponse.json(
        { success: false, error: 'Partita non valida' },
        { status: 400 }
      );
    }

    // Crea o aggiorna il segreto
    const existingSecret = await prisma.secret.findFirst({
      where: { playerId },
    });

    if (existingSecret) {
      await prisma.secret.update({
        where: { id: existingSecret.id },
        data: { content: secret.trim() },
      });
    } else {
      await prisma.secret.create({
        data: {
          playerId,
          content: secret.trim(),
        },
      });
    }

    // Conta quanti segreti sono stati inviati
    const secretCount = await prisma.secret.count({
      where: { player: { roomId: room.id } },
    });

    // Notifica progresso
    await sendToRoom(roomCode, 'player-submitted-secret', {
      gameType: 'WHO_WAS_IT',
      playerId,
      totalSecrets: secretCount,
      totalPlayers: room.players.length,
    });

    // 🚀 AUTO-ADVANCE: Se tutti hanno inviato, inizia il primo round
    const allCompleted = secretCount >= room.players.length;
    if (allCompleted) {
      console.log(`🐺 Tutti hanno inviato il segreto! Iniziando round di indovinelli...`);
      await startGuessingRound(roomCode, room.id, 1);
    }

    return NextResponse.json({
      success: true,
      data: { submitted: true },
    });

  } catch (error) {
    console.error('🐺 Errore invio segreto:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'invio del segreto' },
      { status: 500 }
    );
  }
}
