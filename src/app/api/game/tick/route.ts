import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { advanceTriviaRound } from '@/lib/trivia-advance';
import {
  forcePromptWritingTimeout,
  forcePromptVotingTimeout,
  tryAdvancePromptIfCooldownDone,
} from '@/lib/prompt-round';
import {
  forceSecretCollectingTimeout,
  forceSecretGuessingTimeout,
  advanceSecretAfterReveal,
} from '@/lib/secret-game';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: 'Codice mancante' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { gameState: true },
    });

    if (!room || room.status !== 'PLAYING' || !room.gameState?.timerEndsAt) {
      return NextResponse.json({ success: true, data: { action: 'idle' } });
    }

    const now = Date.now();
    if (room.gameState.timerEndsAt.getTime() > now) {
      return NextResponse.json({ success: true, data: { action: 'idle' } });
    }

    const game = room.currentGame;
    const gs = room.gameState;
    const st = (gs.state || {}) as Record<string, unknown>;

    if (game === 'TRIVIA') {
      await advanceTriviaRound(code);
      return NextResponse.json({ success: true, data: { action: 'trivia_advanced' } });
    }

    if (game === 'CONTINUE_PHRASE') {
      const roundId = st.currentRoundId as string | undefined;
      if (!roundId) {
        return NextResponse.json({ success: true, data: { action: 'idle' } });
      }

      const pr = await prisma.promptRound.findUnique({ where: { id: roundId } });
      if (!pr) {
        return NextResponse.json({ success: true, data: { action: 'idle' } });
      }

      if (pr.phase === 'RESULTS') {
        const advanced = await tryAdvancePromptIfCooldownDone(code);
        return NextResponse.json({
          success: true,
          data: { action: advanced ? 'prompt_next' : 'idle' },
        });
      }

      if (pr.phase === 'VOTING') {
        await forcePromptVotingTimeout(code, roundId, room.id);
        return NextResponse.json({ success: true, data: { action: 'prompt_results' } });
      }

      if (pr.phase === 'WRITING') {
        await forcePromptWritingTimeout(code, roundId, room.id);
        return NextResponse.json({ success: true, data: { action: 'prompt_voting' } });
      }
    }

    if (game === 'WHO_WAS_IT') {
      const phase = st.phase as string | undefined;

      if (phase === 'COLLECTING') {
        await forceSecretCollectingTimeout(code, room.id);
        return NextResponse.json({ success: true, data: { action: 'secret_guess' } });
      }

      if (phase === 'GUESSING') {
        const rid = st.currentRoundId as string | undefined;
        if (rid) {
          await forceSecretGuessingTimeout(code, rid, room.id);
        }
        return NextResponse.json({ success: true, data: { action: 'secret_reveal' } });
      }

      if (phase === 'REVEAL') {
        await advanceSecretAfterReveal(code);
        return NextResponse.json({ success: true, data: { action: 'secret_next' } });
      }
    }

    return NextResponse.json({ success: true, data: { action: 'idle' } });
  } catch (e) {
    console.error('game/tick', e);
    return NextResponse.json({ success: false, error: 'tick' }, { status: 500 });
  }
}
