import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/rooms/avatar/route';

describe('POST /api/rooms/avatar', () => {
  it('400 dati mancanti', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/avatar', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400 avatar non in lista', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/rooms/avatar', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          avatar: 'DragoAlienoInesistente',
          avatarColor: '#fff',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});
