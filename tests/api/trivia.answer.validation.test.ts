import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/game/trivia/answer/route';
import { prisma } from '@/lib/prisma';

describe('POST /api/game/trivia/answer', () => {
  it('400 risposta non A-D', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/game/trivia/answer', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          answer: 'Z',
          responseTimeMs: 1000,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    expect(prisma.triviaRound.findUnique).not.toHaveBeenCalled();
  });
});
