import { ID, Query } from 'node-appwrite';
import crypto from 'node:crypto';
import {
  DB_ID,
  T,
  SETTINGS_KEYS,
  makeDb,
  listAll,
  getSetting,
  setSetting,
  listSettingsMasked,
  recordCompletion,
  fetchLiveOffers,
  verifyCpxPostback,
  rankOffers,
} from './lib.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, x-admin-token',
};

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export default async ({ req, res, log, error }) => {
  const json = (body, status = 200) => res.json(body, status, CORS);
  const text = (body, status = 200) => res.text(body, status, CORS);

  if (req.method === 'OPTIONS') return res.send('', 204, CORS);

  const path = req.path.replace(/\/+$/, '') || '/';
  const db = makeDb(req);
  let m;

  try {
    if (path === '/health') return json({ ok: true });

    /* ---- users ---- */
    if (path === '/api/users' && req.method === 'POST') {
      const email = req.bodyJson?.email?.trim().toLowerCase();
      if (!email) return json({ error: 'email required' }, 400);

      const found = await db.listRows({
        databaseId: DB_ID,
        tableId: T.users,
        queries: [Query.equal('email', email), Query.limit(1)],
      });
      if (found.rows.length) return json({ id: found.rows[0].$id, email });

      const row = await db.createRow({ databaseId: DB_ID, tableId: T.users, rowId: ID.unique(), data: { email } });
      return json({ id: row.$id, email }, 201);
    }

    /* ---- opportunities ---- */
    if ((m = path.match(/^\/api\/opportunities\/([^/]+)$/)) && req.method === 'GET') {
      const offers = await fetchLiveOffers(db, m[1], log);
      const networksConfigured =
        offers.length > 0 ||
        Boolean(
          (await getSetting(db, 'CPX_APP_ID')) ||
            (await getSetting(db, 'BITLABS_API_TOKEN')) ||
            (await getSetting(db, 'ADGATE_API_KEY'))
        );
      return json({ offers, networksConfigured });
    }

    if ((m = path.match(/^\/api\/opportunities\/([^/]+)\/rank$/)) && req.method === 'POST') {
      const offers = await fetchLiveOffers(db, m[1], log);
      const ranked = await rankOffers(db, offers, req.bodyJson?.interests ?? []);
      return json({ ranked });
    }

    /* ---- earnings + payouts (ledger only ever written by verified postbacks) ---- */
    if ((m = path.match(/^\/api\/earnings\/([^/]+)$/)) && req.method === 'GET') {
      const rows = await listAll(db, T.completions, [Query.equal('userId', m[1]), Query.orderDesc('$createdAt')]);
      const entries = rows.map((r) => ({
        id: r.$id,
        network: r.network,
        offerId: r.offerId,
        rewardCents: r.rewardCents,
        status: r.status,
        createdAt: r.$createdAt,
      }));
      const totalCents = entries.filter((e) => e.status === 'confirmed').reduce((s, e) => s + e.rewardCents, 0);
      return json({ totalCents, entries });
    }

    if ((m = path.match(/^\/api\/payouts\/([^/]+)$/)) && req.method === 'POST') {
      const amountCents = req.bodyJson?.amountCents;
      if (!Number.isInteger(amountCents) || amountCents <= 0) return json({ error: 'invalid amount' }, 400);

      const completions = await listAll(db, T.completions, [Query.equal('userId', m[1]), Query.equal('status', 'confirmed')]);
      const payouts = await listAll(db, T.payouts, [Query.equal('userId', m[1]), Query.notEqual('status', 'failed')]);
      const available =
        completions.reduce((s, r) => s + r.rewardCents, 0) - payouts.reduce((s, r) => s + r.amountCents, 0);
      if (amountCents > available) return json({ error: 'insufficient balance', available }, 400);

      // No payment processor is wired up yet -- this records the request only.
      const row = await db.createRow({
        databaseId: DB_ID,
        tableId: T.payouts,
        rowId: ID.unique(),
        data: { userId: m[1], amountCents, status: 'requested' },
      });
      return json({ id: row.$id, status: 'requested', amountCents }, 201);
    }

    /* ---- network postbacks: the only thing that can credit money ---- */
    if (path === '/api/webhooks/cpx' && req.method === 'GET') {
      const q = req.query;
      if (!(await verifyCpxPostback(db, q))) return text('invalid hash', 403);

      await recordCompletion(
        db,
        {
          network: 'cpx',
          userId: q.user_id,
          offerId: q.offer_id ?? '',
          transactionId: q.trans_id,
          rewardCents: Math.round(parseFloat(q.amount_local ?? '0') * 100),
          status: q.status === '1' ? 'confirmed' : 'reversed',
          raw: q,
        },
        { updateOnConflict: true }
      );
      return text('1'); // CPX expects a literal "1"
    }

    if (path === '/api/webhooks/bitlabs' && req.method === 'GET') {
      const q = req.query;
      const secret = await getSetting(db, 'BITLABS_POSTBACK_SECRET');
      if (!secret || !q.secret || !safeEqual(q.secret, secret)) return text('invalid secret', 403);

      await recordCompletion(
        db,
        {
          network: 'bitlabs',
          userId: q.uid,
          offerId: q.survey_id ?? '',
          transactionId: q.tx_id,
          rewardCents: Math.round(parseFloat(q.val ?? '0') * 100),
          status: 'confirmed',
          raw: q,
        },
        { updateOnConflict: false }
      );
      return text('OK');
    }

    /* ---- admin settings (gated by ADMIN_SETTINGS_TOKEN function variable) ---- */
    if (path.startsWith('/api/admin/')) {
      const configured = process.env.ADMIN_SETTINGS_TOKEN;
      if (!configured) {
        return json(
          { error: 'ADMIN_SETTINGS_TOKEN is not set on the function. Add it as a function variable and redeploy.' },
          501
        );
      }
      const provided = req.headers['x-admin-token'];
      if (!provided || !safeEqual(provided, configured)) return json({ error: 'invalid admin token' }, 403);

      if (path === '/api/admin/settings' && req.method === 'GET') {
        return json({ settings: await listSettingsMasked(db) });
      }
      if ((m = path.match(/^\/api\/admin\/settings\/([A-Z0-9_]+)$/)) && req.method === 'PUT') {
        if (!SETTINGS_KEYS.includes(m[1])) return json({ error: `unknown setting key: ${m[1]}` }, 400);
        await setSetting(db, m[1], req.bodyJson?.value ?? '');
        return json({ ok: true });
      }
    }

    return json({ error: 'not found' }, 404);
  } catch (err) {
    error(`${req.method} ${path} failed: ${err.message}`);
    return json({ error: 'internal error' }, 500);
  }
};
