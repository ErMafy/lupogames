import { NextRequest, NextResponse } from 'next/server';
import { startInterviewGame } from '@/lib/interview';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 3 } = await request.json();
    const result = await startInterviewGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'INTERVIEW', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
