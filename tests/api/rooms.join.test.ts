import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/rooms/join/route';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

describe('POST /api/rooms/join', () => {
  it('400 codice non valido', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'AB', playerName: 'Luigi' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('404 stanza inesistente', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', playerName: 'Luigi' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('400 se partita già iniziata', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'r1',
      code: 'ABCD',
      status: 'PLAYING',
      maxPlayers: 15,
      players: [],
    });
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', playerName: 'Luigi' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('200 join in lobby', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'r1',
      code: 'ABCD',
      status: 'LOBBY',
      maxPlayers: 15,
      players: [],
    });
    vi.mocked(prisma.player.create).mockResolvedValue({
      id: 'pnew',
      name: 'Luigi',
      isHost: false,
    });
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', playerName: 'Luigi' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    expect(sendToRoom).toHaveBeenCalled();
  });
});
