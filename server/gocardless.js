// GoCardless Bank Account Data (formerly Nordigen) integration
// Free real-bank access (PSD2) for the EU, incl. Poland.
// Docs: https://developer.gocardless.com/bank-account-data/
const axios = require('axios');

const BASE = 'https://bankaccountdata.gocardless.com/api/v2';

// ── Access token (cached in-memory; refreshed when near expiry) ──
let _token = null; // { access, refresh, access_expires_at, refresh_expires_at }

async function getAccessToken() {
  const now = Date.now();
  if (_token && now < _token.access_expires_at - 60000) {
    return _token.access;
  }
  // Try refresh first if we have a valid refresh token
  if (_token && _token.refresh && now < _token.refresh_expires_at - 60000) {
    try {
      const res = await axios.post(`${BASE}/token/refresh/`, { refresh: _token.refresh });
      _token.access = res.data.access;
      _token.access_expires_at = now + res.data.access_expires * 1000;
      return _token.access;
    } catch (_) { /* fall through to new token */ }
  }
  // Brand-new token from secrets
  const res = await axios.post(`${BASE}/token/new/`, {
    secret_id: process.env.GC_SECRET_ID,
    secret_key: process.env.GC_SECRET_KEY,
  });
  _token = {
    access: res.data.access,
    refresh: res.data.refresh,
    access_expires_at: now + res.data.access_expires * 1000,
    refresh_expires_at: now + res.data.refresh_expires * 1000,
  };
  return _token.access;
}

async function authHeaders() {
  const access = await getAccessToken();
  return { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

// ── List banks for a country (default Poland) ──────────────
async function listInstitutions(country = 'PL') {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/institutions/?country=${country.toLowerCase()}`, { headers });
  // Return a trimmed list useful for the UI
  return (res.data || []).map(i => ({
    id: i.id,
    name: i.name,
    logo: i.logo,
    bic: i.bic,
    maxAccessDays: Number(i.max_access_valid_for_days || i.transaction_total_days || 90),
  }));
}

// ── Create a requisition (the bank-link flow) ──────────────
// Returns { id, link } — redirect the user to `link`.
async function createRequisition(institutionId, redirectUrl, reference) {
  const headers = await authHeaders();
  const res = await axios.post(
    `${BASE}/requisitions/`,
    {
      redirect: redirectUrl,
      institution_id: institutionId,
      reference: reference || `ref_${Date.now()}`,
      user_language: 'PL',
    },
    { headers }
  );
  return { id: res.data.id, link: res.data.link, reference: res.data.reference };
}

// ── Fetch a requisition (status + linked account ids) ──────
async function getRequisition(requisitionId) {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/requisitions/${requisitionId}/`, { headers });
  return res.data; // { id, status, accounts: [...], institution_id, ... }
}

// ── Account metadata + balances ────────────────────────────
async function getAccountDetails(accountId) {
  const headers = await authHeaders();
  const [meta, det, bal] = await Promise.all([
    axios.get(`${BASE}/accounts/${accountId}/`, { headers }).then(r => r.data).catch(() => ({})),
    axios.get(`${BASE}/accounts/${accountId}/details/`, { headers }).then(r => r.data?.account || {}).catch(() => ({})),
    axios.get(`${BASE}/accounts/${accountId}/balances/`, { headers }).then(r => r.data?.balances || []).catch(() => []),
  ]);
  const balance = bal[0]?.balanceAmount;
  return {
    id: accountId,
    iban: meta.iban || det.iban,
    name: det.name || det.product || det.ownerName || 'Konto',
    currency: det.currency || balance?.currency || 'PLN',
    balance: balance ? Number(balance.amount) : null,
  };
}

// ── Transactions for one account ───────────────────────────
async function getTransactions(accountId, dateFrom) {
  const headers = await authHeaders();
  const url = `${BASE}/accounts/${accountId}/transactions/` + (dateFrom ? `?date_from=${dateFrom}` : '');
  const res = await axios.get(url, { headers });
  const booked = res.data?.transactions?.booked || [];
  return booked;
}

// ── Map a GoCardless transaction → app Expense (expenses only) ──
function mapTransaction(tx, userCategories) {
  const raw = Number(tx.transactionAmount?.amount || 0);
  if (raw >= 0) return null; // only outgoing = expenses
  const amount = Math.abs(raw);
  const desc =
    tx.remittanceInformationUnstructured ||
    (Array.isArray(tx.remittanceInformationUnstructuredArray) ? tx.remittanceInformationUnstructuredArray.join(' ') : '') ||
    tx.creditorName ||
    tx.debtorName ||
    'Transakcja bankowa';
  const date = tx.bookingDate || tx.valueDate || new Date().toISOString().split('T')[0];

  const d = desc.toLowerCase();
  let category = 'Inne';
  if (/biedronka|lidl|żabka|zabka|stokrotka|carrefour|auchan|kaufland|spożyw|spozyw|market|grocery|netto|dino/i.test(d)) category = 'Jedzenie';
  else if (/orlen|bp|shell|circle.?k|paliwo|pkp|uber|bolt|mzk|ztm|parking|mpk|taxi|lotos/i.test(d)) category = 'Transport';
  else if (/allegro|amazon|zalando|media.?markt|rtv|h&m|zara|reserved|shop|sklep|empik/i.test(d)) category = 'Zakupy';
  else if (/netflix|spotify|hbo|disney|cinema|kino|steam|playstation|game|youtube/i.test(d)) category = 'Rozrywka';
  else if (/apteka|pharma|lecznic|dental|medic|doktor|lekarz|szpital|clinic|dr\.?max/i.test(d)) category = 'Zdrowie';
  else if (/czynsz|prąd|prad|gaz|woda|internet|t-mobile|orange|play|plus|rent|utility|upc|vectra/i.test(d)) category = 'Dom';

  if (userCategories && userCategories.length && !userCategories.includes(category)) {
    category = userCategories.includes('Inne') ? 'Inne' : userCategories[0];
  }

  const id = tx.transactionId || tx.internalTransactionId || `${date}_${amount}_${desc.slice(0, 12)}`;
  return {
    id: `gc_${id}`,
    amount: Math.round(amount * 100) / 100,
    description: desc.slice(0, 120),
    category,
    date: typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0],
    notes: tx.creditorName ? `Odbiorca: ${tx.creditorName}` : undefined,
  };
}

module.exports = {
  getAccessToken,
  listInstitutions,
  createRequisition,
  getRequisition,
  getAccountDetails,
  getTransactions,
  mapTransaction,
};
