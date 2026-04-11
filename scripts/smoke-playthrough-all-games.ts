/**
 * Smoke E2E: crea stanza, 4 giocatori, per ognuno degli 11 giochi:
 * avvio → almeno un'azione di gioco reale (API) → fine partita.
 *
 * Prerequisiti: `npm run dev`, DB seedato, opz. LUPO_SMOKE_API=1 se Pusher non va.
 * Uso: npm run test:playthrough
 */

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: Record<string, unknown>) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { url, status: res.status, data };
}

async function fetchSync(roomCode: string) {
  const r = await fetch(`${BASE}/api/game/sync?code=${encodeURIComponent(roomCode)}`);
  return r.json() as Promise<{
    success?: boolean;
    data?: { inGame?: boolean; events?: Array<{ name: string; data: Record<string, unknown> }> };
  }>;
}

type RoundInfo = { roundId: string; phase: string; gameType: string; extra: Record<string, unknown> };

async function waitRound(roomCode: string): Promise<RoundInfo | null> {
  for (let i = 0; i < 12; i++) {
    const j = await fetchSync(roomCode);
    if (j.success && j.data?.inGame && Array.isArray(j.data.events)) {
      const rev = [...j.data.events].reverse();
      const ev = rev.find((e) => e.name === 'round-started');
      if (ev?.data) {
        const d = ev.data;
        const inner = (d.data as Record<string, unknown>) || {};
        const roundId = inner.roundId as string | undefined;
        if (roundId) {
          return {
            roundId,
            phase: String(d.phase ?? ''),
            gameType: String(d.gameType ?? ''),
            extra: inner,
          };
        }
      }
    }
    await sleep(200);
  }
  return null;
}

async function playMoves(
  label: string,
  roomCode: string,
  playerIds: string[],
  startPayload: unknown,
): Promise<{ ok: boolean; detail: string }> {
  const [a, b, c, d] = playerIds;
  if (!a || !b || !c || !d) return { ok: false, detail: 'servono 4 playerId' };

  try {
    switch (label) {
      case 'TRIVIA': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync senza round-started' };
        const r = await post('/api/game/trivia/answer', {
          roomCode,
          playerId: a,
          roundId: info.roundId,
          answer: 'A',
          responseTimeMs: 500,
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'risposta trivia' };
      }
      case 'CONTINUE_PHRASE': {
        const sp = startPayload as { data?: { roundId?: string } };
        const roundId = sp?.data?.roundId;
        if (!roundId) return { ok: false, detail: 'manca roundId avvio prompt' };
        const r = await post('/api/game/prompt/response', {
          roomCode,
          playerId: a,
          roundId,
          response: 'Smoke risposta continua frase',
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'risposta prompt' };
      }
      case 'WHO_WAS_IT': {
        for (const pid of playerIds) {
          const r = await post('/api/game/secret/submit', {
            roomCode,
            playerId: pid,
            secret: `Segreto smoke lungo per ${pid.slice(-4)}`,
          });
          const p = r.data as { success?: boolean; error?: string };
          if (!p?.success) return { ok: false, detail: `submit segreto: ${p?.error}` };
        }
        return { ok: true, detail: '4 segreti inviati' };
      }
      case 'SWIPE_TRASH': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync swipe' };
        const r = await post('/api/game/swipe/vote', {
          roomCode,
          playerId: a,
          roundId: info.roundId,
          vote: 'YES',
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'voto swipe' };
      }
      case 'TRIBUNAL': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync tribunal' };
        const r = await post('/api/game/tribunal/action', {
          roomCode,
          playerId: a,
          roundId: info.roundId,
          action: 'accuse',
          accusedPlayerId: b,
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'accusa tribunal' };
      }
      case 'BOMB': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync bomb' };
        const holder = String(info.extra.bombHolderId || '');
        if (!holder) return { ok: false, detail: 'manca bombHolderId' };
        const r = await post('/api/game/bomb/pass', {
          roomCode,
          playerId: holder,
          roundId: info.roundId,
          word: 'smoke',
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'pass bomba' };
      }
      case 'THERMOMETER': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync thermometer' };
        const r = await post('/api/game/thermometer/vote', {
          roomCode,
          playerId: a,
          roundId: info.roundId,
          value: 55,
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        return { ok: true, detail: 'voto thermometer' };
      }
      case 'HERD_MIND': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync herd' };
        for (const pid of playerIds) {
          const r = await post('/api/game/herd/answer', {
            roomCode,
            playerId: pid,
            roundId: info.roundId,
            answer: 'pizza',
          });
          const p = r.data as { success?: boolean; error?: string };
          if (!p?.success) return { ok: false, detail: `herd ${pid}: ${p?.error}` };
        }
        return { ok: true, detail: '4 risposte herd' };
      }
      case 'CHAMELEON': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync chameleon' };
        for (const pid of playerIds) {
          const r = await post('/api/game/chameleon/action', {
            roomCode,
            playerId: pid,
            roundId: info.roundId,
            action: 'hint',
            hint: 'parola',
          });
          const p = r.data as { success?: boolean; error?: string };
          if (!p?.success) return { ok: false, detail: `hint ${pid}: ${p?.error}` };
        }
        await sleep(300);
        const info2 = await waitRound(roomCode);
        const voteRound = info2?.phase === 'VOTING' ? info2.roundId : info.roundId;
        for (const pid of playerIds) {
          const r = await post('/api/game/chameleon/action', {
            roomCode,
            playerId: pid,
            roundId: voteRound,
            action: 'vote',
            suspectedId: 'SKIP',
          });
          const p = r.data as { success?: boolean; error?: string };
          if (!p?.success) return { ok: false, detail: `vote ${pid}: ${p?.error}` };
        }
        return { ok: true, detail: '4 indizi + 4 voti SKIP' };
      }
      case 'SPLIT_ROOM': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync split' };
        const author = String(info.extra.authorId || '');
        if (!author) return { ok: false, detail: 'manca authorId' };
        const r = await post('/api/game/split/action', {
          roomCode,
          playerId: author,
          roundId: info.roundId,
          action: 'write',
          completion: 'continuazione smoke',
        });
        const p = r.data as { success?: boolean; error?: string };
        if (!p?.success) return { ok: false, detail: p?.error || `HTTP ${r.status}` };
        await sleep(200);
        const infoV = await waitRound(roomCode);
        const rid = infoV?.roundId || info.roundId;
        for (const pid of playerIds) {
          if (pid === author) continue;
          const rv = await post('/api/game/split/action', {
            roomCode,
            playerId: pid,
            roundId: rid,
            action: 'vote',
            vote: 'YES',
          });
          const pv = rv.data as { success?: boolean; error?: string };
          if (!pv?.success) return { ok: false, detail: `split vote ${pid}: ${pv?.error}` };
        }
        return { ok: true, detail: 'scrittura autore + 3 voti' };
      }
      case 'INTERVIEW': {
        const info = await waitRound(roomCode);
        if (!info) return { ok: false, detail: 'sync interview' };
        const answers = ['parola uno per smoke test', 'parola due per smoke test'];
        for (const pid of playerIds) {
          const r = await post('/api/game/interview/action', {
            roomCode,
            playerId: pid,
            roundId: info.roundId,
            action: 'collect',
            answers,
          });
          const p = r.data as { success?: boolean; error?: string };
          if (!p?.success) return { ok: false, detail: `collect ${pid}: ${p?.error}` };
        }
        return { ok: true, detail: '4 collect interview' };
      }
      default:
        return { ok: true, detail: 'nessuna azione extra' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}

async function main() {
  const results: { game: string; ok: boolean; detail: string }[] = [];

  const room = await post('/api/rooms', { hostName: 'SmokeHost' });
  if (!room.data || typeof room.data !== 'object' || !(room.data as { success?: boolean }).success) {
    console.error('Creazione stanza fallita. Il server è avviato?', room);
    process.exit(1);
  }
  const d = room.data as {
    data: { room: { code: string }; hostPlayer: { id: string } };
  };
  const roomCode = d.data.room.code;
  const playerIds: string[] = [d.data.hostPlayer.id];
  const joinNames = ['SmokeP2', 'SmokeP3', 'SmokeP4'];
  for (const name of joinNames) {
    const j = await post('/api/rooms/join', { roomCode, playerName: name });
    if (!j.data || typeof j.data !== 'object' || !(j.data as { success?: boolean }).success) {
      console.error(`Join fallito per ${name}`, j);
      process.exit(1);
    }
    const jd = j.data as { data: { player: { id: string } } };
    playerIds.push(jd.data.player.id);
  }

  const end = async () => {
    const e = await post('/api/game/end', { roomCode });
    return e.status === 200 && (e.data as { success?: boolean })?.success === true;
  };

  const starters: { label: string; path: string; body: Record<string, unknown> }[] = [
    { label: 'TRIVIA', path: '/api/game/trivia', body: { roomCode, rounds: 1 } },
    { label: 'CONTINUE_PHRASE', path: '/api/game/prompt', body: { roomCode, rounds: 1 } },
    { label: 'WHO_WAS_IT', path: '/api/game/secret', body: { roomCode, rounds: 1 } },
    { label: 'SWIPE_TRASH', path: '/api/game/swipe', body: { roomCode, rounds: 1 } },
    { label: 'TRIBUNAL', path: '/api/game/tribunal', body: { roomCode, rounds: 1 } },
    { label: 'BOMB', path: '/api/game/bomb', body: { roomCode, rounds: 1 } },
    { label: 'THERMOMETER', path: '/api/game/thermometer', body: { roomCode, rounds: 1 } },
    { label: 'HERD_MIND', path: '/api/game/herd', body: { roomCode, rounds: 1 } },
    { label: 'CHAMELEON', path: '/api/game/chameleon', body: { roomCode, rounds: 1 } },
    { label: 'SPLIT_ROOM', path: '/api/game/split', body: { roomCode, rounds: 1 } },
    { label: 'INTERVIEW', path: '/api/game/interview', body: { roomCode, rounds: 1 } },
  ];

  for (const s of starters) {
    const r = await post(s.path, s.body);
    const payload = r.data as { success?: boolean; error?: string } | null;
    const startOk = r.status < 400 && payload?.success === true;
    if (!startOk) {
      const detail = `avvio HTTP ${r.status} ${payload?.error || JSON.stringify(payload)}`;
      results.push({ game: s.label, ok: false, detail });
      console.log(`[FAIL] ${s.label}: ${detail}`);
      break;
    }

    const play = await playMoves(s.label, roomCode, playerIds, r.data);
    const ok = play.ok;
    const detail = `${play.detail} (dopo avvio OK)`;
    results.push({ game: s.label, ok, detail });
    console.log(ok ? `[OK] ${s.label}: ${detail}` : `[FAIL] ${s.label}: ${detail}`);

    const ended = await end();
    if (!ended) {
      console.error(`Impossibile tornare in lobby dopo ${s.label} — interrompo.`);
      break;
    }
    await sleep(150);
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length > 0) {
    console.error('\nFalliti:', failed);
    process.exit(1);
  }
  console.log('\nTutti gli 11 giochi: avvio + mossa/e di gioco OK.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
