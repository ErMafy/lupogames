// 🐺 LUPO GAMES - API Invia Segreto
// Dove i giocatori confessano le loro vergogne

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { pickRandom } from '@/lib/utils';
import { checkAllPlayersCompleted } from '@/lib/server-utils';

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

// Inizia un round di indovinello
async function startGuessingRound(roomCode: string, roomId: string, roundNumber: number) {
  // Pesca un segreto non ancora usato
  const secrets = await prisma.secret.findMany({
    where: {
      player: { roomId },
      isUsed: false,
    },
    include: { player: true },
  });

  if (secrets.length === 0) {
    // Tutti i segreti usati - fine gioco
    await endGame(roomCode, roomId);
    return;
  }

  const selectedSecret = (pickRandom(secrets, 1) as { id: string; content: string; playerId: string }[])[0];

  // Crea il round
  const secretRound = await prisma.secretRound.create({
    data: {
      roomId,
      secretId: selectedSecret.id,
      roundNumber,
      phase: 'GUESSING',
    },
  });

  // Marca il segreto come usato
  await prisma.$transaction([
    prisma.secret.update({
      where: { id: selectedSecret.id },
      data: { isUsed: true },
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { currentRound: roundNumber },
    }),
    prisma.gameState.update({
      where: { roomId },
      data: {
        state: {
          phase: 'GUESSING',
          currentRoundId: secretRound.id,
          currentSecretId: selectedSecret.id,
          secretOwnerId: selectedSecret.playerId,
        },
        currentRound: roundNumber,
        timerEndsAt: new Date(Date.now() + 30000), // 30 secondi per votare
      },
    }),
  ]);

  // Carica i giocatori per il voto
  const players = await prisma.player.findMany({
    where: { roomId },
    select: { id: true, name: true, avatar: true, avatarColor: true },
  });

  // Invia il segreto a tutti
  await sendToRoom(roomCode, 'round-started', {
    roundNumber,
    gameType: 'WHO_WAS_IT',
    phase: 'GUESSING',
    data: {
      secret: selectedSecret.content,
      roundId: secretRound.id,
      players: players.map((p: { id: string; name: string; avatar: string | null; avatarColor: string | null }) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        avatarColor: p.avatarColor,
      })),
      timeLimit: 30,
    },
  });

  console.log(`🐺 Chi è Stato Round ${roundNumber}: "${selectedSecret.content.substring(0, 30)}..."`);
}

// Termina il gioco
async function endGame(roomCode: string, roomId: string) {
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
}
