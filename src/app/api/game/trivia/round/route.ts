import { NextRequest, NextResponse } from 'next/server';
import { advanceTriviaRound } from '@/lib/trivia-advance';

/** Mantenuto per compatibilità: avanza al round successivo (stessa logica del tick / risposta completa) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode } = body;
    const result = await advanceTriviaRound(roomCode);
    return NextResponse.json({
      success: true,
      data: { gameEnded: result.gameEnded },
    });
  } catch (error) {
    console.error('🐺 Errore round trivia:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel round' },
      { status: 500 }
    );
  }
}
