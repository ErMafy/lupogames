// 🐺 LUPO GAMES - API Vota Chi è Stato
// Indovina chi ha scritto il segreto!

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
      include: { secret: true },
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

    const isCorrect = suspectedPlayerId === secretRound.secret.playerId;
    const points = isCorrect ? 200 : 0;

    // Atomic upsert + score in transaction
    await prisma.$transaction(async (tx) => {
      const existing = await tx.secretVote.findUnique({
        where: { playerId_secretRoundId: { playerId, secretRoundId: roundId } },
      });

      if (existing) {
        await tx.secretVote.update({
          where: { id: existing.id },
          data: { suspectedPlayerId, isCorrect, pointsEarned: points },
        });
      } else {
        await tx.secretVote.create({
          data: { playerId, secretRoundId: roundId, suspectedPlayerId, isCorrect, pointsEarned: points },
        });
        if (points > 0) {
          await tx.player.update({
            where: { id: playerId },
            data: { score: { increment: points } },
          });
        }
      }
    });

    // Auto-advance: use active player count (those who submitted secrets)
    const [voteCount, activePlayerCount] = await Promise.all([
      prisma.secretVote.count({ where: { secretRoundId: roundId } }),
      prisma.secret.count({ where: { player: { roomId: room.id } } }),
    ]);

    // Eligible voters = active players - 1 (secret owner can't vote)
    const eligibleVoters = Math.max(1, activePlayerCount - 1);
    if (voteCount >= eligibleVoters) {
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
