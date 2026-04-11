import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/game/sync/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/game/sync', () => {
  it('400 senza codice', async () => {
    const res = await GET(new NextRequest('http://localhost/api/game/sync'));
    expect(res.status).toBe(400);
  });

  it('inGame false se non in partita', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      status: 'LOBBY',
      gameState: null,
      currentGame: null,
    });
    const res = await GET(new NextRequest('http://localhost/api/game/sync?code=ABCD'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.inGame).toBe(false);
  });
});
