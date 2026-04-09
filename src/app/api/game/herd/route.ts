import { NextRequest, NextResponse } from 'next/server';
import { startHerdMindGame } from '@/lib/herd-mind';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startHerdMindGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'HERD_MIND', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
