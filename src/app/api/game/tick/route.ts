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
import { forceSwipeTimeout, advanceSwipeTrash } from '@/lib/swipe-trash';
import { forceTribunalTimeout, advanceTribunal } from '@/lib/tribunal';
import { advanceBomb } from '@/lib/bomb-game';
import { forceThermometerTimeout, advanceThermometer } from '@/lib/thermometer';
import { forceHerdTimeout, advanceHerdMind } from '@/lib/herd-mind';
import { forceChameleonTimeout, advanceChameleon, checkChameleonEarlyProgress } from '@/lib/chameleon';
import { forceSplitTimeout, advanceSplitRoom } from '@/lib/split-room';
import { advanceInterview } from '@/lib/interview';

async function checkEarlyAdvance(
  game: string | null,
  st: Record<string, unknown>,
  roomId: string,
  code: string,
): Promise<string | null> {
  const roundId = st.currentRoundId as string | undefined;
  if (!roundId) return null;

  if (game === 'CONTINUE_PHRASE') {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    const pr = await prisma.promptRound.findUnique({ where: { id: roundId } });

    if (pr?.phase === 'WRITING' && room) {
      const responseCount = await prisma.promptResponse.count({ where: { promptRoundId: roundId } });
      if (responseCount >= room.players.length) {
        await forcePromptWritingTimeout(code, roundId, roomId);
        return 'prompt_early_voting';
      }
    }

    if (pr?.phase === 'VOTING') {
      const [voteCount, responseCount] = await Promise.all([
        prisma.promptVote.count({ where: { promptRoundId: roundId } }),
        prisma.promptResponse.count({ where: { promptRoundId: roundId } }),
      ]);
      if (responseCount > 0 && voteCount >= responseCount) {
        await forcePromptVotingTimeout(code, roundId, roomId);
        return 'prompt_early_advance';
      }
    }
  }

  if (game === 'WHO_WAS_IT' && st.phase === 'GUESSING') {
    const sr = await prisma.secretRound.findUnique({ where: { id: roundId } });
    if (sr?.phase === 'GUESSING') {
      const [voteCount, activeCount] = await Promise.all([
        prisma.secretVote.count({ where: { secretRoundId: roundId } }),
        prisma.secret.count({ where: { player: { roomId } } }),
      ]);
      const eligible = Math.max(1, activeCount - 1);
      if (voteCount >= eligible) {
        await forceSecretGuessingTimeout(code, roundId, roomId);
        return 'secret_early_advance';
      }
    }
  }

  if (game === 'CHAMELEON') {
    const ch = await checkChameleonEarlyProgress(code);
    if (ch) return ch;
  }

  return null;
}

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
    const game = room.currentGame;
    const gs = room.gameState;
    const st = (gs.state || {}) as Record<string, unknown>;
    const timerExpired = room.gameState.timerEndsAt.getTime() <= now;

    // Early check: if all players voted, advance even before timer expires
    if (!timerExpired) {
      const earlyResult = await checkEarlyAdvance(game, st, room.id, code);
      if (earlyResult) {
        return NextResponse.json({ success: true, data: { action: earlyResult } });
      }
      return NextResponse.json({ success: true, data: { action: 'idle' } });
    }

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
        // tryAdvancePromptIfCooldownDone now advances even without promptAdvanceAt
        await tryAdvancePromptIfCooldownDone(code);
        return NextResponse.json({ success: true, data: { action: 'prompt_next' } });
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

    // === NEW GAMES: generic round-based timeout handling ===
    const roundId = st.currentRoundId as string | undefined;
    const newGameTypes = ['SWIPE_TRASH', 'TRIBUNAL', 'BOMB', 'THERMOMETER', 'HERD_MIND', 'CHAMELEON', 'SPLIT_ROOM', 'INTERVIEW'] as const;
    if (game && newGameTypes.includes(game as any)) {
      if (roundId) {
        const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
        if (gr && gr.phase !== 'RESULTS') {
          // Force timeout for active phases
          if (game === 'SWIPE_TRASH') await forceSwipeTimeout(code, roundId, room.id);
          if (game === 'TRIBUNAL') await forceTribunalTimeout(code, roundId, room.id);
          if (game === 'BOMB') { await advanceBomb(code); return NextResponse.json({ success: true, data: { action: 'bomb_tick' } }); }
          if (game === 'THERMOMETER') await forceThermometerTimeout(code, roundId, room.id);
          if (game === 'HERD_MIND') await forceHerdTimeout(code, roundId, room.id);
          if (game === 'CHAMELEON') await forceChameleonTimeout(code, roundId, room.id);
          if (game === 'SPLIT_ROOM') await forceSplitTimeout(code, roundId, room.id);
          if (game === 'INTERVIEW') { await advanceInterview(code); return NextResponse.json({ success: true, data: { action: 'interview_tick' } }); }
          return NextResponse.json({ success: true, data: { action: `${game}_timeout` } });
        }
      }
      // Advance to next round if in RESULTS
      if (game === 'SWIPE_TRASH') await advanceSwipeTrash(code);
      if (game === 'TRIBUNAL') await advanceTribunal(code);
      if (game === 'BOMB') await advanceBomb(code);
      if (game === 'THERMOMETER') await advanceThermometer(code);
      if (game === 'HERD_MIND') await advanceHerdMind(code);
      if (game === 'CHAMELEON') await advanceChameleon(code);
      if (game === 'SPLIT_ROOM') await advanceSplitRoom(code);
      if (game === 'INTERVIEW') await advanceInterview(code);
      return NextResponse.json({ success: true, data: { action: `${game}_advanced` } });
    }

    return NextResponse.json({ success: true, data: { action: 'idle' } });
  } catch (e) {
    console.error('game/tick', e);
    return NextResponse.json({ success: false, error: 'tick' }, { status: 500 });
  }
}
