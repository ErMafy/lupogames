import { NextRequest, NextResponse } from 'next/server';
import { startThermometerGame } from '@/lib/thermometer';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, rounds = 5 } = await request.json();
    const result = await startThermometerGame(roomCode, rounds);
    return NextResponse.json({ success: true, data: { gameType: 'THERMOMETER', ...result } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Errore avvio gioco' }, { status: 400 });
  }
}
