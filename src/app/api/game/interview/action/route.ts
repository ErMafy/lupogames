import { NextRequest, NextResponse } from 'next/server';
import { handleInterviewCollect, handleInterviewBuild, handleInterviewVote } from '@/lib/interview';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, roundId, action } = body;

    if (action === 'collect') {
      await handleInterviewCollect(roomCode, playerId, roundId, body.answers);
    } else if (action === 'build') {
      await handleInterviewBuild(roomCode, playerId, roundId, body.sentence);
    } else if (action === 'vote') {
      await handleInterviewVote(roomCode, playerId, roundId, body.votedPlayerId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { done: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
