import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as triviaAdvance from '@/lib/trivia-advance';

describe('POST /api/game/trivia/round', () => {
  it('delega a advanceTriviaRound', async () => {
    const spy = vi.spyOn(triviaAdvance, 'advanceTriviaRound').mockResolvedValue({ gameEnded: false });
    const { POST } = await import('@/app/api/game/trivia/round/route');
    const res = await POST(
      new NextRequest('http://localhost/api/game/trivia/round', {
        method: 'POST',
        body: JSON.stringify({ roomCode: 'ABCD' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.gameEnded).toBe(false);
    expect(spy).toHaveBeenCalledWith('ABCD');
    spy.mockRestore();
  });
});
