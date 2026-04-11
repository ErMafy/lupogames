import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/game/chameleon/context/route';
import { POST as postAction } from '@/app/api/game/chameleon/action/route';
import * as chameleonLib from '@/lib/chameleon';

describe('Chameleon API', () => {
  it('GET /context400 senza code', async () => {
    const res = await GET(new NextRequest('http://localhost/api/game/chameleon/context'));
    expect(res.status).toBe(400);
  });

  it('POST /action 400 azione non valida', async () => {
    const res = await postAction(
      new NextRequest('http://localhost/api/game/chameleon/action', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          action: 'dance',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /chameleon avvio delegato a startChameleonGame', async () => {
    const spy = vi.spyOn(chameleonLib, 'startChameleonGame').mockResolvedValue({ roundId: 'rx' });
    const { POST: postStart } = await import('@/app/api/game/chameleon/route');
    const res = await postStart(
      new NextRequest('http://localhost/api/game/chameleon', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD', rounds: 3 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.gameType).toBe('CHAMELEON');
    spy.mockRestore();
  });
});
