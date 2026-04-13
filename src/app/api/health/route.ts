// GET /api/health — Vercel / monitoring: Neon (Prisma) + variabili Pusher + chiamata API Pusher

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (e) {
    ok = false;
    checks.database = 'error';
    checks.database_detail = e instanceof Error ? e.message : String(e);
  }

  const pusherEnvOk =
    !!process.env.PUSHER_APP_ID &&
    !!process.env.PUSHER_SECRET &&
    !!process.env.NEXT_PUBLIC_PUSHER_KEY &&
    !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  checks.pusher_env = pusherEnvOk ? 'ok' : 'missing';
  if (!pusherEnvOk) {
    ok = false;
  }

  const skipPusherPing =
    process.env.LUPO_SMOKE_API === '1' || process.env.HEALTHCHECK_SKIP_PUSHER === '1';

  if (skipPusherPing) {
    checks.pusher_api = 'skipped';
  } else if (pusherEnvOk) {
    try {
      await (pusherServer as { get: (opts: { path: string; params?: Record<string, string> }) => Promise<unknown> }).get({
        path: '/channels',
        params: { filter_by_prefix: 'presence-' },
      });
      checks.pusher_api = 'ok';
    } catch (e) {
      ok = false;
      checks.pusher_api = 'error';
      checks.pusher_api_detail = e instanceof Error ? e.message : String(e);
    }
  }

  checks.vercel = process.env.VERCEL ? '1' : '0';
  checks.node_env = process.env.NODE_ENV ?? 'unknown';

  return NextResponse.json(
    {
      ok,
      service: 'lupogames',
      checks,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
