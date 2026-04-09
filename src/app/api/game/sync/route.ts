// GET /api/game/sync?code=XXXX — Stato corrente per client che si connettono dopo gli eventi Pusher

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SyncEvent = { name: string; data: Record<string, unknown> };

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

    if (!room || room.status !== 'PLAYING' || !room.gameState || !room.currentGame) {
      return NextResponse.json({
        success: true,
        data: { inGame: false },
      });
    }

    const gs = room.gameState;
    const state = (gs.state || {}) as Record<string, unknown>;
    const events: SyncEvent[] = [];

    if (room.currentGame === 'TRIVIA') {
      const currentRoundId = state.currentRoundId as string | undefined;
      if (!currentRoundId) {
        return NextResponse.json({ success: true, data: { inGame: false } });
      }

      const tr = await prisma.triviaRound.findUnique({
        where: { id: currentRoundId },
        include: { question: true },
      });
      if (!tr) {
        return NextResponse.json({ success: true, data: { inGame: false } });
      }

      const q = tr.question;
      events.push({
        name: 'game-started',
        data: {
          gameType: 'TRIVIA',
          totalRounds: gs.totalRounds,
        },
      });
      events.push({
        name: 'round-started',
        data: {
          roundNumber: tr.roundNumber,
          totalRounds: gs.totalRounds,
          gameType: 'TRIVIA',
          data: {
            questionId: q.id,
            question: q.question,
            category: q.category,
            options: {
              A: q.optionA,
              B: q.optionB,
              C: q.optionC,
              D: q.optionD,
            },
            timeLimit: 30,
            roundId: tr.id,
          },
        },
      });
    } else if (room.currentGame === 'CONTINUE_PHRASE') {
      const currentRoundId = state.currentRoundId as string | undefined;
      if (!currentRoundId) {
        return NextResponse.json({ success: true, data: { inGame: false } });
      }

      const pr = await prisma.promptRound.findUnique({
        where: { id: currentRoundId },
        include: { phrase: true, responses: true },
      });
      if (!pr) {
        return NextResponse.json({ success: true, data: { inGame: false } });
      }

      events.push({
        name: 'game-started',
        data: {
          gameType: 'CONTINUE_PHRASE',
          totalRounds: gs.totalRounds,
        },
      });

      events.push({
        name: 'round-started',
        data: {
          roundNumber: pr.roundNumber,
          totalRounds: gs.totalRounds,
          gameType: 'CONTINUE_PHRASE',
          phase: 'WRITING',
          data: {
            phraseId: pr.phraseId,
            phrase: pr.phrase.phrase,
            timeLimit: 60,
            roundId: pr.id,
            phase: 'WRITING',
          },
        },
      });

      if (pr.phase === 'VOTING' || pr.phase === 'RESULTS') {
        const shuffled = [...pr.responses]
          .sort(() => Math.random() - 0.5)
          .map((r: { id: string; response: string }) => ({
            id: r.id,
            response: r.response,
          }));
        events.push({
          name: 'phase-changed',
          data: {
            gameType: 'CONTINUE_PHRASE',
            phase: 'VOTING',
            data: {
              responses: shuffled,
              timeLimit: 60,
            },
          },
        });
      }
    } else if (room.currentGame === 'WHO_WAS_IT') {
      const phase = (state.phase as string) || 'COLLECTING';
      const totalRounds = (state.totalRounds as number) || gs.totalRounds;

      events.push({
        name: 'game-started',
        data: {
          gameType: 'WHO_WAS_IT',
          totalRounds,
        },
      });

      if (phase === 'COLLECTING') {
        events.push({
          name: 'phase-changed',
          data: {
            gameType: 'WHO_WAS_IT',
            phase: 'COLLECTING',
            data: {
              instruction: 'Scrivi un segreto o un aneddoto imbarazzante su di te!',
              timeLimit: 60,
            },
          },
        });
      }

      if (phase === 'GUESSING') {
        const srId = state.currentRoundId as string | undefined;
        if (srId) {
          const sr = await prisma.secretRound.findUnique({
            where: { id: srId },
            include: { secret: true },
          });
          if (sr) {
            const players = await prisma.player.findMany({
              where: { roomId: room.id },
              select: { id: true, name: true, avatar: true, avatarColor: true },
            });
            events.push({
              name: 'round-started',
              data: {
                roundNumber: sr.roundNumber,
                gameType: 'WHO_WAS_IT',
                phase: 'GUESSING',
                data: {
                  secret: sr.secret.content,
                  roundId: sr.id,
                  players: players.map((p) => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    avatarColor: p.avatarColor,
                  })),
                  timeLimit: 60,
                },
              },
            });
          }
        }
      }
    } else {
      // Generic sync for all new games (SWIPE_TRASH, TRIBUNAL, BOMB, etc.)
      const currentRoundId = state.currentRoundId as string | undefined;
      const gameType = room.currentGame;

      events.push({
        name: 'game-started',
        data: { gameType, totalRounds: gs.totalRounds },
      });

      if (currentRoundId) {
        const gr = await prisma.gameRound.findUnique({ where: { id: currentRoundId } });
        if (gr) {
          const grState = (gr.state || {}) as Record<string, unknown>;
          const players = await prisma.player.findMany({
            where: { roomId: room.id },
            select: { id: true, name: true, avatar: true },
          });

          const timeLimits: Record<string, number> = {
            SWIPE_TRASH: 20, TRIBUNAL: 30, BOMB: 30, THERMOMETER: 25,
            HERD_MIND: 25, CHAMELEON: 30, SPLIT_ROOM: 30, INTERVIEW: 40,
          };

          events.push({
            name: 'round-started',
            data: {
              roundNumber: gr.roundNumber,
              totalRounds: gs.totalRounds,
              gameType,
              phase: gr.phase,
              data: {
                ...grState,
                roundId: gr.id,
                timeLimit: timeLimits[gameType] || 30,
                players: players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inGame: true,
        events,
      },
    });
  } catch (e) {
    console.error('game/sync:', e);
    return NextResponse.json(
      { success: false, error: 'Errore sync' },
      { status: 500 }
    );
  }
}
