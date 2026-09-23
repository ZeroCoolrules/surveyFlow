import { Client, TablesDB, Query } from 'node-appwrite';
import crypto from 'node:crypto';

export const DB_ID = process.env.APPWRITE_DATABASE_ID || 'surveyflow';
export const T = {
  users: 'users',
  completions: 'completions',
  payouts: 'payout_requests',
  settings: 'settings',
};

export function makeDb(req) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key']);
  return new TablesDB(client);
}

export async function listAll(db, tableId, queries = []) {
  const rows = [];
  let cursor;
  for (;;) {
    const page = await db.listRows({
      databaseId: DB_ID,
      tableId,
      queries: [...queries, Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    rows.push(...page.rows);
    if (page.rows.length < 100) return rows;
    cursor = page.rows[page.rows.length - 1].$id;
  }
}

/* ---------- settings (DB value wins, env var is the fallback) ---------- */

export const SETTINGS_KEYS = [
  'CPX_APP_ID',
  'CPX_SECURE_HASH',
  'CPX_POSTBACK_SECRET',
  'BITLABS_API_TOKEN',
  'BITLABS_POSTBACK_SECRET',
  'ADGATE_WALL_CODE',
  'ADGATE_API_KEY',
  'ADGATE_POSTBACK_SECRET',
  'ANTHROPIC_API_KEY',
];

export async function getSetting(db, key) {
  try {
    const row = await db.getRow({ databaseId: DB_ID, tableId: T.settings, rowId: key });
    if (row.value) return row.value;
  } catch (err) {
    if (err.code !== 404) throw err;
  }
  return process.env[key] || undefined;
}

export async function setSetting(db, key, value) {
  const ref = { databaseId: DB_ID, tableId: T.settings, rowId: key };
  if (!value) {
    try {
      await db.deleteRow(ref);
    } catch (err) {
      if (err.code !== 404) throw err;
    }
    return;
  }
  try {
    await db.updateRow({ ...ref, data: { value } });
  } catch (err) {
    if (err.code !== 404) throw err;
    await db.createRow({ ...ref, data: { value } });
  }
}

const mask = (v) => (v.length <= 4 ? '*'.repeat(v.length) : '*'.repeat(v.length - 4) + v.slice(-4));

export async function listSettingsMasked(db) {
  const rows = await listAll(db, T.settings);
  const byKey = new Map(rows.map((r) => [r.$id, r]));
  return SETTINGS_KEYS.map((key) => {
    const row = byKey.get(key);
    const value = row?.value || process.env[key] || '';
    return {
      key,
      configured: Boolean(value),
      source: row?.value ? 'settings' : process.env[key] ? 'env' : 'none',
      masked: value ? mask(value) : '',
      updatedAt: row?.$updatedAt ?? null,
    };
  });
}

/* ---------- completions ledger ---------- */

const completionRowId = (network, txId) =>
  crypto.createHash('sha1').update(`${network}:${txId}`).digest('hex').slice(0, 36);

/** Deterministic row id per (network, transaction) makes postback retries idempotent. */
export async function recordCompletion(db, c, { updateOnConflict }) {
  const rowId = completionRowId(c.network, c.transactionId);
  try {
    await db.createRow({
      databaseId: DB_ID,
      tableId: T.completions,
      rowId,
      data: {
        userId: c.userId,
        network: c.network,
        offerId: c.offerId,
        transactionId: c.transactionId,
        rewardCents: c.rewardCents,
        status: c.status,
        raw: JSON.stringify(c.raw),
      },
    });
  } catch (err) {
    if (err.code !== 409) throw err;
    if (updateOnConflict) {
      await db.updateRow({ databaseId: DB_ID, tableId: T.completions, rowId, data: { status: c.status } });
    }
  }
}

/* ---------- survey networks ---------- */

export async function fetchCpxOffers(db, userId) {
  const appId = await getSetting(db, 'CPX_APP_ID');
  const secureHash = await getSetting(db, 'CPX_SECURE_HASH');
  if (!appId || !secureHash) return [];

  const hash = crypto.createHash('md5').update(`${userId}-${secureHash}`).digest('hex');
  const url = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${encodeURIComponent(userId)}&secure_hash=${hash}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CPX offer fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.offers ?? []).map((o) => ({
    network: 'cpx',
    externalOfferId: String(o.offer_id),
    title: o.title ?? 'CPX Survey',
    description: o.title_short ?? '',
    rewardCents: Math.round(parseFloat(o.payout ?? '0') * 100),
    estimatedMinutes: o.loi ? Math.round(parseFloat(o.loi)) : null,
    category: o.category ?? 'Survey',
    clickUrl: o.link,
  }));
}

export async function fetchBitlabsOffers(db, userId) {
  const token = await getSetting(db, 'BITLABS_API_TOKEN');
  if (!token) return [];

  const res = await fetch(`https://api.bitlabs.ai/v2/client/surveys?uid=${encodeURIComponent(userId)}`, {
    headers: { 'X-Api-Token': token },
  });
  if (!res.ok) throw new Error(`BitLabs offer fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).map((o) => ({
    network: 'bitlabs',
    externalOfferId: String(o.id),
    title: o.name ?? 'BitLabs Survey',
    description: o.tags?.join(', ') ?? '',
    rewardCents: Math.round((o.value ?? 0) * 100),
    estimatedMinutes: o.length ? Math.round(o.length) : null,
    category: 'Survey',
    clickUrl: o.click_url,
  }));
}

export async function fetchLiveOffers(db, userId, log) {
  const [cpx, bitlabs] = await Promise.all([
    fetchCpxOffers(db, userId).catch((err) => (log(`[cpx] ${err.message}`), [])),
    fetchBitlabsOffers(db, userId).catch((err) => (log(`[bitlabs] ${err.message}`), [])),
  ]);
  return [...cpx, ...bitlabs];
}

export async function verifyCpxPostback(db, query) {
  const secret = await getSetting(db, 'CPX_POSTBACK_SECRET');
  if (!secret) return false;
  const expected = crypto.createHash('md5').update(`${query.trans_id}-${secret}`).digest('hex');
  return expected === query.secure_hash;
}

/* ---------- AI ranking (assists a human choosing; never answers surveys) ---------- */

const rate = (o) => (o.estimatedMinutes > 0 ? o.rewardCents / o.estimatedMinutes : o.rewardCents);

export async function rankOffers(db, offers, interests) {
  const apiKey = await getSetting(db, 'ANTHROPIC_API_KEY');
  if (!apiKey || offers.length === 0) {
    return offers
      .slice()
      .sort((a, b) => rate(b) - rate(a))
      .map((o) => ({ ...o, matchScore: rate(o), reason: 'Sorted by pay-per-minute (AI ranking not configured).' }));
  }

  const prompt = `You are ranking real, currently-available paid survey opportunities for a user.
User's stated interests: ${interests.join(', ') || 'none given'}.

Offers (JSON):
${JSON.stringify(
  offers.map((o) => ({
    id: `${o.network}:${o.externalOfferId}`,
    title: o.title,
    description: o.description,
    rewardCents: o.rewardCents,
    estimatedMinutes: o.estimatedMinutes,
    category: o.category,
  }))
)}

Return ONLY a JSON array, one object per offer, each: {"id": string, "matchScore": number 0-100, "reason": string (<=15 words)}.
Rank by a blend of pay-per-minute and topical fit with interests.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

  const data = await res.json();
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  const parsed = start === -1 || end === -1 ? [] : JSON.parse(text.slice(start, end + 1));

  const byId = new Map(offers.map((o) => [`${o.network}:${o.externalOfferId}`, o]));
  return parsed
    .map((p) => (byId.has(p.id) ? { ...byId.get(p.id), matchScore: p.matchScore, reason: p.reason } : null))
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
}
