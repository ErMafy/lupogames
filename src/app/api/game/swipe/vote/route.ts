import { NextRequest, NextResponse } from 'next/server';
import { handleSwipeVote } from '@/lib/swipe-trash';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, playerId, roundId, vote } = await request.json();
    await handleSwipeVote(roomCode, playerId, roundId, vote);
    return NextResponse.json({ success: true, data: { voted: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
