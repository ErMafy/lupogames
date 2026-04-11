import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const miniGamePosts = [
  { path: '@/app/api/game/swipe/route', name: 'SWIPE_TRASH' },
  { path: '@/app/api/game/bomb/route', name: 'BOMB' },
  { path: '@/app/api/game/thermometer/route', name: 'THERMOMETER' },
  { path: '@/app/api/game/herd/route', name: 'HERD_MIND' },
  { path: '@/app/api/game/tribunal/route', name: 'TRIBUNAL' },
  { path: '@/app/api/game/split/route', name: 'SPLIT_ROOM' },
  { path: '@/app/api/game/interview/route', name: 'INTERVIEW' },
  { path: '@/app/api/game/secret/route', name: 'WHO_WAS_IT' },
] as const;

describe('POST avvio mini-giochi — errore stanza inesistente', () => {
  for (const g of miniGamePosts) {
    it(`${g.name}: stanza mancante (400 da catch o404 diretto)`, async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(null);
      const { POST } = await import(/* @vite-ignore */ g.path);
      const res = await POST(
        new NextRequest('http://localhost/api/x', {
          method: 'POST',
          body: JSON.stringify({ roomCode: 'ZZZZ', rounds: 3 }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect([400, 404]).toContain(res.status);
      const j = await res.json();
      expect(j.success).toBe(false);
    });
  }
});
