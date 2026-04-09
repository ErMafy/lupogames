import { NextRequest, NextResponse } from 'next/server';
import { startSplitRoomGame } from '@/lib/split-room';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startSplitRoomGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'SPLIT_ROOM', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
