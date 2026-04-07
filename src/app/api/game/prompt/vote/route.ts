// 🐺 LUPO GAMES - API Vota Risposta Prompt
// Dove le risposte migliori vincono (e le peggiori vengono derise)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { checkAllPlayersCompleted } from '@/lib/server-utils';

// POST /api/game/prompt/vote - Vota una risposta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, responseId } = body;

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

    const promptRound = await prisma.promptRound.findUnique({
      where: { id: roundId },
      include: { responses: true, votes: true },
    });

    if (!promptRound || promptRound.phase !== 'VOTING') {
      return NextResponse.json(
        { success: false, error: 'Non è il momento di votare!' },
        { status: 400 }
      );
    }

    // Verifica che non stia votando la propria risposta
    const votedResponse = promptRound.responses.find((r: { id: string; playerId: string }) => r.id === responseId);
    if (votedResponse?.playerId === playerId) {
      return NextResponse.json(
        { success: false, error: 'Non puoi votare la tua risposta, furbetto!' },
        { status: 400 }
      );
    }

    // Crea o aggiorna il voto
    const existingVote = promptRound.votes.find((v: { playerId: string }) => v.playerId === playerId);
    
    if (existingVote) {
      await prisma.promptVote.update({
        where: { id: existingVote.id },
        data: { responseId },
      });
    } else {
      await prisma.promptVote.create({
        data: {
          playerId,
          promptRoundId: roundId,
          responseId,
        },
      });
    }

    // 🚀 AUTO-ADVANCE: Controlla se tutti hanno votato
    const allCompleted = await checkAllPlayersCompleted(
      roomCode,
      'PROMPT',
      roundId,
      'vote'
    );

    if (allCompleted) {
      console.log(`🐺 Tutti hanno votato! Mostrando risultati...`);
      await showResults(roomCode, roundId, room.id);
    }

    return NextResponse.json({
      success: true,
      data: { voted: true },
    });

  } catch (error) {
    console.error('🐺 Errore voto prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel voto' },
      { status: 500 }
    );
  }
}

// Mostra i risultati del round
async function showResults(roomCode: string, roundId: string, roomId: string) {
  const responses = await prisma.promptResponse.findMany({
    where: { promptRoundId: roundId },
    include: { 
      player: true, 
      votes: true,
    },
  });

  // Calcola i punti (100 per ogni voto ricevuto)
  const results = await Promise.all(responses.map(async (r: { id: string; response: string; playerId: string; player: { name: string; avatar: string | null }; votes: unknown[] }) => {
    const points = r.votes.length * 100;
    
    // Aggiorna i punti del giocatore
    await prisma.$transaction([
      prisma.promptResponse.update({
        where: { id: r.id },
        data: { 
          voteCount: r.votes.length,
          pointsEarned: points,
        },
      }),
      prisma.player.update({
        where: { id: r.playerId },
        data: { score: { increment: points } },
      }),
    ]);

    return {
      responseId: r.id,
      response: r.response,
      playerId: r.playerId,
      playerName: r.player.name,
      avatar: r.player.avatar,
      voteCount: r.votes.length,
      pointsEarned: points,
    };
  }));

  // Ordina per voti
  results.sort((a, b) => b.voteCount - a.voteCount);

  // Aggiorna la fase
  await prisma.promptRound.update({
    where: { id: roundId },
    data: { phase: 'RESULTS', endedAt: new Date() },
  });

  // Invia i risultati
  await sendToRoom(roomCode, 'round-results', {
    gameType: 'CONTINUE_PHRASE',
    results,
    winner: results[0],
  });

  console.log(`🐺 Risultati: Vincitore ${results[0]?.playerName} con ${results[0]?.voteCount} voti`);
}
