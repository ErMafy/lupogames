import { NextRequest, NextResponse } from 'next/server';
import { startTribunalGame } from '@/lib/tribunal';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startTribunalGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'TRIBUNAL', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
