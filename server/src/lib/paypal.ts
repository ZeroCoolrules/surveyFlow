import { getSetting } from './settings.js';

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

function baseUrl(): string {
  const mode = getSetting('PAYPAL_MODE') || 'sandbox';
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken(): Promise<string> {
  const clientId = getSetting('PAYPAL_CLIENT_ID');
  const clientSecret = getSetting('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)');

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface SendPayoutResult {
  batchId: string;
  itemId?: string;
  batchStatus?: string;
}

/**
 * Sends a single payout via PayPal's batch payout API (one item per batch --
 * simpler to reconcile 1:1 against our payout_requests rows than grouping).
 */
export async function sendPayout(params: {
  payoutRequestId: string;
  email: string;
  amountCents: number;
  note?: string;
}): Promise<SendPayoutResult> {
  const token = await getAccessToken();
  const amount = (params.amountCents / 100).toFixed(2);

  const res = await fetch(`${baseUrl()}/v1/payments/payouts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: params.payoutRequestId, // idempotency key
        email_subject: 'You have a SurveyFlow payout!',
        email_message: 'Thanks for using SurveyFlow -- your reward is on its way.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: amount, currency: 'USD' },
          note: params.note || 'SurveyFlow earnings payout',
          sender_item_id: params.payoutRequestId,
          receiver: params.email,
        },
      ],
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`PayPal payout failed: ${res.status} ${JSON.stringify(data)}`);

  const batchId = data.batch_header?.payout_batch_id;
  const detail = (await fetch(`${baseUrl()}/v1/payments/payouts/${batchId}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json())) as any;

  const item = detail.items?.[0];
  return { batchId, itemId: item?.payout_item_id, batchStatus: data.batch_header?.batch_status };
}

/** Verifies a PayPal webhook is genuinely from PayPal before trusting it to flip a payout to "paid". */
export async function verifyWebhookSignature(headers: Record<string, unknown>, rawBody: unknown): Promise<boolean> {
  const webhookId = getSetting('PAYPAL_WEBHOOK_ID');
  if (!webhookId) return false;

  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
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
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}
