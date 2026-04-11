import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/game/tick/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/game/tick', () => {
  it('400 se manca il codice stanza', async () => {
    const req = new NextRequest('http://localhost/api/game/tick');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.success).toBe(false);
  });

  it('idle se stanza non in PLAYING o senza timer', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'r1',
      status: 'LOBBY',
      currentGame: null,
      gameState: null,
    });
    const req = new NextRequest('http://localhost/api/game/tick?code=ABCD');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.action).toBe('idle');
  });
});
