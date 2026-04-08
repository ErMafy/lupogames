// 🐺 LUPO GAMES - API Invia Risposta Prompt
// Dove i giocatori sfoggiano la loro creatività

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { startPromptVotingPhase } from '@/lib/prompt-round';

// POST /api/game/prompt/response - Invia una risposta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, response } = body;

    if (!response || response.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: 'La risposta non può essere vuota!' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Stanza non trovata' },
        { status: 404 }
      );
    }

    // Verifica che il round esista
    const promptRound = await prisma.promptRound.findUnique({
      where: { id: roundId },
      include: { responses: true },
    });

    if (!promptRound || promptRound.phase !== 'WRITING') {
      return NextResponse.json(
        { success: false, error: 'Round non valido o fase sbagliata' },
        { status: 400 }
      );
    }

    // Crea o aggiorna la risposta + count in one transaction
    const existingResponse = promptRound.responses.find((r: { playerId: string }) => r.playerId === playerId);

    const responseCount = await prisma.$transaction(async (tx) => {
      if (existingResponse) {
        await tx.promptResponse.update({
          where: { id: existingResponse.id },
          data: { response: response.trim() },
        });
      } else {
        await tx.promptResponse.create({
          data: {
            playerId,
            promptRoundId: roundId,
            response: response.trim(),
          },
        });
      }
      return tx.promptResponse.count({ where: { promptRoundId: roundId } });
    });

    await sendToRoom(roomCode, 'player-responded', {
      gameType: 'CONTINUE_PHRASE',
      playerId,
      totalResponses: responseCount,
      totalPlayers: room.players.length,
    });

    if (responseCount >= room.players.length) {
      await startPromptVotingPhase(roomCode, roundId, room.id);
    }

    return NextResponse.json({
      success: true,
      data: { submitted: true },
    });

  } catch (error) {
    console.error('🐺 Errore invio risposta prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'invio della risposta' },
      { status: 500 }
    );
  }
}
