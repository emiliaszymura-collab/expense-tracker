// Lightweight persistence layer.
// If DATABASE_URL is set (Railway PostgreSQL) → durable storage that survives restarts.
// Otherwise → in-memory fallback (works, but resets on redeploy).
let pool = null;
let ready = false;
const mem = { kv: new Map(), tx: new Map() };

// Accept either the internal (preferred) or public Railway connection string
const CONN = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';
const hasPg = !!CONN;

async function init() {
  if (!hasPg) { ready = true; return; }
  const { Pool } = require('pg');
  const internal = CONN.includes('localhost') || CONN.includes('.railway.internal');
  pool = new Pool({
    connectionString: CONN,
    ssl: internal ? false : { rejectUnauthorized: false },
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id          TEXT PRIMARY KEY,
      amount      NUMERIC NOT NULL,
      description TEXT,
      category    TEXT,
      date        TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    );
  `);
  ready = true;
}

// ── Key/value (used for the active bank session) ──
async function setKV(key, value) {
  if (hasPg) {
    // Serialize every value to JSON text so strings/arrays/objects all fit the JSONB column
    await pool.query(
      `INSERT INTO kv(key,value,updated_at) VALUES($1,$2::jsonb,now())
       ON CONFLICT(key) DO UPDATE SET value=$2::jsonb, updated_at=now()`,
      [key, JSON.stringify(value)]
    );
  } else {
    mem.kv.set(key, value);
  }
}

async function getKV(key) {
  if (hasPg) {
    const r = await pool.query(`SELECT value FROM kv WHERE key=$1`, [key]);
    return r.rows[0]?.value ?? null;
  }
  return mem.kv.get(key) ?? null;
}

// ── Bank transactions (deduped by id) ──
async function saveTransactions(list) {
  if (!list || !list.length) return 0;
  if (hasPg) {
    let added = 0;
    for (const e of list) {
      const r = await pool.query(
        `INSERT INTO bank_transactions(id,amount,description,category,date,notes)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
        [e.id, e.amount, e.description, e.category, e.date, e.notes || null]
      );
      added += r.rowCount;
    }
    return added;
  }
  let added = 0;
  for (const e of list) { if (!mem.tx.has(e.id)) { mem.tx.set(e.id, e); added++; } }
  return added;
}

async function loadTransactions() {
  if (hasPg) {
    const r = await pool.query(`SELECT id,amount,description,category,date,notes FROM bank_transactions ORDER BY date DESC`);
    return r.rows.map(row => ({ ...row, amount: Number(row.amount), notes: row.notes || undefined }));
  }
  return Array.from(mem.tx.values());
}

module.exports = { init, setKV, getKV, saveTransactions, loadTransactions, get durable() { return hasPg; }, get ready() { return ready; } };
