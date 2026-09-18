import { db } from '../db/index.js';

/** Keys editable from the Settings page. Whitelisted so arbitrary keys can't be written. */
export const SETTINGS_KEYS = [
  'CPX_APP_ID',
  'CPX_SECURE_HASH',
  'CPX_POSTBACK_SECRET',
  'BITLABS_API_TOKEN',
  'BITLABS_POSTBACK_SECRET',
  'ADGATE_WALL_CODE',
  'ADGATE_API_KEY',
  'ADGATE_POSTBACK_SECRET',
  'ANTHROPIC_API_KEY',
] as const;

export type SettingKey = (typeof SETTINGS_KEYS)[number];

const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const upsertStmt = db.prepare(
  `INSERT INTO settings (key, value) VALUES (@key, @value)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
);
const deleteStmt = db.prepare('DELETE FROM settings WHERE key = ?');
const allStmt = db.prepare('SELECT key, value, updated_at as updatedAt FROM settings');

/** DB value wins when set; otherwise falls back to the matching env var. */
export function getSetting(key: SettingKey): string | undefined {
  const row = getStmt.get(key) as { value: string } | undefined;
  if (row?.value) return row.value;
  return process.env[key] || undefined;
}

export function setSetting(key: SettingKey, value: string) {
  if (!value) {
    deleteStmt.run(key);
    return;
  }
  upsertStmt.run({ key, value });
}

/** For the Settings page: which keys are configured (DB or env), values masked. */
export function listSettingsMasked() {
  const dbRows = allStmt.all() as { key: string; value: string; updatedAt: string }[];
  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  return SETTINGS_KEYS.map((key) => {
    const dbRow = dbMap.get(key);
    const value = dbRow?.value || process.env[key] || '';
    return {
      key,
      configured: Boolean(value),
      source: dbRow?.value ? 'settings' : process.env[key] ? 'env' : 'none',
      masked: value ? maskValue(value) : '',
      updatedAt: dbRow?.updatedAt ?? null,
    };
  });
}

function maskValue(value: string) {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
