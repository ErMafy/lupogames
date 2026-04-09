import { NextRequest, NextResponse } from 'next/server';
import { startSwipeTrashGame } from '@/lib/swipe-trash';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startSwipeTrashGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'SWIPE_TRASH', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
