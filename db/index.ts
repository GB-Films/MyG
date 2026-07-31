import { env } from "cloudflare:workers";

type WeddingEnv = { DB: D1Database; ADMIN_EMAILS?: string };

export function getWeddingEnv() {
  return env as unknown as WeddingEnv;
}

export async function ensureWeddingSchema() {
  const { DB } = getWeddingEnv();
  if (!DB) throw new Error("D1 binding DB is unavailable");

  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      attendance TEXT NOT NULL,
      guest_count INTEGER NOT NULL DEFAULT 1,
      guest_names TEXT NOT NULL DEFAULT '',
      dietary TEXT NOT NULL DEFAULT '',
      transport TEXT NOT NULL DEFAULT 'no',
      song TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS gift_confirmations (
      id TEXT PRIMARY KEY,
      gift_id TEXT NOT NULL,
      gift_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      giver_name TEXT NOT NULL,
      email TEXT NOT NULL,
      dedication TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'transfer_declared',
      created_at TEXT NOT NULL
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS rsvps_created_at_idx ON rsvps (created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS gifts_created_at_idx ON gift_confirmations (created_at)"),
  ]);

  return DB;
}
