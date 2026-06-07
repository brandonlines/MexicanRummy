// Database queries
import { getClient } from './supabase.js';
import { generateCode } from '../utils/code.js';

// Games
export async function createGame(hostDeviceId) {
  const client = getClient();
  // Allocate a unique short code; retry on a code collision (23505).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(6);
    const { data, error } = await client
      .from('games')
      .insert([{ status: 'waiting', host_id: hostDeviceId ?? null, code }])
      .select()
      .single();

    if (!error) return data;
    if (error.code !== '23505') throw error; // not a code collision -> real error
  }
  throw new Error('Could not allocate a unique game code, please try again.');
}

export async function getGameByCode(code) {
  const client = getClient();
  const { data, error } = await client
    .from('games')
    .select('*')
    .eq('code', (code || '').toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data; // null if not found
}

export async function getGame(gameId) {
  const client = getClient();
  const { data, error } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateGameStatus(gameId, status) {
  const client = getClient();
  const { data, error } = await client
    .from('games')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteGame(gameId) {
  const client = getClient();
  const { error } = await client
    .from('games')
    .delete()
    .eq('id', gameId);
  
  if (error) throw error;
}

// Players
export async function addPlayer(gameId, name, isHost = false, identity = {}) {
  const client = getClient();

  // Get current player count to set join_order
  const { data: players, error: playersError } = await client
    .from('players')
    .select('join_order')
    .eq('game_id', gameId)
    .order('join_order', { ascending: false })
    .limit(1);

  if (playersError) throw playersError;

  const joinOrder = (players && players.length > 0) ? players[0].join_order + 1 : 1;

  const { data, error } = await client
    .from('players')
    .insert([{
      game_id: gameId,
      name,
      is_host: isHost,
      join_order: joinOrder,
      // Layered identity (all nullable; defaults to {} when not supplied)
      account_id: identity.account_id ?? null,
      device_id: identity.device_id ?? null,
      normalized_name: identity.normalized_name ?? null,
      stable_key: identity.stable_key ?? null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGamePlayers(gameId) {
  const client = getClient();
  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .order('join_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function removePlayer(playerId) {
  const client = getClient();
  const { error } = await client
    .from('players')
    .delete()
    .eq('id', playerId);
  
  if (error) throw error;
}

export async function updatePlayerScore(playerId, score) {
  const client = getClient();
  const { data, error } = await client
    .from('players')
    .update({ score, updated_at: new Date().toISOString() })
    .eq('id', playerId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Hand Progress
export async function getPlayerHandProgress(playerId) {
  const client = getClient();
  const { data, error } = await client
    .from('hand_progress')
    .select('*')
    .eq('player_id', playerId)
    .order('hand_number', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createPlayerHands(playerId, gameId) {
  const client = getClient();
  const hands = Array.from({ length: 10 }, (_, i) => ({
    player_id: playerId,
    game_id: gameId,
    hand_number: i + 1,
    completed: false
  }));
  
  const { data, error } = await client
    .from('hand_progress')
    .insert(hands)
    .select();
  
  if (error) throw error;
  return data || [];
}

export async function markHandComplete(handProgressId, completed) {
  const client = getClient();
  const { data, error } = await client
    .from('hand_progress')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', handProgressId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Hands Reference
export async function getHandsReference() {
  const client = getClient();
  const { data, error } = await client
    .from('hands_reference')
    .select('*')
    .order('hand_number', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Game queries with related data
export async function getGameWithPlayers(gameId) {
  const client = getClient();
  const { data, error } = await client
    .from('games')
    .select(`
      *,
      players (*)
    `)
    .eq('id', gameId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getGameWithFullData(gameId) {
  const client = getClient();
  const { data, error } = await client
    .from('games')
    .select(`
      *,
      players (
        *,
        hand_progress (*)
      )
    `)
    .eq('id', gameId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// History / Stats — read ONLY from the snapshot tables below.
// (game_results header + player_results facts.)
// ============================================================

const norm = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Save an immutable snapshot of a finished game. Idempotent: safe to call
// more than once for the same game (header existence check + PK + UNIQUE).
export async function finishGame(gameId) {
  const client = getClient();

  // 0. Idempotency short-circuit: header already written => done.
  const { data: existing } = await client
    .from('game_results')
    .select('game_id')
    .eq('game_id', gameId)
    .maybeSingle();
  if (existing) return { alreadyFinished: true };

  // 1. Load full live data once (players + nested hand_progress).
  const game = await getGameWithFullData(gameId);
  if (!game) throw new Error('Game not found');
  const players = game.players || [];

  // 2. Rank by score DESC; ties share the lowest rank (competition ranking).
  const sorted = [...players].sort((a, b) => b.score - a.score);
  let rank = 0;
  let prevScore = null;
  const ranked = sorted.map((p, i) => {
    if (p.score !== prevScore) {
      rank = i + 1;
      prevScore = p.score;
    }
    return { p, rank };
  });
  const topScore = ranked.length ? ranked[0].p.score : 0;
  const finishedAt = new Date().toISOString();

  // 3. Build player_results rows from identity columns persisted at join.
  const rows = ranked.map(({ p, rank }) => {
    const normalized = p.normalized_name || norm(p.name);
    return {
      game_id: gameId,
      player_id: p.id,
      stable_key: p.stable_key || `name:${normalized}`,
      account_id: p.account_id ?? null,
      device_id: p.device_id ?? null,
      display_name: p.name,
      normalized_name: normalized,
      score: p.score,
      hands_completed: (p.hand_progress || []).filter((h) => h.completed).length,
      rank,
      is_winner: ranked.length > 0 && p.score === topScore,
      finished_at: finishedAt,
    };
  });

  // 3b. Collapse duplicate stable_keys (e.g. two players sharing one device)
  //     so the header counts match the de-duplicated detail rows we store.
  //     `ranked` is score-DESC, so the kept row is the best-ranked one.
  const seenKeys = new Set();
  const dedupedRows = rows.filter((r) => {
    if (seenKeys.has(r.stable_key)) return false;
    seenKeys.add(r.stable_key);
    return true;
  });

  // 4. Idempotent fact insert: UNIQUE(game_id, stable_key) + ignoreDuplicates.
  if (dedupedRows.length) {
    const { error: prErr } = await client
      .from('player_results')
      .upsert(dedupedRows, { onConflict: 'game_id,stable_key', ignoreDuplicates: true });
    if (prErr) throw prErr;
  }

  // 5. Idempotent header insert: game_id PK + ignoreDuplicates.
  //    Header counts derive from the SAME de-duplicated set we persisted.
  const winner = ranked.find((r) => r.p.score === topScore)?.p;
  const { error: grErr } = await client.from('game_results').upsert(
    {
      game_id: gameId,
      code: game.code ?? null,
      player_count: dedupedRows.length,
      total_points: dedupedRows.reduce((s, r) => s + r.score, 0),
      winner_stable_key: winner?.stable_key ?? null,
      winner_name: winner?.name ?? null,
      finished_at: finishedAt,
    },
    { onConflict: 'game_id', ignoreDuplicates: true }
  );
  if (grErr) throw grErr;

  // 6. Mark live game finished + stamp finished_at.
  await updateGameStatus(gameId, 'finished');
  await client.from('games').update({ finished_at: finishedAt }).eq('id', gameId);

  return { alreadyFinished: false };
}

// --- Optional accounts layer: fold a person's device + account identities ---
// Reads the optional identity_links table. Degrades to a no-op when the table
// is empty or absent (device-only deployments), so the core path is untouched.
async function loadIdentityLinks() {
  const client = getClient();
  try {
    const { data, error } = await client
      .from('identity_links')
      .select('account_id, device_id');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// dev:<id> -> acct:<id>  (account is the canonical identity for grouping)
function canonicalMap(links) {
  const m = new Map();
  for (const l of links) m.set(`dev:${l.device_id}`, `acct:${l.account_id}`);
  return m;
}

// Bidirectional equivalence sets: acct:<id> <-> each linked dev:<id>.
function equivalenceMap(links) {
  const m = new Map();
  const add = (k, v) => {
    if (!m.has(k)) m.set(k, new Set([k]));
    m.get(k).add(v);
  };
  for (const l of links) {
    add(`acct:${l.account_id}`, `dev:${l.device_id}`);
    add(`dev:${l.device_id}`, `acct:${l.account_id}`);
  }
  return m;
}

// All keys equivalent to `stableKey` (itself when no links).
export async function expandKeys(stableKey) {
  const m = equivalenceMap(await loadIdentityLinks());
  return Array.from(m.get(stableKey) || [stableKey]);
}

// Expand an array of keys to include all linked equivalents.
async function expandKeyList(keys) {
  const m = equivalenceMap(await loadIdentityLinks());
  const out = new Set();
  for (const k of keys) {
    const eq = m.get(k);
    if (eq) for (const e of eq) out.add(e);
    else out.add(k);
  }
  return Array.from(out);
}

// Aggregate one person's stats from their player_results rows.
export async function getPlayerStats(stableKeys) {
  const client = getClient();
  const keys = (stableKeys || []).filter(Boolean);
  if (!keys.length) return emptyStats();

  const { data, error } = await client
    .from('player_results')
    .select('*')
    .in('stable_key', keys);
  if (error) throw error;

  const rows = data || [];
  if (!rows.length) return emptyStats();

  const scores = rows.map((r) => r.score);
  const wins = rows.filter((r) => r.is_winner).length;
  const latest = rows.reduce((a, b) => (a.finished_at > b.finished_at ? a : b));

  return {
    displayName: latest.display_name,
    gamesPlayed: rows.length,
    wins,
    winPct: Math.round((wins / rows.length) * 100),
    avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / rows.length),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    avgRank: Math.round((rows.reduce((s, r) => s + r.rank, 0) / rows.length) * 10) / 10,
    totalHands: rows.reduce((s, r) => s + (r.hands_completed || 0), 0),
    lastPlayedAt: latest.finished_at,
  };
}

function emptyStats() {
  return {
    displayName: '',
    gamesPlayed: 0,
    wins: 0,
    winPct: 0,
    avgScore: 0,
    bestScore: 0,
    worstScore: 0,
    avgRank: 0,
    totalHands: 0,
    lastPlayedAt: null,
  };
}

// Shared leaderboard, grouped by stable_key, sorted client-side.
export async function getLeaderboard({ sortBy = 'wins', minGames = 1 } = {}) {
  const client = getClient();
  const { data, error } = await client
    .from('player_results')
    .select('stable_key, display_name, score, rank, is_winner, finished_at');
  if (error) throw error;

  // Fold each person's device + account rows under one canonical key so a
  // signed-in player who also played before signing in appears only once.
  const canon = canonicalMap(await loadIdentityLinks());
  const keyOf = (k) => canon.get(k) || k;

  const byKey = new Map();
  for (const r of data || []) {
    const ck = keyOf(r.stable_key);
    let g = byKey.get(ck);
    if (!g) {
      g = { stableKey: ck, rows: [], latest: r };
      byKey.set(ck, g);
    }
    g.rows.push(r);
    if (r.finished_at > g.latest.finished_at) g.latest = r;
  }

  const players = [];
  for (const g of byKey.values()) {
    const scores = g.rows.map((r) => r.score);
    const wins = g.rows.filter((r) => r.is_winner).length;
    const gamesPlayed = g.rows.length;
    if (gamesPlayed < minGames) continue;
    players.push({
      stableKey: g.stableKey,
      displayName: g.latest.display_name,
      gamesPlayed,
      wins,
      winPct: Math.round((wins / gamesPlayed) * 100),
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / gamesPlayed),
      bestScore: Math.max(...scores),
      avgRank: Math.round((g.rows.reduce((s, r) => s + r.rank, 0) / gamesPlayed) * 10) / 10,
    });
  }

  const metric = {
    wins: (p) => p.wins,
    winPct: (p) => p.winPct,
    avgScore: (p) => p.avgScore,
    bestScore: (p) => p.bestScore,
    gamesPlayed: (p) => p.gamesPlayed,
  }[sortBy] || ((p) => p.wins);

  // avgRank ascending is "better"; everything else descending.
  players.sort((a, b) => metric(b) - metric(a));
  return players;
}

// Head-to-head record between two players (single key each in CORE).
export async function getHeadToHead(keysA, keysB) {
  const client = getClient();
  const a0 = (keysA || []).filter(Boolean);
  const b0 = (keysB || []).filter(Boolean);
  if (!a0.length || !b0.length) return null;

  // Expand each side to include linked device/account identities.
  const [a, b] = await Promise.all([expandKeyList(a0), expandKeyList(b0)]);

  const [{ data: rowsA, error: eA }, { data: rowsB, error: eB }] = await Promise.all([
    client.from('player_results').select('*').in('stable_key', a),
    client.from('player_results').select('*').in('stable_key', b),
  ]);
  if (eA) throw eA;
  if (eB) throw eB;

  const mapA = new Map((rowsA || []).map((r) => [r.game_id, r]));
  const mapB = new Map((rowsB || []).map((r) => [r.game_id, r]));

  const games = [];
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let lastMeetingAt = null;

  for (const [gameId, ra] of mapA) {
    const rb = mapB.get(gameId);
    if (!rb) continue;
    let winner = 'tie';
    if (ra.rank < rb.rank) { winner = 'a'; aWins++; }
    else if (rb.rank < ra.rank) { winner = 'b'; bWins++; }
    else ties++;
    if (!lastMeetingAt || ra.finished_at > lastMeetingAt) lastMeetingAt = ra.finished_at;
    games.push({
      gameId,
      finishedAt: ra.finished_at,
      aScore: ra.score,
      bScore: rb.score,
      aRank: ra.rank,
      bRank: rb.rank,
      winner,
    });
  }
  games.sort((x, y) => (x.finishedAt < y.finishedAt ? 1 : -1));

  const summarize = (rows) => {
    const shared = rows.filter((r) => mapA.has(r.game_id) && mapB.has(r.game_id));
    const scores = shared.map((r) => r.score);
    return {
      avgScore: scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
    };
  };

  return {
    a: {
      displayName: (rowsA && rowsA.length) ? rowsA.reduce((x, y) => (x.finished_at > y.finished_at ? x : y)).display_name : 'You',
      wins: aWins,
      ...summarize(rowsA || []),
    },
    b: {
      displayName: (rowsB && rowsB.length) ? rowsB.reduce((x, y) => (x.finished_at > y.finished_at ? x : y)).display_name : 'Opponent',
      wins: bWins,
      ...summarize(rowsB || []),
    },
    sharedGames: games.length,
    aWins,
    bWins,
    ties,
    lastMeetingAt,
    games,
  };
}

// History list (newest first), with simple keyset paging via `before`.
export async function getGameHistory({ limit = 30, before = null } = {}) {
  const client = getClient();
  let q = client
    .from('game_results')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('finished_at', before);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((g) => ({
    gameId: g.game_id,
    code: g.code,
    finishedAt: g.finished_at,
    playerCount: g.player_count,
    totalPoints: g.total_points,
    winnerName: g.winner_name,
  }));
}

// Full standings for one finished game.
export async function getGameHistoryDetail(gameId) {
  const client = getClient();
  const [{ data: header, error: hErr }, { data: rows, error: rErr }] = await Promise.all([
    client.from('game_results').select('*').eq('game_id', gameId).maybeSingle(),
    client.from('player_results').select('*').eq('game_id', gameId).order('rank', { ascending: true }),
  ]);
  if (hErr) throw hErr;
  if (rErr) throw rErr;
  return { game: header || null, players: rows || [] };
}
