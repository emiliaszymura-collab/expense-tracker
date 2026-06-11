require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const tink = require('./tink');

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

// SPA fallback: any non-API GET returns index.html
app.get(/^(?!\/(api|health)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Tink server na porcie ${PORT}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  const ready = process.env.TINK_CLIENT_SECRET && process.env.TINK_CLIENT_SECRET !== 'your_client_secret_here';
  console.log(`   Tink API: ${ready ? '✅ skonfigurowany' : '⚠️  brakuje TINK_CLIENT_SECRET'}`);
});
