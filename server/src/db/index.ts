import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../surveyflow.sqlite3');

// Uses Node's built-in SQLite (Node 22.5+) instead of better-sqlite3 --
// no native compiler/build tools required, which keeps this deployable
// on plain GoDaddy Node hosting with no extra setup.
export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  external_offer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_cents INTEGER NOT NULL,
  estimated_minutes INTEGER,
  category TEXT,
  click_url TEXT NOT NULL,
  raw_json TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(network, external_offer_id)
);

-- One row per network-confirmed completion. Inserted ONLY by verified
-- postback/webhook handlers -- never by client-side "complete" calls.
-- This is what makes earnings real instead of simulated.
CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  network TEXT NOT NULL,
  external_offer_id TEXT NOT NULL,
  external_transaction_id TEXT NOT NULL,
  reward_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'reversed')),
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(network, external_transaction_id)
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'paid', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- Network API keys / postback secrets, editable from the app's Settings page
-- after deploy instead of hand-editing .env on the server. Values here take
-- priority over matching env vars (see lib/settings.ts).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
