import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/game/end/route';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

describe('POST /api/game/end', () => {
  it('termina partita e notifica', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'room1',
      code: 'ABCD',
      players: [
        {
          id: 'p1',
          name: 'A',
          avatar: null,
          avatarColor: null,
          score: 10,
          trackPosition: 0,
        },
      ],
    } as never);

    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const res = await POST(
      new NextRequest('http://localhost/api/game/end', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data.finalScores)).toBe(true);
    expect(sendToRoom).toHaveBeenCalled();
  });
});
