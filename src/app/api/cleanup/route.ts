import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CLEANUP_RULES = {
  FINISHED: 1 * 60 * 60 * 1000,    // 1 ora
  LOBBY:    6 * 60 * 60 * 1000,    // 6 ore
  PAUSED:   6 * 60 * 60 * 1000,    // 6 ore
  PLAYING: 12 * 60 * 60 * 1000,    // 12 ore
} as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const deleted: Record<string, number> = {};

  for (const [status, maxAge] of Object.entries(CLEANUP_RULES)) {
    const cutoff = new Date(now - maxAge);

    const result = await prisma.room.deleteMany({
      where: {
        status: status as keyof typeof CLEANUP_RULES,
        updatedAt: { lt: cutoff },
      },
    });

    deleted[status] = result.count;
  }

  const total = Object.values(deleted).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    ok: true,
    deleted,
    total,
    timestamp: new Date().toISOString(),
  });
}
