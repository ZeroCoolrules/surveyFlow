import type { NormalizedOffer } from './networks.js';
import { getSetting } from './settings.js';

export interface RankedOffer extends NormalizedOffer {
  matchScore: number;
  reason: string;
}

/**
 * Uses Claude to rank REAL live offers by fit with the user's stated interests
 * and effective pay-per-minute. This assists a human in choosing what to do next --
 * it never answers survey questions or submits anything on the user's behalf.
 * Falls back to a plain pay-rate sort if ANTHROPIC_API_KEY isn't set.
 */
export async function rankOpportunitiesForUser(
  offers: NormalizedOffer[],
  interests: string[]
): Promise<RankedOffer[]> {
  const apiKey = getSetting('ANTHROPIC_API_KEY');
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
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  const parsed: { id: string; matchScore: number; reason: string }[] = JSON.parse(extractJsonArray(text));

  const byId = new Map(offers.map((o) => [`${o.network}:${o.externalOfferId}`, o]));
  return parsed
    .map((p) => {
      const offer = byId.get(p.id);
      if (!offer) return null;
      return { ...offer, matchScore: p.matchScore, reason: p.reason };
    })
    .filter((o): o is RankedOffer => o !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

function rate(o: NormalizedOffer) {
  if (!o.estimatedMinutes || o.estimatedMinutes <= 0) return o.rewardCents;
  return o.rewardCents / o.estimatedMinutes;
}

function extractJsonArray(text: string): string {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return '[]';
  return text.slice(start, end + 1);
}
