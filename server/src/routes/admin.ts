import { Router, type RequestHandler } from 'express';
import { SETTINGS_KEYS, listSettingsMasked, setSetting, type SettingKey } from '../lib/settings.js';

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
