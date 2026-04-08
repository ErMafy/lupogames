// 🐺 LUPO GAMES - API Vota Chi è Stato
// Indovina chi ha scritto il segreto!

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAllPlayersCompleted } from '@/lib/server-utils';
import { showSecretRoundResults } from '@/lib/secret-game';

// POST /api/game/secret/vote - Vota chi pensi abbia scritto il segreto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, suspectedPlayerId } = body;

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

    const secretRound = await prisma.secretRound.findUnique({
      where: { id: roundId },
      include: { secret: true, votes: true },
    });

    if (!secretRound || secretRound.phase !== 'GUESSING') {
      return NextResponse.json(
        { success: false, error: 'Non è il momento di votare!' },
        { status: 400 }
      );
    }

    // Il proprietario del segreto non può votare
    if (playerId === secretRound.secret.playerId) {
      return NextResponse.json(
        { success: false, error: 'Non puoi votare nel tuo round!' },
        { status: 400 }
      );
    }

    // L'indovinello è corretto?
    const isCorrect = suspectedPlayerId === secretRound.secret.playerId;
    const points = isCorrect ? 200 : 0;

    // Crea o aggiorna il voto
    const existingVote = secretRound.votes.find((v: { playerId: string }) => v.playerId === playerId);
    
    if (existingVote) {
      await prisma.secretVote.update({
        where: { id: existingVote.id },
        data: { 
          suspectedPlayerId,
          isCorrect,
          pointsEarned: points,
        },
      });
    } else {
      await prisma.secretVote.create({
        data: {
          playerId,
          secretRoundId: roundId,
          suspectedPlayerId,
          isCorrect,
          pointsEarned: points,
        },
      });

      // Aggiorna punteggio giocatore
      if (points > 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { increment: points } },
        });
      }
    }

    // 🚀 AUTO-ADVANCE: Controlla se tutti hanno votato (escluso il proprietario del segreto)
    const allCompleted = await checkAllPlayersCompleted(
      roomCode,
      'SECRET',
      roundId,
      'vote'
    );

    if (allCompleted) {
      console.log(`🐺 Tutti hanno votato! Mostrando risultati...`);
      await showSecretRoundResults(roomCode, roundId, room.id);
    }

    return NextResponse.json({
      success: true,
      data: { voted: true, isCorrect },
    });

  } catch (error) {
    console.error('🐺 Errore voto segreto:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel voto' },
      { status: 500 }
    );
  }
}
