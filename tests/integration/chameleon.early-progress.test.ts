import { describe, it, expect, vi } from 'vitest';
import { checkChameleonEarlyProgress } from '@/lib/chameleon';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

describe('checkChameleonEarlyProgress', () => {
  it('null se non è partita CHAMELEON', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'room1',
      currentGame: 'TRIBUNAL',
      gameState: { state: { currentRoundId: 'r1' } },
    } as never);
    const r = await checkChameleonEarlyProgress('ABCD');
    expect(r).toBeNull();
  });

  it('chameleon_early_vote quando tutti gli indizi sono presenti', async () => {
    const roundState = {
      chameleonId: 'p2',
      secretWord: 'Pane',
      playerIdsAtStart: ['p1', 'p2', 'p3'],
    };

    vi.mocked(prisma.room.findUnique).mockImplementation((args: never) => {
      const a = args as { where?: { id?: string; code?: string }; include?: { players?: boolean } };
      if (a.where?.code === 'ABCD') {
        return Promise.resolve({
          id: 'room1',
          currentGame: 'CHAMELEON',
          gameState: { state: { currentRoundId: 'round1' }, roomId: 'room1' },
        } as never);
      }
      if (a.where?.id === 'room1' && a.include?.players) {
        return Promise.resolve({
          id: 'room1',
          players: [
            { id: 'p1', name: 'A' },
            { id: 'p2', name: 'B' },
            { id: 'p3', name: 'C' },
          ],
        } as never);
      }
      return Promise.resolve(null);
    });

    vi.mocked(prisma.gameRound.findUnique).mockResolvedValue({
      id: 'round1',
      phase: 'HINTING',
      state: roundState,
    } as never);

    vi.mocked(prisma.gameAction.findMany).mockImplementation((opts: never) => {
      const o = opts as { select?: unknown; where?: { actionType?: string } };
      const full = [
        { playerId: 'p1', data: { hint: 'a' }, player: { name: 'A' } },
        { playerId: 'p2', data: { hint: 'b' }, player: { name: 'B' } },
        { playerId: 'p3', data: { hint: 'c' }, player: { name: 'C' } },
      ];
      if (o?.where?.actionType === 'HINT') {
        if (o.select) {
          return Promise.resolve(full.map((h) => ({ playerId: h.playerId })) as never);
        }
        return Promise.resolve(full as never);
      }
      return Promise.resolve([] as never);
    });

    vi.mocked(prisma.gameRound.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.gameState.update).mockResolvedValue({} as never);

    const r = await checkChameleonEarlyProgress('ABCD');
    expect(r).toBe('chameleon_early_vote');
    expect(sendToRoom).toHaveBeenCalled();
    const call = vi.mocked(sendToRoom).mock.calls.find((c) => c[1] === 'phase-changed');
    expect(call).toBeDefined();
    expect((call![2] as { phase?: string }).phase).toBe('VOTING');
  });
});
