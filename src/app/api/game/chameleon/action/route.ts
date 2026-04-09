import { NextRequest, NextResponse } from 'next/server';
import { handleChameleonHint, handleChameleonVote } from '@/lib/chameleon';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, action } = body;

    if (action === 'hint') {
      await handleChameleonHint(roomCode, playerId, roundId, body.hint);
    } else if (action === 'vote') {
      await handleChameleonVote(roomCode, playerId, roundId, body.suspectedId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { done: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
