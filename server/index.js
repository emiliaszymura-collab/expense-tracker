require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const tink = require('./tink');
const gc = require('./gocardless');
const eb = require('./enablebanking');
const db = require('./db');
const auth = require('./auth');
const anthropic = require('./anthropic');

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

// ════════════════════════════════════════════════════════════
//  AI proxy — keeps the Anthropic API key on the backend only.
//  Frontend calls these instead of api.anthropic.com directly.
// ════════════════════════════════════════════════════════════

// ── Simple in-memory rate limiter: max 20 requests / minute / IP ──
const AI_WINDOW_MS = 60 * 1000;
const AI_MAX_PER_WINDOW = 20;
const aiHits = new Map(); // ip → [timestamps]
let aiRequestCount = 0;   // total AI requests since boot (cost control)

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').split(',')[0].trim();
}

function aiRateLimit(req, res, next) {
  const ip = clientIp(req);
  const now = Date.now();
  const hits = (aiHits.get(ip) || []).filter(t => now - t < AI_WINDOW_MS);
  if (hits.length >= AI_MAX_PER_WINDOW) {
    console.warn(`[ai-limit] ${ip} przekroczył limit (${hits.length}/${AI_MAX_PER_WINDOW} w 60s)`);
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Za dużo zapytań — odczekaj chwilę i spróbuj ponownie.' });
  }
  hits.push(now);
  aiHits.set(ip, hits);
  aiRequestCount++;
  console.log(`[ai] #${aiRequestCount} ${req.path} ip:${ip} (${hits.length}/${AI_MAX_PER_WINDOW} w oknie 60s)`);
  next();
}

// Periodically prune stale IP buckets so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of aiHits) {
    const fresh = hits.filter(t => now - t < AI_WINDOW_MS);
    if (fresh.length) aiHits.set(ip, fresh); else aiHits.delete(ip);
  }
}, 5 * 60 * 1000);

app.get('/api/ai/health', (req, res) => res.json({ configured: anthropic.configured() }));

// Chat with the financial advisor. Body: { messages:[{role,content}], system? }
app.post('/api/ai-chat', aiRateLimit, async (req, res) => {
  try {
    if (!anthropic.configured()) return res.status(503).json({ error: 'AI nie jest skonfigurowane na serwerze' });
    const { messages, system } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'Brak wiadomości' });
    if (messages.length > 40) return res.status(400).json({ error: 'Za długa konwersacja' });
    const safe = messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
    if (!safe.length) return res.status(400).json({ error: 'Nieprawidłowe wiadomości' });
    const { text } = await anthropic.createMessage({
      system: typeof system === 'string' ? system.slice(0, 12000) : undefined,
      messages: safe,
      max_tokens: 1024,
    });
    res.json({ text });
  } catch (err) {
    const status = err.response?.status || 500;
    console.error('[ai-chat]', status, err.response?.data?.error?.message || err.message);
    res.status(status >= 400 && status < 600 && status !== 401 ? status : 500).json({ error: 'Asystent AI jest chwilowo niedostępny' });
  }
});

// Scan a receipt image. Body: { image: dataURL|base64, categories:[names] }
app.post('/api/scan-receipt', aiRateLimit, async (req, res) => {
  try {
    if (!anthropic.configured()) return res.status(503).json({ error: 'AI nie jest skonfigurowane na serwerze' });
    const { image, categories } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Brak obrazu' });
    const base64 = image.includes(',') ? image.split(',')[1] : image;
    const mediaType = image.startsWith('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg';
    if (!base64 || base64.length > 8_000_000) return res.status(400).json({ error: 'Nieprawidłowy obraz' });
    const catNames = Array.isArray(categories) ? categories.join(', ') : '';
    const today = new Date().toISOString().split('T')[0];
    const prompt = `Przeanalizuj ten paragon. Odpowiedz TYLKO w formacie JSON (bez markdown):
{"store": "nazwa sklepu", "total": 45.50, "date": "${today}", "category": "Jedzenie", "notes": "", "items": [{"name": "Mleko 2%", "price": 3.49}, {"name": "Chleb", "price": 4.20}]}

Zasady:
- "store": nazwa sklepu/firmy z paragonu
- "total": suma do zapłaty (liczba PLN)
- "date": data zakupu z paragonu (format YYYY-MM-DD); jeśli brak, użyj ${today}
- "category": jedna z: ${catNames}
- "items": lista WSZYSTKICH produktów z paragonu (nazwa + cena jeśli widoczna).
- "notes": dodatkowe info (np. nr paragonu) lub pusty string`;
    const { text } = await anthropic.createMessage({
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    res.json({ text });
  } catch (err) {
    const status = err.response?.status || 500;
    console.error('[scan-receipt]', status, err.response?.data?.error?.message || err.message);
    res.status(status >= 400 && status < 600 && status !== 401 ? status : 500).json({ error: 'Nie udało się rozpoznać paragonu' });
  }
});

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

// Every protected endpoint requires a valid token → resolves to a user.
async function requireAuth(req, res, next) {
  try {
    const user = await auth.userFromToken(req.headers['x-auth-token']);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.userId = user.id;
    req.user = user;
    return next();
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

app.get('/api/auth/status', async (req, res) => {
  try {
    const user = await auth.userFromToken(req.headers['x-auth-token']);
    res.json({
      authed: !!user,
      username: user?.username || null,
      hasPasskey: !!(user?.passkeys && user.passkeys.length),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a new account (username + PIN)
app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await auth.register(req.body.username, req.body.pin);
    res.json({ token: await auth.issueToken(user.id), username: user.username });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Log in to an existing account
app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await auth.login(req.body.username, req.body.pin);
    if (!user) return res.status(401).json({ error: 'Błędna nazwa lub PIN' });
    res.json({ token: await auth.issueToken(user.id), username: user.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Register a passkey on this device (must be logged in)
app.post('/api/auth/passkey/register/options', requireAuth, async (req, res) => {
  try { res.json(await auth.registrationOptions(req.userId, rpInfo(req).rpID)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/passkey/register/verify', requireAuth, async (req, res) => {
  try {
    const { origin, rpID } = rpInfo(req);
    const ok = await auth.verifyRegistration(req.userId, rpID, origin, req.body.response);
    res.json({ verified: ok });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Passkey login (usernameless / discoverable → resolves to the credential's owner)
app.post('/api/auth/passkey/login/options', async (req, res) => {
  try { res.json(await auth.authenticationOptions(rpInfo(req).rpID)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/auth/passkey/login/verify', async (req, res) => {
  try {
    const { origin, rpID } = rpInfo(req);
    const uid = await auth.verifyAuthentication(rpID, origin, req.body.response);
    if (!uid) return res.status(401).json({ error: 'Nie udało się zweryfikować' });
    const user = await auth.getUserById(uid);
    res.json({ token: await auth.issueToken(uid), username: user?.username || null });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Protect all bank endpoints behind the gate (once configured)
app.use('/api/eb', requireAuth);

// ════════════════════════════════════════════════════════════
//  Enable Banking — real PL banks for individuals (Restricted Production)
// ════════════════════════════════════════════════════════════
const ebStates = {};
// Per-user bank state: uid → { sessions:[{bank,sessionId,accounts:[...]}], lastSync:ISO|null }
const ebByUser = new Map();
function ebState(uid) {
  let s = ebByUser.get(uid);
  if (!s) { s = { sessions: [], lastSync: null }; ebByUser.set(uid, s); }
  return s;
}
function accountsOf(uid) {
  return ebState(uid).sessions.flatMap(s => s.accounts);
}
async function persistUserBank(uid) {
  const s = ebState(uid);
  await db.setKV(`eb_sessions:${uid}`, s.sessions);
  await db.setKV(`eb_last_sync:${uid}`, s.lastSync);
}

// Pull recent transactions for ONE user's linked accounts and persist them (deduped, per-user).
// Also refreshes each account's LIVE balance. psu = optional {ip,userAgent} for user-triggered requests.
async function refreshBank(uid, psu, fromDate) {
  const from = fromDate || new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0];
  let expenses = [];
  for (const acc of accountsOf(uid)) {
    try {
      const txs = await eb.getTransactions(acc.uid, from, psu);
      expenses = expenses.concat(txs.map(t => eb.mapTransaction(t, null)).filter(Boolean));
    } catch (e) {
      console.error(`[refresh ${acc.bank || ''} ${acc.uid}]`, e.response?.data?.message || e.message);
    }
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
  const added = await db.saveTransactions(uid, expenses);
  const today = new Date().toISOString().split('T')[0];
  const todays = expenses.filter(e => (e.date || '').startsWith(today)).length;
  console.log(`[sync ${uid.slice(0, 8)}] zmapowano ${expenses.length} (${todays} z dzisiaj), zapisano ${added} nowych | konta: ${accountsOf(uid).length}`);
  ebState(uid).lastSync = new Date().toISOString();
  await persistUserBank(uid);
  return { expenses, added, lastSync: ebState(uid).lastSync, accounts: accountsOf(uid) };
}

app.get('/api/eb/health', (req, res) => {
  const st = ebState(req.userId);
  res.json({ configured: eb.configured(), connected: st.sessions.length > 0, banks: st.sessions.map(s => s.bank), durable: db.durable });
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
    ebStates[state] = { aspspName, country: country || 'PL', userId: req.userId };
    const redirectUrl = (req.headers.origin || FRONTEND_URL).replace(/\/$/, '') + '/';
    const { url } = await eb.startAuth(aspspName, country, redirectUrl, state);
    res.json({ url, state });
  } catch (err) {
    console.error('[eb/connect]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Complete authorization with the callback code → store session + accounts (for this user)
app.post('/api/eb/session', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const uid = req.userId;

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
    const st = ebState(uid);
    st.sessions = st.sessions.filter(s => s.bank !== bank);
    st.sessions.push({ bank, sessionId: session.session_id, accounts });
    await persistUserBank(uid);
    refreshBank(uid).then(r => console.log(`[eb] initial import +${r.added}`)).catch(e => console.error('[eb initial]', e.message));
    res.json({ connected: true, accounts: accountsOf(uid) });
  } catch (err) {
    console.error('[eb/session]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Current accounts for this user (+ last sync time)
app.get('/api/eb/accounts', (req, res) => {
  const st = ebState(req.userId);
  if (!st.sessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
  res.json({ connected: true, accounts: accountsOf(req.userId), lastSync: st.lastSync });
});

// Manual "Synchronizuj teraz": refresh transactions + live balances, return how many were added
app.post('/api/eb/sync', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    if (!ebState(req.userId).sessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
    const psu = { ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(), userAgent: req.headers['user-agent'] };
    const r = await refreshBank(req.userId, psu, req.body?.fromDate);
    res.json({ added: r.added, expenses: r.expenses, lastSync: r.lastSync, accounts: r.accounts });
  } catch (err) {
    console.error('[eb/sync]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Pull transactions for this user's linked accounts → mapped expenses
app.get('/api/eb/transactions', async (req, res) => {
  try {
    if (!eb.configured()) return res.status(400).json({ error: 'Enable Banking nie skonfigurowany' });
    if (!ebState(req.userId).sessions.length) return res.status(400).json({ error: 'Brak połączenia — połącz bank' });
    const { fromDate, categories } = req.query;
    const catList = categories ? categories.split(',') : null;
    const psu = { ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(), userAgent: req.headers['user-agent'] };

    let expenses = [];
    for (const acc of accountsOf(req.userId)) {
      const txs = await eb.getTransactions(acc.uid, fromDate, psu);
      expenses = expenses.concat(txs.map(t => eb.mapTransaction(t, catList)).filter(Boolean));
    }
    const seen = new Set();
    expenses = expenses.filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
    await db.saveTransactions(req.userId, expenses);
    res.json({ expenses, total: expenses.length });
  } catch (err) {
    console.error('[eb/transactions]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// All transactions the server has imported & stored for this user
app.get('/api/eb/stored', async (req, res) => {
  try {
    res.json({ expenses: await db.loadTransactions(req.userId) });
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
    await db.saveReceipt(req.userId, {
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
    res.json({ receipts: await db.listReceipts(req.userId, req.query.q) });
  } catch (err) {
    console.error('[receipts/list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/receipts/:id', async (req, res) => {
  try {
    const r = await db.getReceipt(req.userId, req.params.id);
    if (!r) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    await db.deleteReceipt(req.userId, req.params.id);
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

// Initialize persistence, migrate the legacy single-user, restore per-user bank state, start auto-refresh
db.init()
  .then(async () => {
    console.log(`   Baza: ${db.durable ? '✅ PostgreSQL (trwała)' : '⚠️  pamięć (dodaj PostgreSQL na Railway dla trwałości)'}`);

    // One-time: fold the old single-user PIN into a real account and claim its data
    const legacyUid = await auth.migrateLegacy();
    if (legacyUid) {
      const oldSessions = await db.getKV('eb_sessions');
      const oldLastSync = await db.getKV('eb_last_sync');
      if (Array.isArray(oldSessions) && oldSessions.length) {
        await db.setKV(`eb_sessions:${legacyUid}`, oldSessions);
        await db.setKV(`eb_last_sync:${legacyUid}`, oldLastSync || null);
      }
      await db.assignOrphansToUser(legacyUid);
      console.log(`   Migracja: istniejące dane przypisane do konta ${legacyUid.slice(0, 8)}`);
    }

    // Restore each user's bank connections into memory
    for (const u of await auth.listUsers()) {
      const sessions = await db.getKV(`eb_sessions:${u.id}`);
      if (Array.isArray(sessions) && sessions.length) {
        const st = ebState(u.id);
        st.sessions = sessions;
        st.lastSync = (await db.getKV(`eb_last_sync:${u.id}`)) || null;
      }
    }
    const totalAccounts = [...ebByUser.values()].reduce((n, s) => n + s.sessions.flatMap(x => x.accounts).length, 0);
    console.log(`   Bank: przywrócono ${ebByUser.size} użytkowników z połączeniami (${totalAccounts} kont)`);

    // Automatyczne odświeżanie co 1h dla KAŻDEGO użytkownika z połączonym bankiem
    setInterval(() => {
      for (const [uid, st] of ebByUser) {
        if (!st.sessions.length) continue;
        refreshBank(uid)
          .then(r => r.added && console.log(`[auto-refresh ${uid.slice(0, 8)}] +${r.added} nowych`))
          .catch(e => console.error('[auto-refresh]', e.message));
      }
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
