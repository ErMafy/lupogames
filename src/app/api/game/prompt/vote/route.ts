// 🐺 LUPO GAMES - API Vota Risposta Prompt
// Dove le risposte migliori vincono (e le peggiori vengono derise)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { showPromptRoundResults } from '@/lib/prompt-round';

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
      include: { responses: true },
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

    // Atomic upsert
    await prisma.promptVote.upsert({
      where: { playerId_promptRoundId: { playerId, promptRoundId: roundId } },
      create: { playerId, promptRoundId: roundId, responseId },
      update: { responseId },
    });

    // Auto-advance: count active participants (those who wrote a response)
    const [voteCount, activePlayerCount] = await Promise.all([
      prisma.promptVote.count({ where: { promptRoundId: roundId } }),
      prisma.promptResponse.count({ where: { promptRoundId: roundId } }),
    ]);

    if (activePlayerCount > 0 && voteCount >= activePlayerCount) {
      await showPromptRoundResults(roomCode, roundId, room.id);
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
