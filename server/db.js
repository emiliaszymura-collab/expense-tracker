// Lightweight persistence layer.
// If DATABASE_URL is set (Railway PostgreSQL) → durable storage that survives restarts.
// Otherwise → in-memory fallback (works, but resets on redeploy).
let pool = null;
let ready = false;
const mem = { kv: new Map(), tx: new Map(), receipts: new Map() };

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
    CREATE TABLE IF NOT EXISTS receipts (
      id         TEXT PRIMARY KEY,
      date       TEXT,
      store      TEXT,
      total      NUMERIC,
      items      JSONB,
      category   TEXT,
      notes      TEXT,
      image      TEXT,
      search     TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
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

// ── Receipts (scanned receipt archive, searchable by store/product) ──
function receiptSearchText(r) {
  return [r.store, (r.items || []).map(i => (typeof i === 'string' ? i : i.name)).join(' '), r.notes]
    .filter(Boolean).join(' ').toLowerCase();
}

async function saveReceipt(r) {
  const search = receiptSearchText(r);
  if (hasPg) {
    await pool.query(
      `INSERT INTO receipts(id,date,store,total,items,category,notes,image,search,created_at)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,now()) ON CONFLICT(id) DO NOTHING`,
      [r.id, r.date, r.store, r.total, JSON.stringify(r.items || []), r.category, r.notes || null, r.image || null, search]
    );
  } else {
    mem.receipts.set(r.id, { ...r, search });
  }
  return r.id;
}

// List receipt metadata (no image) with optional search by store/product/notes
async function listReceipts(q) {
  if (hasPg) {
    const rows = q
      ? (await pool.query(`SELECT id,date,store,total,items,category,notes FROM receipts WHERE search LIKE $1 ORDER BY date DESC NULLS LAST`, ['%' + q.toLowerCase() + '%'])).rows
      : (await pool.query(`SELECT id,date,store,total,items,category,notes FROM receipts ORDER BY date DESC NULLS LAST`)).rows;
    return rows.map(r => ({ ...r, total: r.total != null ? Number(r.total) : null }));
  }
  let arr = Array.from(mem.receipts.values());
  if (q) arr = arr.filter(r => (r.search || '').includes(q.toLowerCase()));
  arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return arr.map(({ image, search, ...meta }) => meta);
}

// Full receipt incl. image
async function getReceipt(id) {
  if (hasPg) {
    const r = (await pool.query(`SELECT id,date,store,total,items,category,notes,image FROM receipts WHERE id=$1`, [id])).rows[0];
    return r ? { ...r, total: r.total != null ? Number(r.total) : null } : null;
  }
  const r = mem.receipts.get(id);
  if (!r) return null;
  const { search, ...rest } = r;
  return rest;
}

async function deleteReceipt(id) {
  if (hasPg) await pool.query(`DELETE FROM receipts WHERE id=$1`, [id]);
  else mem.receipts.delete(id);
}

module.exports = {
  init, setKV, getKV, saveTransactions, loadTransactions,
  saveReceipt, listReceipts, getReceipt, deleteReceipt,
  get durable() { return hasPg; }, get ready() { return ready; },
};
