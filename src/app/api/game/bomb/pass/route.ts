import { NextRequest, NextResponse } from 'next/server';
import { handleBombPass } from '@/lib/bomb-game';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, playerId, roundId, word } = await request.json();
    await handleBombPass(roomCode, playerId, roundId, word);
    return NextResponse.json({ success: true, data: { passed: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
