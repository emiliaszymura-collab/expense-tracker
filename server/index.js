require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const tink = require('./tink');
const gc = require('./gocardless');
const eb = require('./enablebanking');
const db = require('./db');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Same-origin frontend is served from ./public, so CORS can be permissive
app.use(cors());
app.use(express.json({ limit: '12mb' })); // receipt images can be large

// Serve the built React frontend (same origin as the API).
// Hashed assets can cache forever; index.html must always revalidate so new deploys show up.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));

// In-memory token store (w produkcji: baza danych)
const tokenStore = {}; // userId → { access_token, refresh_token, expires_at }
const tinkUserMap = {}; // localUserId → tinkInternalUserId

async function getValidToken(userId) {
  const stored = tokenStore[userId];
  if (!stored) throw new Error('Brak tokenu — połącz bank ponownie');
  if (Date.now() > stored.expires_at - 60000) {
    // Refresh
    const fresh = await tink.refreshToken(stored.refresh_token);
    tokenStore[userId] = {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token || stored.refresh_token,
      expires_at: Date.now() + fresh.expires_in * 1000,
    };
    return tokenStore[userId].access_token;
  }
  return stored.access_token;
}

// ── Health ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    tink: !!(process.env.TINK_CLIENT_ID && process.env.TINK_CLIENT_SECRET &&
             process.env.TINK_CLIENT_SECRET !== 'your_client_secret_here'),
  });
});

// ── Step 1: Init connect — create user + get Tink Link URL ─
// POST /api/connect  { userId }
app.post('/api/connect', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Redirect back to wherever the frontend is served from (same origin)
    const redirectUri = req.headers.origin || FRONTEND_URL;

    // Simple flow: let Tink Link create the user, no pre-creation needed
    const linkUrl = tink.buildTinkLinkUrlSimple(redirectUri);
    const authCode = null;

    res.json({
      linkUrl,
      authCode,
      tinkUserId: userId,
      sandbox: process.env.TINK_SANDBOX === 'true',
    });
  } catch (err) {
    console.error('[connect]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.errorMessage || err.message });
  }
});

// ── Step 2: Exchange code after Tink Link redirect ─────────
// POST /api/callback  { code, userId }
app.post('/api/callback', async (req, res) => {
  try {
    const { code, userId } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });

    const tokens = await tink.exchangeCode(code);
    tokenStore[userId] = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };

    res.json({ ok: true });
  } catch (err) {
    console.error('[callback]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.errorMessage || err.message });
  }
});

// ── Accounts ───────────────────────────────────────────────
// GET /api/accounts?userId=xxx
app.get('/api/accounts', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const token = await getValidToken(userId);
    const accounts = await tink.listAccounts(token);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Transactions ───────────────────────────────────────────
// GET /api/transactions?userId=xxx&accountId=xxx&fromDate=YYYY-MM-DD&categories=...
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId, accountId, fromDate, categories } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const token = await getValidToken(userId);
    const catList = categories ? categories.split(',') : null;
    const rawTxs = await tink.listTransactions(token, accountId, fromDate);

    // Only outgoing transactions (expenses)
    const expenses = rawTxs
      .filter(tx => {
        const val = tx.amount?.value?.unscaledValue;
        return val !== undefined ? val < 0 : false;
      })
      .map(tx => tink.mapTransaction(tx, catList));

    res.json({ expenses, total: expenses.length });
  } catch (err) {
    console.error('[transactions]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Webhook ────────────────────────────────────────────────
app.post('/api/webhook', (req, res) => {
  console.log('[Tink Webhook]', JSON.stringify(req.body, null, 2));
  res.json({ received: true });
});

// ════════════════════════════════════════════════════════════
//  GoCardless Bank Account Data — real banks (Poland), free
// ════════════════════════════════════════════════════════════
const gcConfigured = () => !!(process.env.GC_SECRET_ID && process.env.GC_SECRET_KEY);

// reference → { requisitionId, accountIds }  (Phase A: in-memory; Phase B: Postgres)
const reqStore = {};
let activeRequisition = null; // last successfully linked requisition

app.get('/api/gc/health', (req, res) => {
  res.json({ configured: gcConfigured() });
});

// List Polish banks
app.get('/api/gc/banks', async (req, res) => {
  try {
    if (!gcConfigured()) return res.status(400).json({ error: 'GoCardless nie skonfigurowany' });
    const banks = await gc.listInstitutions(req.query.country || 'PL');
    res.json(banks);
  } catch (err) {
    console.error('[gc/banks]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Start bank link: create requisition, return redirect link
app.post('/api/gc/connect', async (req, res) => {
  try {
    if (!gcConfigured()) return res.status(400).json({ error: 'GoCardless nie skonfigurowany' });
    const { institutionId } = req.body;
    if (!institutionId) return res.status(400).json({ error: 'institutionId required' });

    const reference = `et_${Date.now()}`;
    const redirectUrl = req.headers.origin || FRONTEND_URL;
    const { id, link } = await gc.createRequisition(institutionId, redirectUrl, reference);
    reqStore[reference] = { requisitionId: id, accountIds: null };
    res.json({ link, reference, requisitionId: id });
  } catch (err) {
    console.error('[gc/connect]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// After redirect back (?ref=): resolve accounts for the requisition
app.get('/api/gc/accounts', async (req, res) => {
  try {
    if (!gcConfigured()) return res.status(400).json({ error: 'GoCardless nie skonfigurowany' });
    const { ref, requisitionId } = req.query;
    let reqId = requisitionId || (ref && reqStore[ref]?.requisitionId) || activeRequisition;
    if (!reqId) return res.status(400).json({ error: 'Brak połączenia — połącz bank ponownie' });

    const requisition = await gc.getRequisition(reqId);
    if (requisition.status !== 'LN') {
      return res.status(202).json({ status: requisition.status, accounts: [] });
    }
    const ids = requisition.accounts || [];
    if (ref && reqStore[ref]) reqStore[ref].accountIds = ids;
    activeRequisition = reqId;

    const accounts = await Promise.all(ids.map(id => gc.getAccountDetails(id)));
    res.json({ status: 'LN', requisitionId: reqId, accounts });
  } catch (err) {
    console.error('[gc/accounts]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Pull transactions for all linked accounts → mapped expenses
app.get('/api/gc/transactions', async (req, res) => {
  try {
    if (!gcConfigured()) return res.status(400).json({ error: 'GoCardless nie skonfigurowany' });
    const { ref, requisitionId, fromDate, categories } = req.query;
    let reqId = requisitionId || (ref && reqStore[ref]?.requisitionId) || activeRequisition;
    if (!reqId) return res.status(400).json({ error: 'Brak połączenia — połącz bank ponownie' });

    const requisition = await gc.getRequisition(reqId);
    const ids = requisition.accounts || [];
    const catList = categories ? categories.split(',') : null;

    let expenses = [];
    for (const id of ids) {
      const txs = await gc.getTransactions(id, fromDate);
      expenses = expenses.concat(txs.map(t => gc.mapTransaction(t, catList)).filter(Boolean));
    }
    // De-duplicate by id
    const seen = new Set();
    expenses = expenses.filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
    res.json({ expenses, total: expenses.length });
  } catch (err) {
    console.error('[gc/transactions]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  Auth — passkey (Face ID) login with PIN master credential
// ════════════════════════════════════════════════════════════
function rpInfo(req) {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  let rpID;
  try { rpID = new URL(origin).hostname; } catch { rpID = (req.headers.host || '').split(':')[0]; }
  return { origin, rpID };
}

// Gate is only enforced once a PIN has been configured (non-breaking rollout)
async function requireAuth(req, res, next) {
  try {
    if (!(await auth.isConfigured())) return next();
    if (await auth.verifyToken(req.headers['x-auth-token'])) return next();
    return res.status(401).json({ error: 'unauthorized' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

app.get('/api/auth/status', async (req, res) => {
  try {
    res.json({
      configured: await auth.isConfigured(),
      hasPasskey: await auth.hasCredentials(),
      authed: await auth.verifyToken(req.headers['x-auth-token']),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// First-time PIN setup (only when not yet configured), or PIN login
app.post('/api/auth/setup', async (req, res) => {
  try {
    if (await auth.isConfigured()) return res.status(400).json({ error: 'PIN już ustawiony' });
    await auth.setPin(req.body.pin);
    res.json({ token: await auth.issueToken() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/pin', async (req, res) => {
  try {
    if (!(await auth.verifyPin(req.body.pin))) return res.status(401).json({ error: 'Błędny PIN' });
    res.json({ token: await auth.issueToken() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Register a passkey on this device (requires a valid session: PIN login or existing passkey)
app.post('/api/auth/passkey/register/options', requireAuth, async (req, res) => {
  try {
    if (!(await auth.verifyToken(req.headers['x-auth-token']))) return res.status(401).json({ error: 'Zaloguj PIN-em najpierw' });
    res.json(await auth.registrationOptions(rpInfo(req).rpID));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/passkey/register/verify', requireAuth, async (req, res) => {
  try {
    if (!(await auth.verifyToken(req.headers['x-auth-token']))) return res.status(401).json({ error: 'Zaloguj PIN-em najpierw' });
    const { origin, rpID } = rpInfo(req);
    const ok = await auth.verifyRegistration(rpID, origin, req.body.response);
    res.json({ verified: ok });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Passkey login (Face ID / fingerprint)
app.post('/api/auth/passkey/login/options', async (req, res) => {
  try { res.json(await auth.authenticationOptions(rpInfo(req).rpID)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/passkey/login/verify', async (req, res) => {
  try {
    const { origin, rpID } = rpInfo(req);
    const ok = await auth.verifyAuthentication(rpID, origin, req.body.response);
    if (!ok) return res.status(401).json({ error: 'Nie udało się zweryfikować' });
    res.json({ token: await auth.issueToken() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Protect all bank endpoints behind the gate (once configured)
app.use('/api/eb', requireAuth);

// ════════════════════════════════════════════════════════════
//  Enable Banking — real PL banks for individuals (Restricted Production)
// ════════════════════════════════════════════════════════════
const ebStates = {};
// Multiple bank connections at once. Each: { bank, sessionId, accounts:[{uid,name,iban,currency,balance,bank}] }
let ebSessions = [];
// Timestamp (ISO) of the last successful bank refresh — shown in the UI.
let ebLastSync = null;

function allEbAccounts() {
  return ebSessions.flatMap(s => s.accounts);
}

// Pull recent transactions for ALL linked accounts across ALL banks and persist them (deduped).
// Also refreshes each account's LIVE balance so the UI shows the current amount.
// psu = optional {ip,userAgent} for user-triggered requests (lifts bank rate limits).
async function refreshBank(psu, fromDate) {
  const from = fromDate || new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0];
  let expenses = [];
  for (const acc of allEbAccounts()) {
    try {
      const txs = await eb.getTransactions(acc.uid, from, psu);
      expenses = expenses.concat(txs.map(t => eb.mapTransaction(t, null)).filter(Boolean));
    } catch (e) {
      console.error(`[refresh ${acc.bank || ''} ${acc.uid}]`, e.response?.data?.message || e.message);
    }
    // Always refresh the live balance, even if a transaction fetch failed.
    try {
      const bal = await eb.getBalances(acc.uid);
      if (bal && typeof bal.amount === 'number') {
        acc.balance = bal.amount;
        if (bal.currency) acc.currency = bal.currency;
      }
    } catch (e) {
      console.error(`[balance ${acc.bank || ''} ${acc.uid}]`, e.response?.data?.message || e.message);
    }
  }
  const seen = new Set();
  expenses = expenses.filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
  const added = await db.saveTransactions(expenses);
  ebLastSync = new Date().toISOString();
  await db.setKV('eb_last_sync', ebLastSync);
  await db.setKV('eb_sessions', ebSessions); // persist refreshed balances
  return { expenses, added, lastSync: ebLastSync, accounts: allEbAccounts() };
}

app.get('/api/eb/health', (req, res) => {
  res.json({ configured: eb.configured(), connected: ebSessions.length > 0, banks: ebSessions.map(s => s.bank), durable: db.durable });
});

// List Polish banks
app.get('/api/eb/banks', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    res.json(await eb.listBanks(req.query.country || 'PL'));
  } catch (err) {
    console.error('[eb/banks]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Start bank authorization → redirect URL
app.post('/api/eb/connect', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    const { aspspName, country } = req.body;
    if (!aspspName) return res.status(400).json({ error: 'aspspName required' });
    const state = `et_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    ebStates[state] = { aspspName, country: country || 'PL' };
    // Enable Banking stores redirect URLs WITH a trailing slash — match exactly or /auth is rejected
    const redirectUrl = (req.headers.origin || FRONTEND_URL).replace(/\/$/, '') + '/';
    const { url } = await eb.startAuth(aspspName, country, redirectUrl, state);
    res.json({ url, state });
  } catch (err) {
    console.error('[eb/connect]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Complete authorization with the callback code → store session + accounts
app.post('/api/eb/session', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });

    const session = await eb.createSession(code);
    const bank = session.aspsp?.name || 'Bank';
    const accounts = await Promise.all((session.accounts || []).map(async a => {
      const bal = await eb.getBalances(a.uid);
      return {
        uid: a.uid,
        name: a.name || a.account_id?.iban || 'Konto',
        iban: a.account_id?.iban,
        currency: a.currency || bal?.currency || 'PLN',
        balance: bal ? bal.amount : null,
        bank,
      };
    }));
    // Replace any existing connection for the same bank, then add this one
    ebSessions = ebSessions.filter(s => s.bank !== bank);
    ebSessions.push({ bank, sessionId: session.session_id, accounts });
    await db.setKV('eb_sessions', ebSessions);
    // Kick off an initial background import so transactions appear automatically
    refreshBank().then(r => console.log(`[eb] initial import +${r.added}`)).catch(e => console.error('[eb initial]', e.message));
    res.json({ connected: true, accounts: allEbAccounts() });
  } catch (err) {
    console.error('[eb/session]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Current accounts across all connected banks (+ last sync time)
app.get('/api/eb/accounts', (req, res) => {
  if (!ebSessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
  res.json({ connected: true, accounts: allEbAccounts(), lastSync: ebLastSync });
});

// Manual "Synchronizuj teraz": refresh transactions + live balances, return how many were added
app.post('/api/eb/sync', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    if (!ebSessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
    const psu = { ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(), userAgent: req.headers['user-agent'] };
    const r = await refreshBank(psu, req.body?.fromDate);
    res.json({ added: r.added, expenses: r.expenses, lastSync: r.lastSync, accounts: r.accounts });
  } catch (err) {
    console.error('[eb/sync]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Pull transactions for all linked accounts → mapped expenses
app.get('/api/eb/transactions', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    if (!ebSessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
    const { fromDate, categories } = req.query;
    const catList = categories ? categories.split(',') : null;
    // This request is user-triggered → send PSU headers so the bank lifts background limits
    const psu = { ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(), userAgent: req.headers['user-agent'] };

    let expenses = [];
    for (const acc of allEbAccounts()) {
      const txs = await eb.getTransactions(acc.uid, fromDate, psu);
      expenses = expenses.concat(txs.map(t => eb.mapTransaction(t, catList)).filter(Boolean));
    }
    const seen = new Set();
    expenses = expenses.filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
    await db.saveTransactions(expenses); // keep the persistent store in sync
    res.json({ expenses, total: expenses.length });
  } catch (err) {
    console.error('[eb/transactions]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// All transactions the server has imported & stored (auto-refresh + manual)
app.get('/api/eb/stored', async (req, res) => {
  try {
    res.json({ expenses: await db.loadTransactions() });
  } catch (err) {
    console.error('[eb/stored]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  Receipts — searchable receipt archive (e.g. for warranties)
// ════════════════════════════════════════════════════════════
app.use('/api/receipts', requireAuth);

app.post('/api/receipts', async (req, res) => {
  try {
    const r = req.body || {};
    if (!r.image && !r.store) return res.status(400).json({ error: 'Brak danych paragonu' });
    const id = r.id || `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.saveReceipt({
      id,
      date: r.date || new Date().toISOString().split('T')[0],
      store: r.store || 'Paragon',
      total: typeof r.total === 'number' ? r.total : (parseFloat(r.total) || null),
      items: Array.isArray(r.items) ? r.items : [],
      category: r.category || null,
      notes: r.notes || null,
      image: r.image || null,
    });
    res.json({ id });
  } catch (err) {
    console.error('[receipts/save]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/receipts', async (req, res) => {
  try {
    res.json({ receipts: await db.listReceipts(req.query.q) });
  } catch (err) {
    console.error('[receipts/list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/receipts/:id', async (req, res) => {
  try {
    const r = await db.getReceipt(req.params.id);
    if (!r) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    await db.deleteReceipt(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback: any non-API GET returns index.html (always revalidated)
app.get(/^(?!\/(api|health)).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize persistence, restore any active bank session, and start the 6h auto-refresh
db.init()
  .then(async () => {
    console.log(`   Baza: ${db.durable ? '✅ PostgreSQL (trwała)' : '⚠️  pamięć (dodaj PostgreSQL na Railway dla trwałości)'}`);
    const saved = await db.getKV('eb_sessions');
    if (Array.isArray(saved) && saved.length) {
      ebSessions = saved;
      console.log(`   Bank: ✅ przywrócono ${saved.length} połączeń (${allEbAccounts().length} kont)`);
    } else {
      // Migrate any old single-session key
      const legacy = await db.getKV('eb_session');
      if (legacy && legacy.accounts) { ebSessions = [{ bank: 'Bank', ...legacy }]; }
    }
    // Restore last sync timestamp
    ebLastSync = (await db.getKV('eb_last_sync')) || null;
    // Automatyczne odświeżanie co 1h (transakcje + salda na żywo)
    setInterval(() => {
      if (!ebSessions.length) return;
      refreshBank()
        .then(r => r.added && console.log(`[auto-refresh] +${r.added} nowych transakcji`))
        .catch(e => console.error('[auto-refresh]', e.message));
    }, 60 * 60 * 1000);
  })
  .catch(e => console.error('[db init]', e.message));

app.listen(PORT, () => {
  console.log(`✅ Tink server na porcie ${PORT}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  const ready = process.env.TINK_CLIENT_SECRET && process.env.TINK_CLIENT_SECRET !== 'your_client_secret_here';
  console.log(`   Tink API: ${ready ? '✅ skonfigurowany' : '⚠️  brakuje TINK_CLIENT_SECRET'}`);
  console.log(`   GoCardless: ${gcConfigured() ? '✅ skonfigurowany' : '⚠️  brakuje GC_SECRET_ID/GC_SECRET_KEY'}`);
  console.log(`   Enable Banking: ${eb.configured() ? '✅ skonfigurowany' : '⚠️  brakuje EB_APP_ID/EB_PRIVATE_KEY'}`);
});
