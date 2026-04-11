import { describe, it, expect } from 'vitest';
import { chameleonRequiredPlayerIds } from '@/lib/chameleon';

describe('chameleonRequiredPlayerIds', () => {
  it('usa playerIdsAtStart quando presente', () => {
    const ids = chameleonRequiredPlayerIds(
      { playerIdsAtStart: ['a', 'b'], chameleonId: 'a' },
      [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
    );
    expect(ids).toEqual(['a', 'b']);
  });

  it('accetta snake_case player_ids_at_start', () => {
    const ids = chameleonRequiredPlayerIds(
      { player_ids_at_start: ['p1', 'p2'] },
      [{ id: 'a' }],
    );
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('fallback sui giocatori della stanza', () => {
    const ids = chameleonRequiredPlayerIds(
      {},
      [{ id: 'u1' }, { id: 'u2' }],
    );
    expect(ids).toEqual(['u1', 'u2']);
  });

  it('ignora array id vuoto e usa fallback', () => {
    const ids = chameleonRequiredPlayerIds(
      { playerIdsAtStart: [] },
      [{ id: 'u1' }],
    );
    expect(ids).toEqual(['u1']);
  });
});
