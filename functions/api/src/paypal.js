import { getSetting } from './lib.js';

/**
 * PayPal Payouts integration. Docs:
 * https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 * https://developer.paypal.com/docs/api/webhooks/v1/
 *
 * Written directly from PayPal's documented API contract. Unlike the CPX
 * integration, this has NOT been exercised against a live PayPal sandbox
 * call -- no PayPal credentials were available to test with. Verify the
 * first real sandbox payout carefully before trusting this in production.
 */

async function baseUrl(db) {
  const mode = (await getSetting(db, 'PAYPAL_MODE')) || 'sandbox';
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken(db) {
  const clientId = await getSetting(db, 'PAYPAL_CLIENT_ID');
  const clientSecret = await getSetting(db, 'PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)');

  const res = await fetch(`${await baseUrl(db)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Sends a single payout via PayPal's batch payout API (one item per batch --
 * simpler to reconcile 1:1 against our payout_requests rows than grouping).
 * Returns the batch + item IDs so the webhook can match the confirmation
 * back to this specific request.
 */
export async function sendPayout(db, { payoutRequestId, email, amountCents, note }) {
  const token = await getAccessToken(db);
  const amount = (amountCents / 100).toFixed(2);

  const res = await fetch(`${await baseUrl(db)}/v1/payments/payouts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: payoutRequestId, // idempotency key -- retrying the same request won't double-pay
        email_subject: 'You have a SurveyFlow payout!',
        email_message: 'Thanks for using SurveyFlow -- your reward is on its way.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: amount, currency: 'USD' },
          note: note || 'SurveyFlow earnings payout',
          sender_item_id: payoutRequestId,
          receiver: email,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal payout failed: ${res.status} ${JSON.stringify(data)}`);

  const batchId = data.batch_header?.payout_batch_id;
  // Item-level detail isn't in the initial response -- fetch it so we have
  // the item ID to match against the webhook's payout_item_id.
  const detail = await fetch(`${await baseUrl(db)}/v1/payments/payouts/${batchId}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const item = detail.items?.[0];
  return { batchId, itemId: item?.payout_item_id, batchStatus: data.batch_header?.batch_status };
}

/**
 * Verifies a PayPal webhook is genuinely from PayPal (not spoofed) using
 * their verify-webhook-signature endpoint. Required before trusting any
 * webhook body to flip a payout to "paid".
 */
export async function verifyWebhookSignature(db, headers, rawBody) {
  const webhookId = await getSetting(db, 'PAYPAL_WEBHOOK_ID');
  if (!webhookId) return false;

  const token = await getAccessToken(db);
  const res = await fetch(`${await baseUrl(db)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: rawBody,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
