import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/rooms/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/rooms', () => {
  it('400 senza codice', async () => {
    const res = await GET(new NextRequest('http://localhost/api/rooms'));
    expect(res.status).toBe(400);
  });

  it('404 se stanza inesistente', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/rooms?code=ZZZZ'));
    expect(res.status).toBe(404);
  });

  it('200 con dati stanza', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'r1',
      code: 'ABCD',
      status: 'LOBBY',
      currentGame: null,
      players: [{ id: 'p1', name: 'A', avatar: null, avatarColor: null, isHost: true, isConnected: true, score: 0, trackPosition: 0 }],
      maxPlayers: 15,
    });
    const res = await GET(new NextRequest('http://localhost/api/rooms?code=ABCD'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.players).toHaveLength(1);
  });
});

describe('POST /api/rooms', () => {
  it('400 se nome host troppo corto', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ hostName: 'x' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('201/200 crea stanza con transazione', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.room.create).mockResolvedValue({
      id: 'room1',
      code: 'WXYZ',
      status: 'LOBBY',
    });
    vi.mocked(prisma.player.create).mockResolvedValue({
      id: 'host1',
      name: 'Hostino',
      avatar: 'Lupo',
      avatarColor: '#FF6B6B',
    });
    vi.mocked(prisma.room.update).mockResolvedValue({});
    vi.mocked(prisma.gameState.create).mockResolvedValue({});

    const res = await POST(
      new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ hostName: 'Hostino' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.hostPlayer.name).toBe('Hostino');
  });
});
