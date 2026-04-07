// 🐺 LUPO GAMES - API Vota Chi è Stato
// Indovina chi ha scritto il segreto!

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';
import { checkAllPlayersCompleted } from '@/lib/server-utils';

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
    const existingVote = secretRound.votes.find(v => v.playerId === playerId);
    
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
    const votingPlayers = room.players.filter(p => p.id !== secretRound.secret.playerId);
    const allCompleted = await checkAllPlayersCompleted(
      roomCode,
      'SECRET',
      roundId,
      'vote'
    );

    if (allCompleted) {
      console.log(`🐺 Tutti hanno votato! Mostrando risultati...`);
      await showSecretResults(roomCode, roundId, room.id);
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

// Mostra i risultati del round
async function showSecretResults(roomCode: string, roundId: string, roomId: string) {
  const secretRound = await prisma.secretRound.findUnique({
    where: { id: roundId },
    include: { 
      secret: { include: { player: true } },
      votes: { include: { player: true } },
    },
  });

  if (!secretRound) return;

  // Aggiorna fase
  await prisma.secretRound.update({
    where: { id: roundId },
    data: { phase: 'REVEAL', endedAt: new Date() },
  });

  const results = {
    secret: secretRound.secret.content,
    owner: {
      id: secretRound.secret.player.id,
      name: secretRound.secret.player.name,
      avatar: secretRound.secret.player.avatar,
    },
    votes: secretRound.votes.map(v => ({
      playerId: v.playerId,
      playerName: v.player.name,
      avatar: v.player.avatar,
      guessedCorrectly: v.isCorrect,
      pointsEarned: v.pointsEarned,
    })),
    correctGuesses: secretRound.votes.filter(v => v.isCorrect).length,
    totalVotes: secretRound.votes.length,
  };

  // Invia risultati
  await sendToRoom(roomCode, 'round-results', {
    gameType: 'WHO_WAS_IT',
    results,
  });

  console.log(`🐺 Segreto di ${results.owner.name}: ${results.correctGuesses}/${results.totalVotes} hanno indovinato`);

  // Dopo 5 secondi, inizia il prossimo round o termina
  setTimeout(async () => {
    const gameState = await prisma.gameState.findUnique({
      where: { roomId },
    });
    
    if (!gameState) return;

    const state = gameState.state as { totalRounds?: number };
    const nextRound = secretRound.roundNumber + 1;

    if (nextRound > (state.totalRounds || 5)) {
      // Fine gioco
      const players = await prisma.player.findMany({
        where: { roomId },
        orderBy: { score: 'desc' },
      });

      await sendToRoom(roomCode, 'game-ended', {
        gameType: 'WHO_WAS_IT',
        finalScores: players.map((p, i) => ({
          rank: i + 1,
          playerId: p.id,
          playerName: p.name,
          avatar: p.avatar,
          score: p.score,
        })),
      });
    } else {
      // Prossimo round - pesca un altro segreto
      const secrets = await prisma.secret.findMany({
        where: {
          player: { roomId },
          isUsed: false,
        },
        include: { player: true },
      });

      if (secrets.length > 0) {
        const selectedSecret = pickRandom(secrets, 1)[0];

        const newSecretRound = await prisma.secretRound.create({
          data: {
            roomId,
            secretId: selectedSecret.id,
            roundNumber: nextRound,
            phase: 'GUESSING',
          },
        });

        await prisma.$transaction([
          prisma.secret.update({
            where: { id: selectedSecret.id },
            data: { isUsed: true },
          }),
          prisma.room.update({
            where: { id: roomId },
            data: { currentRound: nextRound },
          }),
          prisma.gameState.update({
            where: { roomId },
            data: {
              state: {
                phase: 'GUESSING',
                currentRoundId: newSecretRound.id,
                currentSecretId: selectedSecret.id,
                secretOwnerId: selectedSecret.playerId,
                totalRounds: state.totalRounds,
              },
              currentRound: nextRound,
              timerEndsAt: new Date(Date.now() + 30000),
            },
          }),
        ]);

        const players = await prisma.player.findMany({
          where: { roomId },
          select: { id: true, name: true, avatar: true, avatarColor: true },
        });

        await sendToRoom(roomCode, 'round-started', {
          roundNumber: nextRound,
          gameType: 'WHO_WAS_IT',
          phase: 'GUESSING',
          data: {
            secret: selectedSecret.content,
            roundId: newSecretRound.id,
            players: players.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              avatarColor: p.avatarColor,
            })),
            timeLimit: 30,
          },
        });
      }
    }
  }, 5000);
}
