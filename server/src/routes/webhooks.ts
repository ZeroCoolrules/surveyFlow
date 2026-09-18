import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { verifyCpxPostback } from '../lib/networks.js';
import { getSetting } from '../lib/settings.js';

export const webhooksRouter = Router();

/**
 * CPX Research server-to-server postback.
 * Configure in CPX dashboard as:
 *   https://your-domain.com/api/webhooks/cpx?status={status}&trans_id={trans_id}&user_id={user_id}&amount_local={amount_local}&offer_id={offer_id}&secure_hash={secure_hash}
 * status: 1 = confirmed, 2 = reversed (chargeback/fraud)
 */
webhooksRouter.get('/cpx', (req, res) => {
  const q = req.query as Record<string, string>;

  if (!verifyCpxPostback(q)) {
    return res.status(403).send('invalid hash');
  }

  const status = q.status === '1' ? 'confirmed' : 'reversed';
  const rewardCents = Math.round(parseFloat(q.amount_local ?? '0') * 100);

  db.prepare(
    `INSERT INTO completions (id, user_id, network, external_offer_id, external_transaction_id, reward_cents, status, raw_json)
     VALUES (@id, @userId, 'cpx', @offerId, @transId, @rewardCents, @status, @raw)
     ON CONFLICT(network, external_transaction_id) DO UPDATE SET status = excluded.status`
  ).run({
    id: randomUUID(),
    userId: q.user_id,
    offerId: q.offer_id,
    transId: q.trans_id,
    rewardCents,
    status,
    raw: JSON.stringify(q),
  });

  res.send('1'); // CPX expects a literal "1" response on success
});

/**
 * BitLabs server-to-server postback.
 * Configure in BitLabs dashboard as:
 *   https://your-domain.com/api/webhooks/bitlabs?uid={uid}&val={val}&tx_id={tx_id}&survey_id={survey_id}
 * BitLabs signs callbacks via a shared secret in the query — verify with BITLABS_POSTBACK_SECRET
 * per https://developer.bitlabs.ai/docs/callbacks before going live.
 */
webhooksRouter.get('/bitlabs', (req, res) => {
  const q = req.query as Record<string, string>;
  const secret = getSetting('BITLABS_POSTBACK_SECRET');
  if (!secret || q.secret !== secret) {
    return res.status(403).send('invalid secret');
  }

  db.prepare(
    `INSERT INTO completions (id, user_id, network, external_offer_id, external_transaction_id, reward_cents, status, raw_json)
     VALUES (@id, @userId, 'bitlabs', @offerId, @transId, @rewardCents, 'confirmed', @raw)
     ON CONFLICT(network, external_transaction_id) DO NOTHING`
  ).run({
    id: randomUUID(),
    userId: q.uid,
    offerId: q.survey_id,
    transId: q.tx_id,
    rewardCents: Math.round(parseFloat(q.val ?? '0') * 100),
    raw: JSON.stringify(q),
  });

  res.send('OK');
});
