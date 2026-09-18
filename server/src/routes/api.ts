import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { fetchLiveOffers } from '../lib/networks.js';
import { rankOpportunitiesForUser } from '../lib/ai.js';
import { getSetting } from '../lib/settings.js';

export const apiRouter = Router();

apiRouter.post('/users', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'email required' });

  const existing = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (existing) return res.json(existing);

  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);
  res.status(201).json({ id, email });
});

/** Live opportunities pulled from configured survey networks (empty until API keys are set). */
apiRouter.get('/opportunities/:userId', async (req, res) => {
  try {
    const offers = await fetchLiveOffers(req.params.userId);
    res.json({ offers, networksConfigured: offers.length > 0 || hasAnyNetworkConfigured() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'failed to fetch live offers' });
  }
});

/** AI-ranked view of the same live offers, personalized to the user's stated interests. */
apiRouter.post('/opportunities/:userId/rank', async (req, res) => {
  const { interests } = req.body as { interests?: string[] };
  try {
    const offers = await fetchLiveOffers(req.params.userId);
    const ranked = await rankOpportunitiesForUser(offers, interests ?? []);
    res.json({ ranked });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'failed to rank offers' });
  }
});

/** Real earnings ledger, computed only from network-confirmed completions. */
apiRouter.get('/earnings/:userId', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, network, external_offer_id as offerId, reward_cents as rewardCents, status, created_at as createdAt
       FROM completions WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(req.params.userId);

  const totalCents = (rows as any[])
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + r.rewardCents, 0);

  res.json({ totalCents, entries: rows });
});

apiRouter.post('/payouts/:userId', (req, res) => {
  const { amountCents } = req.body as { amountCents?: number };
  if (!amountCents || amountCents <= 0) return res.status(400).json({ error: 'invalid amount' });

  const confirmed = db
    .prepare(`SELECT COALESCE(SUM(reward_cents), 0) as total FROM completions WHERE user_id = ? AND status = 'confirmed'`)
    .get(req.params.userId) as { total: number };
  const paidOut = db
    .prepare(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM payout_requests WHERE user_id = ? AND status != 'failed'`)
    .get(req.params.userId) as { total: number };

  const available = confirmed.total - paidOut.total;
  if (amountCents > available) {
    return res.status(400).json({ error: 'insufficient balance', available });
  }

  const id = randomUUID();
  db.prepare('INSERT INTO payout_requests (id, user_id, amount_cents) VALUES (?, ?, ?)').run(id, req.params.userId, amountCents);
  // No payment processor is wired up yet -- this records the request only.
  // Once you choose PayPal Payouts / Stripe Connect, mark it "processing" then "paid" here after the real transfer succeeds.
  res.status(201).json({ id, status: 'requested', amountCents });
});

function hasAnyNetworkConfigured() {
  return Boolean(getSetting('CPX_APP_ID') || getSetting('BITLABS_API_TOKEN') || getSetting('ADGATE_API_KEY'));
}
