import { NextRequest, NextResponse } from 'next/server';
import { handleSplitWrite, handleSplitVote } from '@/lib/split-room';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, action } = body;

    if (action === 'write') {
      await handleSplitWrite(roomCode, playerId, roundId, body.completion);
    } else if (action === 'vote') {
      await handleSplitVote(roomCode, playerId, roundId, body.vote);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { done: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
