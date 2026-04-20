/**
 * FULL 5-player playthrough for ALL 11 mini-games — fino alla FINE naturale.
 *
 * Per ogni gioco:
 *   - avvio con 5 giocatori e con il numero di round configurato
 *   - per ogni round: tutti i player giocano tutte le fasi (validate)
 *   - alla fine il gioco DEVE finire da solo (game-ended) e la stanza tornare in LOBBY
 *   - vengono validate anche le regole di sicurezza (chi può/non può fare cosa)
 *
 * Time-skip: niente sleep di 30s. Quando una fase è in attesa di un timer del server
 * lo facciamo scadere via DB e chiamiamo /api/game/tick.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL mancante. Carica .env.local prima.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool) as any;
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http(method: 'GET' | 'POST', path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const POST = (p: string, b: unknown) => http('POST', p, b);
const GET = (p: string) => http('GET', p);

type Bug = { game: string; step: string; detail: string };
const bugs: Bug[] = [];
function bug(game: string, step: string, detail: string) {
  bugs.push({ game, step, detail });
  console.log(`  [BUG] ${game} :: ${step} -> ${detail}`);
}

async function setup5Players() {
  const room = await POST('/api/rooms', { hostName: 'Host5P' });
  if (!room.json?.success) throw new Error(`crea stanza: ${JSON.stringify(room.json)}`);
  const roomCode: string = room.json.data.room.code;
  const playerIds: string[] = [room.json.data.hostPlayer.id];
  for (const name of ['P2', 'P3', 'P4', 'P5']) {
    const j = await POST('/api/rooms/join', { roomCode, playerName: name });
    if (!j.json?.success) throw new Error(`join ${name}: ${JSON.stringify(j.json)}`);
    playerIds.push(j.json.data.player.id);
  }
  return { roomCode, playerIds };
}

async function getRoom(roomCode: string) {
  return prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: { gameState: true, players: true },
  });
}

async function getCurrentGenericRound(roomCode: string) {
  const room = await getRoom(roomCode);
  if (!room?.gameState) return null;
  const st = (room.gameState.state || {}) as any;
  const rid: string | undefined = st.currentRoundId;
  if (!rid) return null;
  return prisma.gameRound.findUnique({ where: { id: rid } });
}

async function expireTimer(roomCode: string) {
  await prisma.gameState.updateMany({
    where: { room: { code: roomCode.toUpperCase() } },
    data: { timerEndsAt: new Date(Date.now() - 1000) },
  });
}

async function expireAdvanceAt(roomCode: string) {
  const room = await getRoom(roomCode);
  if (!room?.gameState) return;
  const st = (room.gameState.state || {}) as any;
  const newSt = { ...st };
  if (newSt.advanceAt) newSt.advanceAt = new Date(Date.now() - 5000).toISOString();
  if (newSt.promptAdvanceAt) newSt.promptAdvanceAt = new Date(Date.now() - 5000).toISOString();
  if (newSt.secretAdvanceAt) newSt.secretAdvanceAt = new Date(Date.now() - 5000).toISOString();
  await prisma.gameState.update({
    where: { roomId: room.id },
    data: { state: newSt, timerEndsAt: new Date(Date.now() - 1000) },
  });
}

async function tick(roomCode: string) {
  return GET(`/api/game/tick?code=${roomCode}`);
}

async function isLobby(roomCode: string) {
  const room = await getRoom(roomCode);
  return room?.status === 'LOBBY';
}

async function ensureLobby(roomCode: string) {
  if (await isLobby(roomCode)) return true;
  await POST('/api/game/end', { roomCode });
  await sleep(150);
  return isLobby(roomCode);
}

// =====================================================================
// Generic per-round loop helper. Returns when the room is back in LOBBY
// or maxIterations is exceeded.
//
// playOneRound: data una room+roundId, esegue tutte le fasi del round e
// lascia il round in RESULTS. Restituisce false se la fase iniziale non c'è.
// =====================================================================

async function playUntilEnd(
  game: string,
  roomCode: string,
  playerIds: string[],
  expectedTotalRounds: number,
  playOneRound: (roundIdx: number) => Promise<boolean>,
) {
  const maxRounds = expectedTotalRounds + 2;
  for (let i = 1; i <= maxRounds; i++) {
    if (await isLobby(roomCode)) {
      if (i - 1 < expectedTotalRounds) {
        bug(game, `early end`, `lobby dopo ${i - 1}/${expectedTotalRounds} round`);
      }
      return;
    }
    const ok = await playOneRound(i);
    if (!ok) {
      bug(game, `round${i}`, 'playOneRound returned false');
      break;
    }
    // Fase RESULTS terminata: forziamo l'avanzamento al round successivo (o fine)
    await expireAdvanceAt(roomCode);
    await tick(roomCode);
    await sleep(250);
  }

  if (!(await isLobby(roomCode))) {
    bug(game, `did not end naturally`, `room non torna in LOBBY dopo ${maxRounds} round`);
    await POST('/api/game/end', { roomCode });
  }
}

// =============== TRIVIA ===============
async function playTrivia(roomCode: string, playerIds: string[]) {
  const game = 'TRIVIA';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/trivia', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const room = await getRoom(roomCode);
    const st = (room?.gameState?.state || {}) as any;
    const rid = st.currentRoundId as string | undefined;
    if (!rid) return false;
    for (const pid of playerIds) {
      const ans = await POST('/api/game/trivia/answer', {
        roomCode, playerId: pid, roundId: rid, answer: 'A', responseTimeMs: 100 + Math.random() * 5000,
      });
      if (!ans.json?.success && !String(ans.json?.error).includes('già risposto')) {
        bug(game, `r${idx} answer ${pid}`, JSON.stringify(ans.json));
      }
    }
    if (idx === 1) {
      const dup = await POST('/api/game/trivia/answer', {
        roomCode, playerId: playerIds[0], roundId: rid, answer: 'B', responseTimeMs: 100,
      });
      if (dup.json?.success) bug(game, `r${idx} dup`, 'doppio invio non bloccato');
    }
    // Trivia: dopo che tutti rispondono il server entra in dwell (showingResults).
    // Il singolo expireAdvanceAt+tick di playUntilEnd farà uscire dal dwell.
    await sleep(200);
    return true;
  });
}

// =============== SWIPE_TRASH ===============
async function playSwipe(roomCode: string, playerIds: string[]) {
  const game = 'SWIPE_TRASH';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/swipe', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    for (const pid of playerIds) {
      const v = await POST('/api/game/swipe/vote', {
        roomCode, playerId: pid, roundId: gr.id,
        vote: Math.random() < 0.5 ? 'YES' : 'NO',
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    await sleep(150);
    const gr2 = await getCurrentGenericRound(roomCode);
    if (gr2?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr2?.phase}`);
    return true;
  });
}

// =============== THERMOMETER ===============
async function playThermometer(roomCode: string, playerIds: string[]) {
  const game = 'THERMOMETER';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/thermometer', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    for (const pid of playerIds) {
      const v = await POST('/api/game/thermometer/vote', {
        roomCode, playerId: pid, roundId: gr.id, value: Math.floor(Math.random() * 100),
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    await sleep(150);
    const gr2 = await getCurrentGenericRound(roomCode);
    if (gr2?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr2?.phase}`);
    return true;
  });
}

// =============== HERD_MIND ===============
async function playHerd(roomCode: string, playerIds: string[]) {
  const game = 'HERD_MIND';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/herd', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    for (const pid of playerIds) {
      const a = await POST('/api/game/herd/answer', {
        roomCode, playerId: pid, roundId: gr.id, answer: 'pizza',
      });
      if (!a.json?.success) bug(game, `r${idx} answer ${pid}`, JSON.stringify(a.json));
    }
    await sleep(150);
    const gr2 = await getCurrentGenericRound(roomCode);
    if (gr2?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr2?.phase}`);
    return true;
  });
}

// =============== TRIBUNAL ===============
async function playTribunal(roomCode: string, playerIds: string[]) {
  const game = 'TRIBUNAL';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/tribunal', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    let gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    for (const pid of playerIds) {
      const target = playerIds.find((p) => p !== pid)!;
      const a = await POST('/api/game/tribunal/action', {
        roomCode, playerId: pid, roundId: gr.id, action: 'accuse', accusedPlayerId: target,
      });
      if (!a.json?.success) bug(game, `r${idx} accuse ${pid}`, JSON.stringify(a.json));
    }
    await sleep(150);

    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'DEFENSE') {
      bug(game, `r${idx}`, `expected DEFENSE got ${gr?.phase}`);
    } else {
      const defendantId = (gr.state as any).defendantId as string;
      const d = await POST('/api/game/tribunal/action', {
        roomCode, playerId: defendantId, roundId: gr.id, action: 'defense', defense: 'Sono innocente!',
      });
      if (!d.json?.success) bug(game, `r${idx} defense`, JSON.stringify(d.json));
      if (idx === 1) {
        const wrong = playerIds.find((p) => p !== defendantId)!;
        const dw = await POST('/api/game/tribunal/action', {
          roomCode, playerId: wrong, roundId: gr.id, action: 'defense', defense: 'Hack!',
        });
        if (dw.json?.success) bug(game, `r${idx} defense by non-defendant accepted`, 'security');
      }
    }
    await sleep(150);

    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'VERDICT') {
      bug(game, `r${idx}`, `expected VERDICT got ${gr?.phase}`);
    } else {
      const defendantId = (gr.state as any).defendantId as string;
      for (const pid of playerIds) {
        if (pid === defendantId) continue;
        const v = await POST('/api/game/tribunal/action', {
          roomCode, playerId: pid, roundId: gr.id, action: 'verdict',
          verdict: Math.random() < 0.5 ? 'INNOCENT' : 'GUILTY',
        });
        if (!v.json?.success) bug(game, `r${idx} verdict ${pid}`, JSON.stringify(v.json));
      }
      if (idx === 1) {
        const dv = await POST('/api/game/tribunal/action', {
          roomCode, playerId: defendantId, roundId: gr.id, action: 'verdict', verdict: 'INNOCENT',
        });
        if (dv.json?.success) bug(game, `r${idx} verdict by defendant accepted`, 'security');
      }
    }
    await sleep(150);

    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr?.phase}`);
    return true;
  });
}

// =============== BOMB ===============
async function playBomb(roomCode: string, playerIds: string[]) {
  const game = 'BOMB';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/bomb', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    let gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    for (let i = 0; i < 4; i++) {
      gr = await getCurrentGenericRound(roomCode);
      if (gr?.phase !== 'PLAYING') break;
      const holder = (gr.state as any).bombHolderId as string;
      if (idx === 1 && i === 0) {
        const wrongPass = playerIds.find((p) => p !== holder)!;
        const wp = await POST('/api/game/bomb/pass', {
          roomCode, playerId: wrongPass, roundId: gr.id, word: 'sbagliato',
        });
        if (wp.json?.success) bug(game, `r${idx} pass by non-holder accepted`, 'security');
      }
      const ok = await POST('/api/game/bomb/pass', {
        roomCode, playerId: holder, roundId: gr.id, word: `parola${i}`,
      });
      if (!ok.json?.success) bug(game, `r${idx} pass${i}`, JSON.stringify(ok.json));
    }
    await expireTimer(roomCode);
    await tick(roomCode);
    await sleep(200);
    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'EXPLODED') bug(game, `r${idx}`, `expected EXPLODED got ${gr?.phase}`);
    return true;
  });
}

// =============== CHAMELEON ===============
async function playChameleon(roomCode: string, playerIds: string[]) {
  const game = 'CHAMELEON';
  console.log(`\n--- ${game} (3 round) ---`);
  const ROUNDS = 3;
  const r = await POST('/api/game/chameleon', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    let gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    const chameleonId = (gr.state as any).chameleonId as string;
    if (!playerIds.includes(chameleonId)) bug(game, `r${idx}`, `chameleonId ${chameleonId} not in players`);

    if (idx === 1) {
      let chamCount = 0;
      let nonChamWithSecret = 0;
      for (const pid of playerIds) {
        const ctx = await GET(`/api/game/chameleon/context?code=${roomCode}&playerId=${pid}`);
        if (!ctx.json?.success) {
          bug(game, `r${idx} ctx ${pid}`, JSON.stringify(ctx.json));
          continue;
        }
        const isCham = !!ctx.json.data.isChameleon;
        if (isCham) chamCount++;
        if (pid === chameleonId && !isCham) bug(game, `r${idx} ctx ${pid}`, 'chameleon non sa di esserlo');
        if (pid !== chameleonId && isCham) bug(game, `r${idx} ctx ${pid}`, 'non-chameleon ricevuto isChameleon=true');
        if (pid === chameleonId && ctx.json.data.secretWord !== null)
          bug(game, `r${idx} ctx ${pid}`, 'chameleon riceve secretWord');
        if (pid !== chameleonId && (!ctx.json.data.secretWord || ctx.json.data.secretWord.length === 0))
          bug(game, `r${idx} ctx ${pid}`, 'non-chameleon non riceve secretWord');
        if (pid !== chameleonId && ctx.json.data.secretWord) nonChamWithSecret++;
      }
      if (chamCount !== 1) bug(game, `r${idx}`, `${chamCount} chameleon (atteso 1)`);
      if (nonChamWithSecret !== playerIds.length - 1)
        bug(game, `r${idx}`, `${nonChamWithSecret}/${playerIds.length - 1} non-cham con secret`);
    }

    for (const pid of playerIds) {
      const a = await POST('/api/game/chameleon/action', {
        roomCode, playerId: pid, roundId: gr.id, action: 'hint', hint: `indizio${pid.slice(-3)}`,
      });
      if (!a.json?.success) bug(game, `r${idx} hint ${pid}`, JSON.stringify(a.json));
    }
    await sleep(250);

    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'VOTING') {
      await tick(roomCode);
      await sleep(150);
      gr = await getCurrentGenericRound(roomCode);
    }
    if (gr?.phase !== 'VOTING') {
      bug(game, `r${idx}`, `expected VOTING got ${gr?.phase}`);
      return true;
    }

    for (const pid of playerIds) {
      const target = pid === chameleonId
        ? playerIds.find((p) => p !== chameleonId)!
        : chameleonId;
      const v = await POST('/api/game/chameleon/action', {
        roomCode, playerId: pid, roundId: gr.id, action: 'vote', suspectedId: target,
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    await sleep(250);
    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr?.phase}`);
    return true;
  });
}

// =============== SPLIT_ROOM ===============
async function playSplit(roomCode: string, playerIds: string[]) {
  const game = 'SPLIT_ROOM';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/split', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    let gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;
    const authorId = (gr.state as any).authorId as string;
    if (!playerIds.includes(authorId)) bug(game, `r${idx}`, `authorId ${authorId} not in players`);

    if (idx === 1) {
      const wrong = playerIds.find((p) => p !== authorId)!;
      const ww = await POST('/api/game/split/action', {
        roomCode, playerId: wrong, roundId: gr.id, action: 'write', completion: 'hack',
      });
      if (ww.json?.success) bug(game, `r${idx} write by non-author accepted`, 'security');
    }

    const wa = await POST('/api/game/split/action', {
      roomCode, playerId: authorId, roundId: gr.id, action: 'write',
      completion: `continuazione round ${idx}`,
    });
    if (!wa.json?.success) bug(game, `r${idx} write`, JSON.stringify(wa.json));
    await sleep(200);

    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'VOTING') {
      bug(game, `r${idx}`, `expected VOTING got ${gr?.phase}`);
    } else {
      if (idx === 1) {
        const av = await POST('/api/game/split/action', {
          roomCode, playerId: authorId, roundId: gr.id, action: 'vote', vote: 'YES',
        });
        if (av.json?.success) bug(game, `r${idx} author vote accepted`, 'security');
      }
      for (const pid of playerIds) {
        if (pid === authorId) continue;
        const v = await POST('/api/game/split/action', {
          roomCode, playerId: pid, roundId: gr.id, action: 'vote',
          vote: Math.random() < 0.5 ? 'YES' : 'NO',
        });
        if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
      }
      await sleep(200);
      gr = await getCurrentGenericRound(roomCode);
      if (gr?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr?.phase}`);
    }
    return true;
  });
}

// =============== INTERVIEW ===============
async function playInterview(roomCode: string, playerIds: string[]) {
  const game = 'INTERVIEW';
  console.log(`\n--- ${game} (3 round) ---`);
  const ROUNDS = 3;
  const r = await POST('/api/game/interview', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    let gr = await getCurrentGenericRound(roomCode);
    if (!gr) return false;

    if (gr.phase === 'COLLECTING') {
      for (const pid of playerIds) {
        const a = await POST('/api/game/interview/action', {
          roomCode, playerId: pid, roundId: gr.id, action: 'collect',
          answers: [`risposta uno di ${pid.slice(-3)}`, `risposta due di ${pid.slice(-3)}`],
        });
        if (!a.json?.success) bug(game, `r${idx} collect ${pid}`, JSON.stringify(a.json));
      }
      await sleep(300);
      gr = await getCurrentGenericRound(roomCode);
    }

    if (gr?.phase !== 'BUILDING') {
      bug(game, `r${idx}`, `expected BUILDING got ${gr?.phase}`);
      return true;
    }

    for (const pid of playerIds) {
      const b = await POST('/api/game/interview/action', {
        roomCode, playerId: pid, roundId: gr.id, action: 'build',
        sentence: `frase di ${pid.slice(-3)} round ${idx}`,
      });
      if (!b.json?.success) bug(game, `r${idx} build ${pid}`, JSON.stringify(b.json));
    }
    await sleep(300);
    gr = await getCurrentGenericRound(roomCode);

    if (gr?.phase !== 'VOTING') {
      bug(game, `r${idx}`, `expected VOTING got ${gr?.phase}`);
      return true;
    }
    for (const pid of playerIds) {
      const target = playerIds.find((p) => p !== pid)!;
      const v = await POST('/api/game/interview/action', {
        roomCode, playerId: pid, roundId: gr.id, action: 'vote', votedPlayerId: target,
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    if (idx === 1) {
      const sv = await POST('/api/game/interview/action', {
        roomCode, playerId: playerIds[0], roundId: gr.id, action: 'vote', votedPlayerId: playerIds[0],
      });
      if (sv.json?.success) bug(game, `r${idx} self vote accepted`, 'security');
    }
    await sleep(300);
    gr = await getCurrentGenericRound(roomCode);
    if (gr?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${gr?.phase}`);
    return true;
  });
}

// =============== CONTINUE_PHRASE ===============
async function playPrompt(roomCode: string, playerIds: string[]) {
  const game = 'CONTINUE_PHRASE';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/prompt', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const room = await getRoom(roomCode);
    const st = (room?.gameState?.state || {}) as any;
    const rid = st.currentRoundId as string | undefined;
    if (!rid) return false;

    for (const pid of playerIds) {
      const a = await POST('/api/game/prompt/response', {
        roomCode, playerId: pid, roundId: rid, response: `Continuazione di ${pid.slice(-3)} round ${idx}`,
      });
      if (!a.json?.success) bug(game, `r${idx} write ${pid}`, JSON.stringify(a.json));
    }
    await tick(roomCode);
    await sleep(200);

    let pr = await prisma.promptRound.findUnique({ where: { id: rid } });
    if (pr?.phase !== 'VOTING') bug(game, `r${idx}`, `expected VOTING got ${pr?.phase}`);

    const responses = await prisma.promptResponse.findMany({ where: { promptRoundId: rid } });
    for (const pid of playerIds) {
      const target = responses.find((r) => r.playerId !== pid);
      if (!target) continue;
      const v = await POST('/api/game/prompt/vote', {
        roomCode, playerId: pid, roundId: rid, responseId: target.id,
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    await tick(roomCode);
    await sleep(200);
    pr = await prisma.promptRound.findUnique({ where: { id: rid } });
    if (pr?.phase !== 'RESULTS') bug(game, `r${idx}`, `expected RESULTS got ${pr?.phase}`);
    return true;
  });
}

// =============== WHO_WAS_IT ===============
async function playSecret(roomCode: string, playerIds: string[]) {
  const game = 'WHO_WAS_IT';
  console.log(`\n--- ${game} (5 round) ---`);
  const ROUNDS = 5;
  const r = await POST('/api/game/secret', { roomCode, rounds: ROUNDS });
  if (!r.json?.success) return bug(game, 'start', JSON.stringify(r.json));

  // tutti inviano segreto -> auto-start del primo guessing round
  for (const pid of playerIds) {
    const s = await POST('/api/game/secret/submit', {
      roomCode, playerId: pid, secret: `Segreto compromettente di ${pid.slice(-3)}`,
    });
    if (!s.json?.success) bug(game, `submit ${pid}`, JSON.stringify(s.json));
  }
  await sleep(400);

  await playUntilEnd(game, roomCode, playerIds, ROUNDS, async (idx) => {
    const room = await getRoom(roomCode);
    const st = (room?.gameState?.state || {}) as any;
    const rid = st.currentRoundId as string | undefined;
    if (!rid) return false;

    const sr = await prisma.secretRound.findUnique({
      where: { id: rid }, include: { secret: true },
    });
    if (!sr) return false;
    const ownerId = sr.secret.playerId;

    for (const pid of playerIds) {
      if (pid === ownerId) continue;
      const guess = playerIds.find((p) => p !== pid)!;
      const v = await POST('/api/game/secret/vote', {
        roomCode, playerId: pid, roundId: rid, suspectedPlayerId: guess,
      });
      if (!v.json?.success) bug(game, `r${idx} vote ${pid}`, JSON.stringify(v.json));
    }
    if (idx === 1) {
      const ov = await POST('/api/game/secret/vote', {
        roomCode, playerId: ownerId, roundId: rid, suspectedPlayerId: playerIds[0],
      });
      if (ov.json?.success) bug(game, `r${idx} owner vote accepted`, 'security');
    }
    await sleep(300);
    const sr2 = await prisma.secretRound.findUnique({ where: { id: rid } });
    if (sr2?.phase !== 'REVEAL') bug(game, `r${idx}`, `expected REVEAL got ${sr2?.phase}`);
    return true;
  });
}

// =============== MAIN ===============
async function main() {
  console.log(`BASE=${BASE}`);
  const games: Array<[string, (rc: string, ids: string[]) => Promise<void>]> = [
    ['TRIVIA', playTrivia],
    ['SWIPE_TRASH', playSwipe],
    ['THERMOMETER', playThermometer],
    ['HERD_MIND', playHerd],
    ['TRIBUNAL', playTribunal],
    ['BOMB', playBomb],
    ['CHAMELEON', playChameleon],
    ['SPLIT_ROOM', playSplit],
    ['INTERVIEW', playInterview],
    ['CONTINUE_PHRASE', playPrompt],
    ['WHO_WAS_IT', playSecret],
  ];

  let setup: Awaited<ReturnType<typeof setup5Players>>;
  try {
    setup = await setup5Players();
  } catch (e) {
    console.error('Setup fallito:', e);
    process.exit(1);
  }
  console.log(`Stanza ${setup.roomCode} con ${setup.playerIds.length} giocatori\n`);

  const summary: Array<{ game: string; bugs: number; ended: boolean }> = [];

  for (const [name, fn] of games) {
    const before = bugs.length;
    const t0 = Date.now();
    try {
      await fn(setup.roomCode, setup.playerIds);
    } catch (e: any) {
      bug(name, 'exception', e?.message || String(e));
    }
    const ended = await isLobby(setup.roomCode);
    const newBugs = bugs.length - before;
    const ms = Date.now() - t0;
    summary.push({ game: name, bugs: newBugs, ended });
    console.log(`${newBugs === 0 && ended ? '[OK]' : '[FAIL]'} ${name} : ${newBugs} bug${newBugs === 1 ? '' : 's'}, lobby=${ended}, ${ms}ms`);
    if (!ended) {
      await ensureLobby(setup.roomCode);
    }
    await sleep(300);
  }

  console.log('\n========= REPORT =========');
  console.log(`Stanza: ${setup.roomCode}`);
  for (const s of summary) {
    const tag = s.bugs === 0 && s.ended ? 'OK' : 'FAIL';
    console.log(`  [${tag}] ${s.game.padEnd(18)} bugs=${s.bugs} endedNaturally=${s.ended}`);
  }
  if (bugs.length === 0) {
    console.log('\nTUTTI I GIOCHI OK (giocati FINO ALLA FINE — nessun bug)');
  } else {
    console.log(`\n${bugs.length} bug rilevati:`);
    for (const b of bugs) console.log(`  - ${b.game} :: ${b.step} -> ${b.detail}`);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
