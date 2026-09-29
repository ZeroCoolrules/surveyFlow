import { Router, type RequestHandler } from 'express';
import { SETTINGS_KEYS, listSettingsMasked, setSetting, type SettingKey } from '../lib/settings.js';
import { db } from '../db/index.js';
import { sendPayout } from '../lib/paypal.js';

export const adminRouter = Router();

const requireAdmin: RequestHandler = (req, res, next) => {
  const configuredToken = process.env.ADMIN_SETTINGS_TOKEN;
  if (!configuredToken) {
    res.status(501).json({
      error: "ADMIN_SETTINGS_TOKEN is not set on the server. Set it in server/.env (or your host's env var UI) and restart before using Settings.",
    });
    return;
  }
  const provided = req.get('x-admin-token');
  if (provided !== configuredToken) {
    res.status(403).json({ error: 'invalid admin token' });
    return;
  }
  next();
};

adminRouter.use(requireAdmin);

/** Lists which network keys are configured, with values masked -- never returns real secret values. */
adminRouter.get('/settings', (_req, res) => {
  res.json({ settings: listSettingsMasked() });
});

adminRouter.put('/settings/:key', (req, res) => {
  const key = req.params.key as SettingKey;
  if (!SETTINGS_KEYS.includes(key)) {
    return res.status(400).json({ error: `unknown setting key: ${key}` });
  }
  const { value } = req.body as { value?: string };
  setSetting(key, value ?? '');
  res.json({ ok: true });
});

adminRouter.get('/payouts', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, user_id as userId, amount_cents as amountCents, payout_email as payoutEmail,
              status, provider_batch_id as providerBatchId, failure_reason as failureReason, created_at as createdAt
       FROM payout_requests ORDER BY created_at DESC`
    )
    .all();
  res.json({ payouts: rows });
});

// Deliberately admin-only and one-request-at-a-time: sending money should
// stay a decision a human makes, not something that fires automatically.
adminRouter.post('/payouts/:id/send', async (req, res) => {
  const row = db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(req.params.id) as
    | { id: string; payout_email: string; amount_cents: number; status: string }
    | undefined;
  if (!row) return res.status(404).json({ error: 'payout request not found' });
  if (row.status !== 'requested') return res.status(400).json({ error: `payout is already ${row.status}` });

  try {
    const result = await sendPayout({
      payoutRequestId: row.id,
      email: row.payout_email,
      amountCents: row.amount_cents,
      note: 'SurveyFlow earnings payout',
    });
    db.prepare('UPDATE payout_requests SET status = ?, provider_batch_id = ?, provider_item_id = ? WHERE id = ?').run(
      'processing',
      result.batchId,
      result.itemId ?? null,
      row.id
    );
    res.json({ ok: true, status: 'processing', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare('UPDATE payout_requests SET failure_reason = ? WHERE id = ?').run(message, row.id);
    console.error(`payout send failed for ${row.id}:`, message);
    res.status(502).json({ error: 'PayPal send failed', detail: message });
  }
});
