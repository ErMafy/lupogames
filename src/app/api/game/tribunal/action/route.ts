import { NextRequest, NextResponse } from 'next/server';
import { handleAccusation, handleDefense, handleVerdict } from '@/lib/tribunal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, action } = body;

    if (action === 'accuse') {
      await handleAccusation(roomCode, playerId, roundId, body.accusedPlayerId);
    } else if (action === 'defense') {
      await handleDefense(roomCode, playerId, roundId, body.defense);
    } else if (action === 'verdict') {
      await handleVerdict(roomCode, playerId, roundId, body.verdict);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { done: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
