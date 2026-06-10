const axios = require('axios');

const BASE = 'https://api.tink.com';

// ── App-level access token ─────────────────────────────────
async function getAppToken(scope = 'user:create') {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID,
    client_secret: process.env.TINK_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
  });
  const res = await axios.post(`${BASE}/api/v1/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data.access_token;
}

// ── Create Tink user ───────────────────────────────────────
async function createUser(externalUserId, market = 'PL', locale = 'pl_PL') {
  const token = await getAppToken('user:create');
  const res = await axios.post(
    `${BASE}/api/v1/user/create`,
    { external_user_id: externalUserId, market, locale },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data; // { user_id, external_user_id }
}

// ── Get authorization code for Tink Link ──────────────────
async function getAuthorizationCode(tinkUserId, externalUserId, scopes = 'accounts:read,transactions:read,balances:read') {
  const token = await getAppToken('authorization:grant');

  // Try with internal user_id first, fall back to external_user_id
  const body = new URLSearchParams({
    scope: scopes,
    id_hint: externalUserId || tinkUserId,
    actor_client_id: 'df05e4b379934cd09963197cc855bfe9',
  });

  // Use external_user_id if we don't have a proper Tink UUID
  const isExternalId = !tinkUserId || tinkUserId === externalUserId || tinkUserId.startsWith('user_');
  if (isExternalId) {
    body.set('external_user_id', externalUserId || tinkUserId);
  } else {
    body.set('user_id', tinkUserId);
  }

  const res = await axios.post(
    `${BASE}/api/v1/oauth/authorization-grant/delegate`,
    body.toString(),
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.code;
}

// ── Build Tink Link URL (with auth code) ──────────────────
function buildTinkLinkUrl(authCode, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID,
    redirect_uri: redirectUri,
    authorization_code: authCode,
    market: 'PL',
    locale: 'pl_PL',
    scope: 'accounts:read,transactions:read',
    test: process.env.TINK_SANDBOX === 'true' ? 'true' : 'false',
  });
  return `https://link.tink.com/1.0/authorize?${params.toString()}`;
}

// ── Build Tink Link URL (simple, no pre-created user) ─────
function buildTinkLinkUrlSimple(redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'accounts:read,transactions:read,balances:read',
    market: 'PL',
    locale: 'pl_PL',
  });
  if (process.env.TINK_SANDBOX === 'true') {
    params.set('test', 'true');
  }
  return `https://link.tink.com/1.0/authorize/credentials?${params.toString()}`;
}

// ── Exchange callback code for user access token ───────────
async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID,
    client_secret: process.env.TINK_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
  });
  const res = await axios.post(`${BASE}/api/v1/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data; // { access_token, refresh_token, expires_in }
}

// ── Refresh user token ─────────────────────────────────────
async function refreshToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID,
    client_secret: process.env.TINK_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await axios.post(`${BASE}/api/v1/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

// ── List accounts ──────────────────────────────────────────
async function listAccounts(accessToken) {
  const res = await axios.get(`${BASE}/api/v1/accounts/list`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data.accounts || [];
}

// ── List transactions ──────────────────────────────────────
async function listTransactions(accessToken, accountId, fromDate) {
  const params = {};
  if (accountId) params.accountId = accountId;

  let all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await axios.get(`${BASE}/api/v1/transactions/list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ...params, limit, offset },
    });
    const txs = res.data.transactions || [];
    all = all.concat(txs);
    if (txs.length < limit) break;
    offset += limit;
  }

  // Filter by date if requested
  if (fromDate) {
    const from = new Date(fromDate).getTime();
    all = all.filter(tx => {
      const d = tx.dates?.booked || tx.dates?.value;
      return d && new Date(d).getTime() >= from;
    });
  }

  return all;
}

// ── Map Tink transaction → app Expense ────────────────────
function mapTransaction(tx, userCategories) {
  const amount = Math.abs(tx.amount?.value?.unscaledValue / Math.pow(10, tx.amount?.value?.scale) || 0);
  const desc = tx.descriptions?.display || tx.descriptions?.original || 'Transakcja bankowa';
  const date = tx.dates?.booked || tx.dates?.value || new Date().toISOString().split('T')[0];

  // Category detection
  const tinkCat = tx.categories?.pfm?.id || '';
  const descLower = desc.toLowerCase();

  let category = 'Inne';
  if (/biedronka|lidl|żabka|stokrotka|carrefour|auchan|kaufland|spożyw|market|grocery/i.test(descLower) || tinkCat.includes('food')) category = 'Jedzenie';
  else if (/orlen|bp|shell|circle.?k|paliwo|pkp|uber|bolt|mzk|ztm|parking|mpk|taxi/i.test(descLower) || tinkCat.includes('transport')) category = 'Transport';
  else if (/allegro|amazon|zalando|media.?markt|rtv|h&m|zara|reserved|shop|sklep/i.test(descLower) || tinkCat.includes('shopping')) category = 'Zakupy';
  else if (/netflix|spotify|hbo|disney|cinema|kino|steam|playstation|game/i.test(descLower) || tinkCat.includes('entertainment')) category = 'Rozrywka';
  else if (/apteka|pharma|lecznic|dental|medic|doktor|lekarz|szpital|clinic/i.test(descLower) || tinkCat.includes('health')) category = 'Zdrowie';
  else if (/czynsz|prąd|gaz|woda|internet|t-mobile|orange|play|plus|rent|utility/i.test(descLower) || tinkCat.includes('home')) category = 'Dom';

  if (userCategories && !userCategories.includes(category)) {
    category = userCategories[0] || 'Inne';
  }

  return {
    id: `tink_${tx.id}`,
    amount: Math.round(amount * 100) / 100,
    description: desc,
    category,
    date: typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0],
    notes: tx.merchantInformation?.merchantName
      ? `Sklep: ${tx.merchantInformation.merchantName}`
      : undefined,
  };
}

module.exports = {
  getAppToken,
  createUser,
  getAuthorizationCode,
  buildTinkLinkUrl,
  buildTinkLinkUrlSimple,
  exchangeCode,
  refreshToken,
  listAccounts,
  listTransactions,
  mapTransaction,
};
