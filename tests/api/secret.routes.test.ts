import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as submitSecret } from '@/app/api/game/secret/submit/route';
import { POST as voteSecret } from '@/app/api/game/secret/vote/route';
import { prisma } from '@/lib/prisma';

describe('Secret game API', () => {
  it('submit: 400 segreto troppo corto', async () => {
    const res = await submitSecret(
      new NextRequest('http://localhost/api/game/secret/submit', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', playerId: 'p1', secret: 'ciao' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    expect(prisma.room.findUnique).not.toHaveBeenCalled();
  });

  it('vote: 404 stanza inesistente', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await voteSecret(
      new NextRequest('http://localhost/api/game/secret/vote', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          suspectedPlayerId: 'p2',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });
});
