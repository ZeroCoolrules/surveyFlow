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

/**
 * Fetches the live offer list for a user from CPX Research's public offer API.
 * Docs: https://publisher.cpx-research.com/documentation
 * Requires CPX_APP_ID + CPX_SECURE_HASH in env. Returns [] (not fake data)
 * if the network isn't configured yet.
 */
export async function fetchCpxOffers(userId: string): Promise<NormalizedOffer[]> {
  const appId = getSetting('CPX_APP_ID');
  const secureHash = getSetting('CPX_SECURE_HASH');
  if (!appId || !secureHash) return [];

  const hash = crypto.createHash('md5').update(`${userId}-${secureHash}`).digest('hex');
  const url = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${encodeURIComponent(userId)}&secure_hash=${hash}&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CPX offer fetch failed: ${res.status}`);
  const data = (await res.json()) as { offers?: any[] };

  return (data.offers ?? []).map((o) => ({
    network: 'cpx',
    externalOfferId: String(o.offer_id),
    title: o.title ?? 'CPX Survey',
    description: o.title_short ?? '',
    rewardCents: Math.round(parseFloat(o.payout ?? '0') * 100),
    estimatedMinutes: o.loi ? Math.round(parseFloat(o.loi)) : null,
    category: o.category ?? 'Survey',
    clickUrl: o.link,
    raw: o,
  }));
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

export async function fetchLiveOffers(userId: string): Promise<NormalizedOffer[]> {
  const [cpx, bitlabs] = await Promise.all([
    fetchCpxOffers(userId).catch((err) => {
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
