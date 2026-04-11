import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/game/trivia/route';
import { prisma } from '@/lib/prisma';

describe('POST /api/game/trivia', () => {
  it('404 stanza inesistente', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/game/trivia', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ZZZZ', rounds: 3 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });
});
