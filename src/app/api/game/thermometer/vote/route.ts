import { NextRequest, NextResponse } from 'next/server';
import { handleThermometerVote } from '@/lib/thermometer';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, playerId, roundId, value } = await request.json();
    await handleThermometerVote(roomCode, playerId, roundId, value);
    return NextResponse.json({ success: true, data: { voted: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
