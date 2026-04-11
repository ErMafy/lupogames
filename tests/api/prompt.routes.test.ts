import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as promptResponse } from '@/app/api/game/prompt/response/route';
import { POST as promptVote } from '@/app/api/game/prompt/vote/route';
import { prisma } from '@/lib/prisma';

describe('Continua la frase — API', () => {
  it('response: 400 risposta vuota', async () => {
    const res = await promptResponse(
      new NextRequest('http://localhost/api/game/prompt/response', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', playerId: 'p1', roundId: 'r1', response: '   ' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    expect(prisma.room.findUnique).not.toHaveBeenCalled();
  });

  it('vote: 404 stanza inesistente', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await promptVote(
      new NextRequest('http://localhost/api/game/prompt/vote', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          responseId: 'x',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });
});
