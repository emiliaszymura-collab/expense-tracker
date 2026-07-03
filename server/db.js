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
  // Per-user isolation columns (idempotent — safe to run on every boot)
  await pool.query(`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS user_id TEXT;`);
  await pool.query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS user_id TEXT;`);
  ready = true;
}

// Assign any pre-multi-user rows (user_id IS NULL) to the migrated legacy account.
async function assignOrphansToUser(userId) {
  if (hasPg) {
    await pool.query(`UPDATE bank_transactions SET user_id=$1 WHERE user_id IS NULL`, [userId]);
    await pool.query(`UPDATE receipts SET user_id=$1 WHERE user_id IS NULL`, [userId]);
  } else {
    for (const v of mem.tx.values()) if (v._uid == null) v._uid = userId;
    for (const v of mem.receipts.values()) if (v._uid == null) v._uid = userId;
  }
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

// ── Bank transactions (deduped by id, scoped per user) ──
async function saveTransactions(userId, list) {
  if (!list || !list.length) return 0;
  if (hasPg) {
    let added = 0;
    for (const e of list) {
      const r = await pool.query(
        `INSERT INTO bank_transactions(id,amount,description,category,date,notes,user_id)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
        [e.id, e.amount, e.description, e.category, e.date, e.notes || null, userId]
      );
      added += r.rowCount;
    }
    return added;
  }
  let added = 0;
  for (const e of list) { if (!mem.tx.has(e.id)) { mem.tx.set(e.id, { ...e, _uid: userId }); added++; } }
  return added;
}

async function loadTransactions(userId) {
  if (hasPg) {
    const r = await pool.query(`SELECT id,amount,description,category,date,notes FROM bank_transactions WHERE user_id=$1 ORDER BY date DESC`, [userId]);
    return r.rows.map(row => ({ ...row, amount: Number(row.amount), notes: row.notes || undefined }));
  }
  return Array.from(mem.tx.values()).filter(v => v._uid === userId).map(({ _uid, ...e }) => e);
}

// ── Receipts (scanned receipt archive, searchable by store/product) ──
function receiptSearchText(r) {
  return [r.store, (r.items || []).map(i => (typeof i === 'string' ? i : i.name)).join(' '), r.notes]
    .filter(Boolean).join(' ').toLowerCase();
}

async function saveReceipt(userId, r) {
  const search = receiptSearchText(r);
  if (hasPg) {
    await pool.query(
      `INSERT INTO receipts(id,date,store,total,items,category,notes,image,search,user_id,created_at)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,now()) ON CONFLICT(id) DO NOTHING`,
      [r.id, r.date, r.store, r.total, JSON.stringify(r.items || []), r.category, r.notes || null, r.image || null, search, userId]
    );
  } else {
    mem.receipts.set(r.id, { ...r, search, _uid: userId });
  }
  return r.id;
}

// List receipt metadata (no image) with optional search by store/product/notes
async function listReceipts(userId, q) {
  if (hasPg) {
    const rows = q
      ? (await pool.query(`SELECT id,date,store,total,items,category,notes FROM receipts WHERE user_id=$1 AND search LIKE $2 ORDER BY date DESC NULLS LAST`, [userId, '%' + q.toLowerCase() + '%'])).rows
      : (await pool.query(`SELECT id,date,store,total,items,category,notes FROM receipts WHERE user_id=$1 ORDER BY date DESC NULLS LAST`, [userId])).rows;
    return rows.map(r => ({ ...r, total: r.total != null ? Number(r.total) : null }));
  }
  let arr = Array.from(mem.receipts.values()).filter(r => r._uid === userId);
  if (q) arr = arr.filter(r => (r.search || '').includes(q.toLowerCase()));
  arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return arr.map(({ image, search, _uid, ...meta }) => meta);
}

// Full receipt incl. image (scoped to the owner)
async function getReceipt(userId, id) {
  if (hasPg) {
    const r = (await pool.query(`SELECT id,date,store,total,items,category,notes,image FROM receipts WHERE id=$1 AND user_id=$2`, [id, userId])).rows[0];
    return r ? { ...r, total: r.total != null ? Number(r.total) : null } : null;
  }
  const r = mem.receipts.get(id);
  if (!r || r._uid !== userId) return null;
  const { search, _uid, ...rest } = r;
  return rest;
}

async function deleteReceipt(userId, id) {
  if (hasPg) await pool.query(`DELETE FROM receipts WHERE id=$1 AND user_id=$2`, [id, userId]);
  else { const r = mem.receipts.get(id); if (r && r._uid === userId) mem.receipts.delete(id); }
}

module.exports = {
  init, setKV, getKV, saveTransactions, loadTransactions,
  saveReceipt, listReceipts, getReceipt, deleteReceipt,
  assignOrphansToUser,
  get durable() { return hasPg; }, get ready() { return ready; },
};
