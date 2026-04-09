import { NextRequest, NextResponse } from 'next/server';
import { handleHerdAnswer } from '@/lib/herd-mind';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, playerId, roundId, answer } = await request.json();
    await handleHerdAnswer(roomCode, playerId, roundId, answer);
    return NextResponse.json({ success: true, data: { submitted: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
