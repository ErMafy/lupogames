import { prisma } from '@/lib/prisma';
import {
  getContentForGame, incrementContentUsage, endGenericGame,
  upsertActionAndCount, getAllActions, cleanupOldRounds, sendToRoom, pickRandom,
} from '@/lib/new-game-utils';

const HINT_SEC = 30;
const VOTE_SEC = 25;
const RESULTS_DWELL_MS = 4000;

export type ChameleonHintRow = { playerId: string; playerName: string; hint: string };

/** Legge lo stato round dal JSON (camelCase o snake_case da vecchi record / driver). */
function readRoundChameleonState(state: unknown): {
  secretWord: string;
  chameleonId: string;
  contentId?: string;
  retried?: boolean;
} {
  const s = (state && typeof state === 'object' ? state : {}) as Record<string, unknown>;
  const chameleonId = String(s.chameleonId ?? s.chameleon_id ?? '').trim();
  const secretWord = String(s.secretWord ?? s.secret_word ?? '').trim();
  const contentId = s.contentId != null ? String(s.contentId) : undefined;
  const retried = Boolean(s.retried);
  return { secretWord, chameleonId, contentId, retried };
}

/** Giocatori che devono dare indizio/voto: fissati all'inizio del round (evita join a metà che blocca la partita). */
export function chameleonRequiredPlayerIds(
  roundState: unknown,
  roomPlayers: { id: string }[],
): string[] {
  const s = (roundState && typeof roundState === 'object' ? roundState : {}) as Record<string, unknown>;
  const ids = s.playerIdsAtStart ?? s.player_ids_at_start;
  if (Array.isArray(ids) && ids.length > 0 && ids.every((x) => typeof x === 'string')) {
    return ids as string[];
  }
  return roomPlayers.map(p => p.id);
}

async function tryCompleteChameleonHintingIfReady(
  roomCode: string,
  roundId: string,
  roomId: string,
): Promise<boolean> {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'HINTING') return false;
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  if (!room) return false;
  const required = chameleonRequiredPlayerIds(gr.state, room.players);
  if (required.length === 0) return false;
  const hintRows = await prisma.gameAction.findMany({
    where: { roundId, actionType: 'HINT' },
    select: { playerId: true },
  });
  const submitted = new Set(hintRows.map(h => h.playerId));
  if (!required.every(id => submitted.has(id))) return false;
  await startChameleonVoting(roomCode, roundId, roomId);
  return true;
}

async function tryCompleteChameleonVotingIfReady(
  roomCode: string,
  roundId: string,
  roomId: string,
): Promise<boolean> {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') return false;
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  if (!room) return false;
  const required = chameleonRequiredPlayerIds(gr.state, room.players);
  if (required.length === 0) return false;
  const voteRows = await prisma.gameAction.findMany({
    where: { roundId, actionType: 'VOTE' },
    select: { playerId: true },
  });
  const submitted = new Set(voteRows.map(v => v.playerId));
  if (!required.every(id => submitted.has(id))) return false;
  await showChameleonResults(roomCode, roundId, roomId);
  return true;
}

/** Chiamato dal tick mentre il timer è ancora attivo: passa al voto / risultati appena tutti hanno inviato. */
export async function checkChameleonEarlyProgress(roomCode: string): Promise<string | null> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true },
  });
  if (!room?.gameState || room.currentGame !== 'CHAMELEON') return null;
  const st = room.gameState.state as { currentRoundId?: string };
  const roundId = st.currentRoundId;
  if (!roundId) return null;
  if (await tryCompleteChameleonHintingIfReady(roomCode, roundId, room.id)) return 'chameleon_early_vote';
  if (await tryCompleteChameleonVotingIfReady(roomCode, roundId, room.id)) return 'chameleon_early_results';
  return null;
}

export async function getChameleonRoundContextForPlayer(roomCode: string, playerId: string) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true, players: true },
  });
  if (!room?.gameState || room.currentGame !== 'CHAMELEON') return null;
  const st = room.gameState.state as { currentRoundId?: string };
  const roundId = st.currentRoundId;
  if (!roundId) return null;
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr) return null;
  const c = readRoundChameleonState(gr.state);
  const isChameleon = !!playerId && c.chameleonId === playerId;
  const required = chameleonRequiredPlayerIds(gr.state, room.players);
  return {
    chameleonId: c.chameleonId,
    secretWord: isChameleon ? null : (c.secretWord || null),
    roundId,
    phase: gr.phase,
    timeLimit: gr.phase === 'HINTING' ? HINT_SEC : gr.phase === 'VOTING' ? VOTE_SEC : undefined,
    chameleonPlayerCount: required.length,
  };
}

async function buildHintRows(roomId: string, roundId: string): Promise<ChameleonHintRow[]> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  if (!room) return [];
  const actions = await getAllActions(roundId, 'HINT');
  const byPlayer = new Map(actions.map(a => [a.playerId, a]));
  return room.players.map(p => {
    const a = byPlayer.get(p.id);
    const hint = a ? String((a.data as { hint: string }).hint || '').trim() || '(nessun indizio)' : '(nessun indizio)';
    return { playerId: p.id, playerName: p.name, hint };
  });
}

/** Sync API: elenco indizi per fase VOTING/RESULTS */
export async function buildChameleonHintRowsForSync(roomId: string, roundId: string) {
  return buildHintRows(roomId, roundId);
}

export async function startChameleonGame(roomCode: string, rounds = 3) {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true, gameState: true } });
  if (!room) throw new Error('Room not found');
  if (room.players.length < 4) throw new Error('min 4');

  const contents = await getContentForGame('CHAMELEON', rounds);
  if (contents.length < rounds) throw new Error('not enough content');

  await cleanupOldRounds(room.id, 'CHAMELEON');
  const first = contents[0];
  const chameleonPick = pickRandom(room.players, 1) as { id: string }[];
  const chameleon = chameleonPick[0];
  if (!chameleon?.id) throw new Error('Impossibile scegliere il camaleonte');

  const playerIdsAtStart = room.players.map(p => p.id);
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'CHAMELEON', roundNumber: 1, phase: 'HINTING',
      state: {
        secretWord: first.content,
        contentId: first.id,
        chameleonId: chameleon.id,
        playerIdsAtStart,
      } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING', currentGame: 'CHAMELEON', currentRound: 1 } }),
    prisma.gameState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + HINT_SEC * 1000) },
      update: { state: { contentIds: contents.map(c => c.id), currentIndex: 1, currentRoundId: gr.id }, totalRounds: rounds, currentRound: 1, timerEndsAt: new Date(Date.now() + HINT_SEC * 1000) },
    }),
  ]);
  await incrementContentUsage(first.id);

  await sendToRoom(roomCode, 'game-started', { gameType: 'CHAMELEON', totalRounds: rounds });
  // chameleonId anche a livello root così non si perde se il client legge male data annidata
  await sendToRoom(roomCode, 'round-started', {
    roundNumber: 1, totalRounds: rounds, gameType: 'CHAMELEON', phase: 'HINTING',
    chameleonId: chameleon.id,
    data: { secretWord: first.content, roundId: gr.id, chameleonId: chameleon.id, timeLimit: HINT_SEC },
  });
  return { roundId: gr.id };
}

export async function handleChameleonHint(roomCode: string, playerId: string, roundId: string, hint: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'HINTING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  const trimmedHint = hint.trim().split(' ')[0];
  await upsertActionAndCount(roundId, playerId, 'HINT', { hint: trimmedHint });
  const player = room.players.find(p => p.id === playerId);
  const required = chameleonRequiredPlayerIds(gr.state, room.players);
  const hintRows = await prisma.gameAction.findMany({
    where: { roundId, actionType: 'HINT' },
    select: { playerId: true },
  });
  const submitted = new Set(hintRows.map(h => h.playerId));

  await sendToRoom(roomCode, 'chameleon-hint', {
    playerId,
    playerName: player?.name || '???',
    hint: trimmedHint,
    totalHints: hintRows.length,
    totalPlayers: required.length,
    roundId,
  });

  if (required.length > 0 && required.every(id => submitted.has(id))) {
    await startChameleonVoting(roomCode, roundId, room.id);
  }
}

/** HINTING → VOTING (no REVEAL pause): everyone sees all hints in the voting screen. */
async function startChameleonVoting(roomCode: string, roundId: string, roomId: string) {
  const hints = await buildHintRows(roomId, roundId);
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'HINTING' }, data: { phase: 'VOTING' } });
  if (transitioned.count === 0) return;
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const chameleonId = readRoundChameleonState(gr?.state).chameleonId;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) } });
  await sendToRoom(roomCode, 'phase-changed', {
    gameType: 'CHAMELEON',
    phase: 'VOTING',
    chameleonId,
    data: { roundId, hints, timeLimit: VOTE_SEC, chameleonId },
  });
}

export async function handleChameleonVote(roomCode: string, playerId: string, roundId: string, suspectedId: string) {
  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!gr || gr.phase !== 'VOTING') throw new Error('wrong phase');
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { players: true } });
  if (!room) throw new Error('room not found');

  await upsertActionAndCount(roundId, playerId, 'VOTE', { suspectedId });
  const required = chameleonRequiredPlayerIds(gr.state, room.players);
  const voteRows = await prisma.gameAction.findMany({
    where: { roundId, actionType: 'VOTE' },
    select: { playerId: true },
  });
  const submitted = new Set(voteRows.map(v => v.playerId));
  if (required.length > 0 && required.every(id => submitted.has(id))) {
    await showChameleonResults(roomCode, roundId, room.id);
  }
}

export async function showChameleonResults(roomCode: string, roundId: string, roomId: string) {
  const transitioned = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'VOTING' }, data: { phase: 'RESULTS', endedAt: new Date() } });
  if (transitioned.count === 0) return;

  const gr = await prisma.gameRound.findUnique({ where: { id: roundId } });
  const state = readRoundChameleonState(gr?.state);
  if (!state.chameleonId) {
    console.error('chameleon: round senza chameleonId in state', roundId);
    return;
  }
  const votes = await getAllActions(roundId, 'VOTE');

  const voteCounts: Record<string, number> = {};
  for (const v of votes) { const s = (v.data as { suspectedId: string }).suspectedId; voteCounts[s] = (voteCounts[s] || 0) + 1; }

  // Check if majority voted SKIP ("Non lo so") and hasn't retried yet
  const skipCount = voteCounts['SKIP'] || 0;
  const totalVotes = votes.length;
  const majoritySkipped = skipCount > totalVotes / 2 && !state.retried;

  if (majoritySkipped) {
    // Retry: go back to HINTING with same word, same chameleon, mark as retried
    const prevState = (gr?.state && typeof gr.state === 'object' ? gr.state : {}) as Record<string, unknown>;
    await prisma.gameRound.update({
      where: { id: roundId },
      data: { phase: 'HINTING', endedAt: null, state: { ...prevState, retried: true } },
    });
    // Clear old actions so players can hint and vote again
    await prisma.gameAction.deleteMany({ where: { roundId } });
    const gsUpdated = await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + HINT_SEC * 1000) } });

    await sendToRoom(roomCode, 'round-started', {
      roundNumber: gr?.roundNumber || 1, totalRounds: gsUpdated.totalRounds, gameType: 'CHAMELEON', phase: 'HINTING',
      chameleonId: state.chameleonId,
      data: { secretWord: state.secretWord, roundId, chameleonId: state.chameleonId, timeLimit: HINT_SEC, retry: true },
    });
    return;
  }

  const topSuspect = Object.entries(voteCounts).filter(([k]) => k !== 'SKIP').sort((a, b) => b[1] - a[1])[0]?.[0];
  const chameleonCaught = topSuspect === state.chameleonId;

  if (chameleonCaught) {
    for (const v of votes) {
      if (v.playerId !== state.chameleonId) await prisma.player.update({ where: { id: v.playerId }, data: { score: { increment: 100 } } });
    }
  } else {
    await prisma.player.update({ where: { id: state.chameleonId }, data: { score: { increment: 300 } } });
  }

  const until = new Date(Date.now() + RESULTS_DWELL_MS);
  const gs = await prisma.gameState.findUnique({ where: { roomId } });
  const st = (gs?.state || {}) as Record<string, unknown>;
  await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: until, state: { ...st, advanceAt: until.toISOString() } } });

  const chameleon = await prisma.player.findUnique({ where: { id: state.chameleonId } });
  const hints = await buildHintRows(roomId, roundId);
  await sendToRoom(roomCode, 'round-results', {
    gameType: 'CHAMELEON',
    results: { chameleonId: state.chameleonId, chameleonName: chameleon?.name, secretWord: state.secretWord, chameleonCaught, voteCounts, hints },
  });
}

export async function advanceChameleon(roomCode: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() }, include: { gameState: true, players: true } });
  if (!room?.gameState || room.currentGame !== 'CHAMELEON') return false;
  const gs = room.gameState;
  const st = (gs.state || {}) as { contentIds?: string[]; currentIndex?: number; advanceAt?: string; currentRoundId?: string };

  if (st.advanceAt && new Date(st.advanceAt).getTime() > Date.now()) return false;

  if (st.currentRoundId) {
    const curRound = await prisma.gameRound.findUnique({ where: { id: st.currentRoundId } });
    if (curRound && curRound.phase !== 'RESULTS') return false;
  }

  const nextIdx = st.currentIndex ?? 0;
  const contentIds = st.contentIds || [];
  if (nextIdx >= contentIds.length) { await endGenericGame(roomCode, room.id, 'CHAMELEON'); return true; }

  const content = await prisma.gameContent.findUnique({ where: { id: contentIds[nextIdx] } });
  if (!content) { await endGenericGame(roomCode, room.id, 'CHAMELEON'); return true; }

  const roundNumber = room.currentRound + 1;
  const chameleonPick = pickRandom(room.players, 1) as { id: string }[];
  const chameleon = chameleonPick[0];
  if (!chameleon?.id) throw new Error('Impossibile scegliere il camaleonte');
  const playerIdsAtStart = room.players.map(p => p.id);
  const gr = await prisma.gameRound.create({
    data: { roomId: room.id, gameType: 'CHAMELEON', roundNumber, phase: 'HINTING',
      state: {
        secretWord: content.content,
        contentId: content.id,
        chameleonId: chameleon.id,
        playerIdsAtStart,
      } },
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { currentRound: roundNumber } }),
    prisma.gameState.update({ where: { roomId: room.id }, data: { currentRound: roundNumber, timerEndsAt: new Date(Date.now() + HINT_SEC * 1000), state: { ...st, currentIndex: nextIdx + 1, currentRoundId: gr.id, advanceAt: null } } }),
  ]);
  await incrementContentUsage(content.id);

  await sendToRoom(roomCode, 'round-started', {
    roundNumber, totalRounds: gs.totalRounds, gameType: 'CHAMELEON', phase: 'HINTING',
    chameleonId: chameleon.id,
    data: { secretWord: content.content, roundId: gr.id, chameleonId: chameleon.id, timeLimit: HINT_SEC },
  });
  return true;
}

export async function forceChameleonTimeout(roomCode: string, roundId: string, roomId: string) {
  const [gr, gs] = await Promise.all([
    prisma.gameRound.findUnique({ where: { id: roundId } }),
    prisma.gameState.findUnique({ where: { roomId } }),
  ]);
  if (!gr) return;
  // Only force timeout if the current phase timer has actually expired
  const timerEnd = gs?.timerEndsAt?.getTime() || 0;
  if (timerEnd > Date.now()) return;

  if (gr.phase === 'HINTING') await startChameleonVoting(roomCode, roundId, roomId);
  else if (gr.phase === 'REVEAL') {
    // Vecchie partite ancora in REVEAL: vai direttamente al voto
    const hints = await buildHintRows(roomId, roundId);
    const t = await prisma.gameRound.updateMany({ where: { id: roundId, phase: 'REVEAL' }, data: { phase: 'VOTING' } });
    if (t.count > 0) {
      const chameleonId = readRoundChameleonState(gr.state).chameleonId;
      await prisma.gameState.update({ where: { roomId }, data: { timerEndsAt: new Date(Date.now() + VOTE_SEC * 1000) } });
      await sendToRoom(roomCode, 'phase-changed', {
        gameType: 'CHAMELEON',
        phase: 'VOTING',
        chameleonId,
        data: { roundId, hints, timeLimit: VOTE_SEC, chameleonId },
      });
    }
  } else if (gr.phase === 'VOTING') await showChameleonResults(roomCode, roundId, roomId);
}
