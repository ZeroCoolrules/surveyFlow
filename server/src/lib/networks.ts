import crypto from 'crypto';
import { db } from '../db/index.js';
import { getSetting } from './settings.js';

export interface NormalizedOffer {
  network: string;
  externalOfferId: string;
  title: string;
  description: string;
  rewardCents: number;
  estimatedMinutes: number | null;
  category: string;
  clickUrl: string;
  raw: unknown;
}

export interface NetworkContext {
  ip?: string;
  userAgent?: string;
}

/**
 * CPX's live offer API: https://live-api.cpx-research.com/api/get-surveys.php
 * Per their docs, refresh at most every 120s and don't cache longer than that.
 * ip_user is REQUIRED -- without it CPX returns count_surveys:0 with a hint
 * message instead of an error, so it silently looks like "no surveys".
 */
export async function fetchCpxOffers(userId: string, ctx: NetworkContext = {}): Promise<NormalizedOffer[]> {
  const appId = getSetting('CPX_APP_ID');
  const secureHash = getSetting('CPX_SECURE_HASH');
  if (!appId || !secureHash || !ctx.ip) return [];

  const hash = crypto.createHash('md5').update(`${userId}-${secureHash}`).digest('hex');
  const params = new URLSearchParams({
    app_id: appId,
    ext_user_id: userId,
    output_method: 'api',
    limit: '20',
    ip_user: ctx.ip,
    secure_hash: hash,
  });
  if (ctx.userAgent) params.set('user_agent', ctx.userAgent);

  const res = await fetch(`https://live-api.cpx-research.com/api/get-surveys.php?${params}`);
  if (!res.ok) throw new Error(`CPX offer fetch failed: ${res.status}`);
  const data = (await res.json()) as { status?: string; surveys?: any[] };
  if (data.status !== 'success') throw new Error(`CPX API error: ${JSON.stringify(data)}`);

  return (data.surveys ?? []).map((o) => {
    // "payout" is the user-facing reward per CPX's docs, but it reads 0.00 for
    // every survey until currency settings are configured in the CPX publisher
    // dashboard. Fall back to payout_publisher_usd (a real, nonzero figure)
    // rather than show $0.00 everywhere -- revisit once currency is configured.
    const payout = parseFloat(o.payout ?? '0');
    const reward = payout > 0 ? payout : parseFloat(o.payout_publisher_usd ?? '0');
    return {
      network: 'cpx',
      externalOfferId: String(o.id),
      title: o.top === 1 ? 'CPX Survey (Top Rated)' : 'CPX Survey',
      description:
        o.type === 'need_qualification'
          ? 'May ask a few qualifying questions before the survey starts.'
          : 'Ready to start immediately.',
      rewardCents: Math.round(reward * 100),
      estimatedMinutes: o.loi ? Math.round(parseFloat(o.loi)) : null,
      category: o.category || 'Survey',
      clickUrl: o.href_new || o.href,
      raw: o,
    };
  });
}

/**
 * Fetches live offers from BitLabs' offer wall API.
 * Docs: https://developer.bitlabs.ai/docs/offerwall
 */
export async function fetchBitlabsOffers(userId: string): Promise<NormalizedOffer[]> {
  const token = getSetting('BITLABS_API_TOKEN');
  if (!token) return [];

  const res = await fetch(`https://api.bitlabs.ai/v2/client/surveys?uid=${encodeURIComponent(userId)}`, {
    headers: { 'X-Api-Token': token },
  });
  if (!res.ok) throw new Error(`BitLabs offer fetch failed: ${res.status}`);
  const data = (await res.json()) as { data?: any[] };

  return (data.data ?? []).map((o) => ({
    network: 'bitlabs',
    externalOfferId: String(o.id),
    title: o.name ?? 'BitLabs Survey',
    description: o.tags?.join(', ') ?? '',
    rewardCents: Math.round((o.value ?? 0) * 100),
    estimatedMinutes: o.length ? Math.round(o.length) : null,
    category: 'Survey',
    clickUrl: o.click_url,
    raw: o,
  }));
}

export async function fetchLiveOffers(userId: string, ctx: NetworkContext = {}): Promise<NormalizedOffer[]> {
  const [cpx, bitlabs] = await Promise.all([
    fetchCpxOffers(userId, ctx).catch((err) => {
      console.error('[cpx] offer fetch error', err);
      return [];
    }),
    fetchBitlabsOffers(userId).catch((err) => {
      console.error('[bitlabs] offer fetch error', err);
      return [];
    }),
  ]);

  const offers = [...cpx, ...bitlabs];

  const upsert = db.prepare(`
    INSERT INTO opportunities (id, network, external_offer_id, title, description, reward_cents, estimated_minutes, category, click_url, raw_json)
    VALUES (@id, @network, @externalOfferId, @title, @description, @rewardCents, @estimatedMinutes, @category, @clickUrl, @raw)
    ON CONFLICT(network, external_offer_id) DO UPDATE SET
      title = excluded.title, description = excluded.description, reward_cents = excluded.reward_cents,
      estimated_minutes = excluded.estimated_minutes, click_url = excluded.click_url,
      raw_json = excluded.raw_json, fetched_at = datetime('now')
  `);
  for (const o of offers) {
    upsert.run({
      id: `${o.network}:${o.externalOfferId}`,
      network: o.network,
      externalOfferId: o.externalOfferId,
      title: o.title,
      description: o.description,
      rewardCents: o.rewardCents,
      estimatedMinutes: o.estimatedMinutes,
      category: o.category,
      clickUrl: o.clickUrl,
      raw: JSON.stringify(o.raw),
    });
  }

  return offers;
}

/** Verifies a CPX postback's secure hash so only CPX can credit earnings. */
export function verifyCpxPostback(query: Record<string, string>): boolean {
  const secret = getSetting('CPX_POSTBACK_SECRET');
  if (!secret) return false;
  const expected = crypto.createHash('md5').update(`${query.trans_id}-${secret}`).digest('hex');
  return expected === query.secure_hash;
}
