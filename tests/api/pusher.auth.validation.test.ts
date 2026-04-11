import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/pusher/auth/route';

describe('POST /api/pusher/auth', () => {
  it('400 senza socket_id / channel_name', async () => {
    const form = new FormData();
    form.set('playerId', 'p1');
    const res = await POST(
      new Request('http://localhost/api/pusher/auth', {
        method: 'POST',
        body: form,
      }),
    );
    expect(res.status).toBe(400);
  });
});
