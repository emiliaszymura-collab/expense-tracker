const axios = require('axios');

const BASE_URL = process.env.SALTEDGE_BASE_URL || 'https://www.saltedge.com/api/v6';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'App-id': process.env.SALTEDGE_APP_ID,
    'Secret': process.env.SALTEDGE_SECRET,
    'Content-Type': 'application/json',
  },
});

// ── Customers ──────────────────────────────────────────────
async function createCustomer(identifier) {
  const res = await client.post('/customers', {
    data: { identifier },
  });
  return res.data.data;
}

async function getCustomer(customerId) {
  const res = await client.get(`/customers/${customerId}`);
  return res.data.data;
}

// ── Connect Sessions ───────────────────────────────────────
async function createConnectSession(customerId, returnTo) {
  const res = await client.post('/connect_sessions/create', {
    data: {
      customer_id: customerId,
      consent: {
        scopes: ['account_details', 'transactions_details'],
        from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
      attempt: {
        return_to: returnTo,
        fetch_scopes: ['accounts', 'transactions'],
      },
      allowed_countries: ['PL'],
    },
  });
  return res.data.data;
}

// ── Connections ────────────────────────────────────────────
async function listConnections(customerId) {
  const res = await client.get('/connections', {
    params: { customer_id: customerId },
  });
  return res.data.data;
}

async function removeConnection(connectionId) {
  const res = await client.delete(`/connections/${connectionId}`);
  return res.data.data;
}

// ── Accounts ───────────────────────────────────────────────
async function listAccounts(connectionId) {
  const res = await client.get('/accounts', {
    params: { connection_id: connectionId },
  });
  return res.data.data;
}

// ── Transactions ───────────────────────────────────────────
async function listTransactions(connectionId, accountId, fromDate) {
  const params = { connection_id: connectionId };
  if (accountId) params.account_id = accountId;
  if (fromDate) params.from_date = fromDate;

  let all = [];
  let nextId = null;

  do {
    if (nextId) params.next_id = nextId;
    const res = await client.get('/transactions', { params });
    all = all.concat(res.data.data);
    nextId = res.data.meta?.next_id || null;
  } while (nextId);

  return all;
}

// ── Map Salt Edge tx → app Expense ────────────────────────
function mapTransaction(tx, categories) {
  const amount = Math.abs(tx.amount);
  const desc = tx.description || tx.extra?.merchant_name || 'Transakcja bankowa';

  // Simple category detection from description
  const descLower = desc.toLowerCase();
  let category = 'Inne';
  if (/biedronka|lidl|żabka|stokrotka|carrefour|spożyw|market|sklep/.test(descLower)) category = 'Jedzenie';
  else if (/orlen|bp|shell|circle k|paliwo|parking|pkp|uber|bolt|mzk|ztm/.test(descLower)) category = 'Transport';
  else if (/allegro|amazon|zalando|media markt|rtv euro|h&m|zara/.test(descLower)) category = 'Zakupy';
  else if (/netflix|spotify|cinema|kino|play|games|steam/.test(descLower)) category = 'Rozrywka';
  else if (/apteka|lecznic|dental|medic|doktor|lekarz|szpital/.test(descLower)) category = 'Zdrowie';
  else if (/czynsz|czynsz|prąd|gaz|woda|internet|t-mobile|orange|play/.test(descLower)) category = 'Dom';

  // Validate against user's categories
  if (categories && !categories.includes(category)) category = categories[0] || 'Inne';

  return {
    id: `se_${tx.id}`,
    amount,
    description: desc,
    category,
    date: tx.made_on,
    notes: tx.extra?.account_balance_snapshot
      ? `Saldo po: ${tx.extra.account_balance_snapshot} ${tx.currency_code}`
      : undefined,
  };
}

module.exports = {
  createCustomer,
  getCustomer,
  createConnectSession,
  listConnections,
  removeConnection,
  listAccounts,
  listTransactions,
  mapTransaction,
};
