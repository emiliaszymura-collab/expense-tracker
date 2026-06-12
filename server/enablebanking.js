// Enable Banking integration — real EU/PL banks via PSD2.
// "Restricted Production" lets an individual link their OWN accounts (no KYB).
// Auth: JWT (RS256) signed with an RSA private key; kid = application id.
// Docs: https://enablebanking.com/docs/api/reference/
const crypto = require('crypto');
const axios = require('axios');

const BASE = 'https://api.enablebanking.com';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function privateKey() {
  // Railway stores the PEM; support both real and escaped newlines.
  const raw = process.env.EB_PRIVATE_KEY || '';
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

// Build a short-lived signed JWT for API auth
function buildJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'RS256', kid: process.env.EB_APP_ID };
  const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), privateKey()).toString('base64url');
  return `${data}.${sig}`;
}

function headers(psu) {
  const h = { Authorization: `Bearer ${buildJwt()}`, 'Content-Type': 'application/json' };
  // PSU headers signal the user is actively present → banks lift the 4x/day background limit
  if (psu && psu.ip) h['PSU-IP-Address'] = psu.ip;
  if (psu && psu.userAgent) h['PSU-User-Agent'] = psu.userAgent;
  return h;
}

function configured() {
  return !!(process.env.EB_APP_ID && process.env.EB_PRIVATE_KEY);
}

// ── List banks for a country (Poland) ──────────────────────
async function listBanks(country = 'PL') {
  const res = await axios.get(`${BASE}/aspsps?country=${country.toUpperCase()}`, { headers: headers() });
  return (res.data?.aspsps || []).map(a => ({
    name: a.name,
    country: a.country,
    logo: a.logo,
    psuTypes: a.psu_types,
    maxDays: a.maximum_consent_validity ? Math.floor(a.maximum_consent_validity / 86400) : 90,
  }));
}

// ── Start authorization with a bank → returns redirect URL ──
async function startAuth(aspspName, country, redirectUrl, state) {
  const validUntil = new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString();
  const res = await axios.post(
    `${BASE}/auth`,
    {
      access: { valid_until: validUntil },
      aspsp: { name: aspspName, country: country || 'PL' },
      state,
      redirect_url: redirectUrl,
      psu_type: 'personal',
    },
    { headers: headers() }
  );
  return { url: res.data.url, authorizationId: res.data.authorization_id };
}

// ── Exchange the callback code for a session (+ accounts) ──
async function createSession(code) {
  const res = await axios.post(`${BASE}/sessions`, { code }, { headers: headers() });
  return res.data; // { session_id, accounts: [{ uid, name, currency, account_id:{iban} }], aspsp }
}

async function getSession(sessionId) {
  const res = await axios.get(`${BASE}/sessions/${sessionId}`, { headers: headers() });
  return res.data;
}

async function getBalances(accountUid) {
  try {
    const res = await axios.get(`${BASE}/accounts/${accountUid}/balances`, { headers: headers() });
    const b = res.data?.balances?.[0]?.balance_amount;
    return b ? { amount: Number(b.amount), currency: b.currency } : null;
  } catch (_) { return null; }
}

async function getTransactions(accountUid, dateFrom, psu) {
  let all = [];
  let continuationKey = null;
  do {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (continuationKey) params.set('continuation_key', continuationKey);
    const url = `${BASE}/accounts/${accountUid}/transactions${params.toString() ? '?' + params.toString() : ''}`;
    const res = await axios.get(url, { headers: headers(psu) });
    all = all.concat(res.data?.transactions || []);
    continuationKey = res.data?.continuation_key || null;
  } while (continuationKey && all.length < 1000);
  return all;
}

// ── Map an Enable Banking transaction → app Expense (expenses only) ──
function mapTransaction(tx, userCategories) {
  // DBIT = debit = money leaving the account = an expense
  if (tx.credit_debit_indicator !== 'DBIT') return null;
  const amount = Math.abs(Number(tx.transaction_amount?.amount || 0));
  if (!amount) return null;

  const ri = Array.isArray(tx.remittance_information) ? tx.remittance_information.join(' ') : (tx.remittance_information || '');
  const desc = (ri || tx.creditor?.name || tx.debtor?.name || 'Transakcja bankowa').trim();
  const date = tx.booking_date || tx.value_date || new Date().toISOString().split('T')[0];

  const d = desc.toLowerCase();
  let category = 'Inne';
  if (/biedronka|lidl|żabka|zabka|stokrotka|carrefour|auchan|kaufland|spożyw|spozyw|market|grocery|netto|dino/i.test(d)) category = 'Jedzenie';
  else if (/orlen|bp |shell|circle.?k|paliwo|pkp|uber|bolt|mzk|ztm|parking|mpk|taxi|lotos/i.test(d)) category = 'Transport';
  else if (/allegro|amazon|zalando|media.?markt|rtv|h&m|zara|reserved|shop|sklep|empik/i.test(d)) category = 'Zakupy';
  else if (/netflix|spotify|hbo|disney|cinema|kino|steam|playstation|game|youtube/i.test(d)) category = 'Rozrywka';
  else if (/apteka|pharma|lecznic|dental|medic|doktor|lekarz|szpital|clinic|dr\.?max/i.test(d)) category = 'Zdrowie';
  else if (/czynsz|prąd|prad|gaz|woda|internet|t-mobile|orange|play|plus|rent|utility|upc|vectra/i.test(d)) category = 'Dom';

  if (userCategories && userCategories.length && !userCategories.includes(category)) {
    category = userCategories.includes('Inne') ? 'Inne' : userCategories[0];
  }

  const id = tx.entry_reference || tx.transaction_id || `${date}_${amount}_${desc.slice(0, 12)}`;
  return {
    id: `eb_${id}`,
    amount: Math.round(amount * 100) / 100,
    description: desc.slice(0, 120),
    category,
    date: typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0],
    notes: tx.creditor?.name ? `Odbiorca: ${tx.creditor.name}` : undefined,
  };
}

module.exports = {
  configured,
  listBanks,
  startAuth,
  createSession,
  getSession,
  getBalances,
  getTransactions,
  mapTransaction,
};
