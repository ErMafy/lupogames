import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as tribunalPost } from '@/app/api/game/tribunal/action/route';
import { POST as splitPost } from '@/app/api/game/split/action/route';
import { POST as interviewPost } from '@/app/api/game/interview/action/route';

describe('Validazione azioni giochi (400 prima di Prisma)', () => {
  it('tribunal: action non valida', async () => {
    const res = await tribunalPost(
      new NextRequest('http://localhost/api/game/tribunal/action', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          action: 'appeal',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('split: action non valida', async () => {
    const res = await splitPost(
      new NextRequest('http://localhost/api/game/split/action', {
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

  it('interview: action non valida', async () => {
    const res = await interviewPost(
      new NextRequest('http://localhost/api/game/interview/action', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: 'ABCD',
          playerId: 'p1',
          roundId: 'r1',
          action: 'sing',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});
