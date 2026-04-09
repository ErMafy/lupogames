import { NextRequest, NextResponse } from 'next/server';
import { startBombGame } from '@/lib/bomb-game';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startBombGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'BOMB', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
