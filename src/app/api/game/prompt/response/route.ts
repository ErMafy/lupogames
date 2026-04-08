// 🐺 LUPO GAMES - API Invia Risposta Prompt
// Dove i giocatori sfoggiano la loro creatività

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAllPlayersCompleted } from '@/lib/server-utils';
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

    // Crea o aggiorna la risposta
    const existingResponse = promptRound.responses.find((r: { playerId: string }) => r.playerId === playerId);
    
    if (existingResponse) {
      await prisma.promptResponse.update({
        where: { id: existingResponse.id },
        data: { response: response.trim() },
      });
    } else {
      await prisma.promptResponse.create({
        data: {
          playerId,
          promptRoundId: roundId,
          response: response.trim(),
        },
      });
    }

    // Notifica che qualcuno ha risposto
    await sendToRoom(roomCode, 'player-responded', {
      gameType: 'CONTINUE_PHRASE',
      playerId,
      totalResponses: promptRound.responses.length + (existingResponse ? 0 : 1),
      totalPlayers: room.players.length,
    });

    // 🚀 AUTO-ADVANCE: Controlla se tutti hanno scritto
    const allCompleted = await checkAllPlayersCompleted(
      roomCode,
      'PROMPT',
      roundId,
      'write'
    );

    if (allCompleted) {
      console.log(`🐺 Tutti hanno scritto! Avvio fase di voto...`);
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
