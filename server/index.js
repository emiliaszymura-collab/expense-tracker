require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const tink = require('./tink');
const gc = require('./gocardless');
const eb = require('./enablebanking');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Same-origin frontend is served from ./public, so CORS can be permissive
app.use(cors());
app.use(express.json());

// Serve the built React frontend (same origin as the API)
app.use(express.static(path.join(__dirname, 'public')));

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
//  Enable Banking — real PL banks for individuals (Restricted Production)
// ════════════════════════════════════════════════════════════
// state → { aspspName, country }  ;  ebSession holds the active link
const ebStates = {};
let ebSession = null; // { sessionId, accounts: [{uid,name,currency,iban}] }

app.get('/api/eb/health', (req, res) => {
  res.json({ configured: eb.configured(), connected: !!ebSession });
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
    const redirectUrl = req.headers.origin || FRONTEND_URL;
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
    const accounts = await Promise.all((session.accounts || []).map(async a => {
      const bal = await eb.getBalances(a.uid);
      return {
        uid: a.uid,
        name: a.name || a.account_id?.iban || 'Konto',
        iban: a.account_id?.iban,
        currency: a.currency || bal?.currency || 'PLN',
        balance: bal ? bal.amount : null,
      };
    }));
    ebSession = { sessionId: session.session_id, accounts };
    res.json({ connected: true, accounts });
  } catch (err) {
    console.error('[eb/session]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Current accounts (if connected)
app.get('/api/eb/accounts', (req, res) => {
  if (!ebSession) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
  res.json({ connected: true, accounts: ebSession.accounts });
});

// Pull transactions for all linked accounts → mapped expenses
app.get('/api/eb/transactions', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    if (!ebSession) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
    const { fromDate, categories } = req.query;
    const catList = categories ? categories.split(',') : null;
    // This request is user-triggered → send PSU headers so the bank lifts background limits
    const psu = { ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(), userAgent: req.headers['user-agent'] };

    let expenses = [];
    for (const acc of ebSession.accounts) {
      const txs = await eb.getTransactions(acc.uid, fromDate, psu);
      expenses = expenses.concat(txs.map(t => eb.mapTransaction(t, catList)).filter(Boolean));
    }
    const seen = new Set();
    expenses = expenses.filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
    res.json({ expenses, total: expenses.length });
  } catch (err) {
    console.error('[eb/transactions]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// SPA fallback: any non-API GET returns index.html
app.get(/^(?!\/(api|health)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Tink server na porcie ${PORT}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  const ready = process.env.TINK_CLIENT_SECRET && process.env.TINK_CLIENT_SECRET !== 'your_client_secret_here';
  console.log(`   Tink API: ${ready ? '✅ skonfigurowany' : '⚠️  brakuje TINK_CLIENT_SECRET'}`);
  console.log(`   GoCardless: ${gcConfigured() ? '✅ skonfigurowany' : '⚠️  brakuje GC_SECRET_ID/GC_SECRET_KEY'}`);
  console.log(`   Enable Banking: ${eb.configured() ? '✅ skonfigurowany' : '⚠️  brakuje EB_APP_ID/EB_PRIVATE_KEY'}`);
});
