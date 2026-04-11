import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/cleanup/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/cleanup', () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    vi.mocked(prisma.room.deleteMany).mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    process.env.CRON_SECRET = prev;
  });

  it('401 senza Bearer corretto', async () => {
    const res = await GET(
      new Request('http://localhost/api/cleanup', {
        headers: { authorization: 'Bearer wrong' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('200 con secret corretto', async () => {
    const res = await GET(
      new Request('http://localhost/api/cleanup', {
        headers: { authorization: 'Bearer test-secret' },
      }),
    );
    expect(res.status).toBe(200);
    expect(prisma.room.deleteMany).toHaveBeenCalled();
  });
});
