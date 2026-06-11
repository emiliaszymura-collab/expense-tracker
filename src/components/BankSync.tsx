import React, { useState, useEffect, useCallback } from 'react';
import { Expense, Category } from '../types';

interface Props {
  categories: Category[];
  onImport: (expenses: Expense[]) => void;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balances?: {
    available?: { amount: { value: { unscaledValue: number; scale: number }; currencyCode: string } };
    booked?: { amount: { value: { unscaledValue: number; scale: number }; currencyCode: string } };
  };
}

declare global {
  interface Window {
    TinkLink?: {
      open: (options: {
        client_id: string;
        redirect_uri: string;
        scope: string;
        market: string;
        locale: string;
        authorization_code?: string;
        test?: boolean;
        onSuccess?: (data: { code: string }) => void;
        onError?: (err: { error: string; message: string }) => void;
        onCancel?: () => void;
      }) => void;
    };
  }
}

// Frontend is served from the same origin as the API, so use relative URLs
const SERVER = process.env.REACT_APP_SERVER_URL || '';
const CLIENT_ID = '58213a5a545e457f95997df8b3ccdf95';
const REDIRECT_URI = window.location.origin;

function useLocalStorage<T>(key: string, init: T) {
  const [val, setVal] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? init; } catch { return init; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal] as const;
}

function fmtBalance(acc: Account) {
  const b = acc.balances?.booked?.amount || acc.balances?.available?.amount;
  if (!b) return null;
  const val = b.value.unscaledValue / Math.pow(10, b.value.scale);
  return val.toLocaleString('pl-PL', { style: 'currency', currency: b.currencyCode || 'PLN' });
}

const SUPPORTED_BANKS = [
  { name: 'PKO BP', emoji: '🏦' },
  { name: 'mBank', emoji: '🏦' },
  { name: 'ING', emoji: '🦁' },
  { name: 'Santander', emoji: '🏦' },
  { name: 'Millennium', emoji: '🏦' },
  { name: 'Revolut', emoji: '💜' },
  { name: 'Alior', emoji: '🏦' },
  { name: 'Pekao', emoji: '🏦' },
  { name: 'BNP Paribas', emoji: '🏦' },
  { name: 'Nest Bank', emoji: '🏦' },
];

export default function BankSync({ categories, onImport }: Props) {
  const [userId] = useLocalStorage<string>('tink_user_id', `user_${Date.now()}`);
  const [connected, setConnected] = useLocalStorage<boolean>('tink_connected', false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });

  const catNames = categories.map(c => c.name);

  // Check SDK loaded
  useEffect(() => {
    const check = () => {
      if (window.TinkLink) { setSdkReady(true); return; }
      setTimeout(check, 300);
    };
    check();
  }, []);

  // Check server
  useEffect(() => {
    fetch(`${SERVER}/health`)
      .then(r => r.json())
      .then(d => setServerOk(d.tink))
      .catch(() => setServerOk(false));
  }, []);

  // Handle redirect back from Tink Link with ?code=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !connected) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      setSuccess('🔄 Odbieranie danych z banku...');
      exchangeAndConnect(code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!connected) return;
    try {
      const res = await fetch(`${SERVER}/api/accounts?userId=${userId}`);
      if (res.ok) { const d = await res.json(); setAccounts(d); }
    } catch {}
  }, [connected, userId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Exchange code received from Tink SDK callback
  const exchangeAndConnect = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${SERVER}/api/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnected(true);
      setSuccess('✅ Bank połączony! Możesz teraz synchronizować transakcje.');
      loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Błąd wymiany kodu autoryzacji');
    }
  }, [userId, setConnected, loadAccounts]);

  const openTinkLink = async () => {
    if (!serverOk) { setError('Serwer niedostępny. Spróbuj ponownie za chwilę.'); return; }

    setLoading(true); setError('');
    try {
      // Get authorization code from backend
      const res = await fetch(`${SERVER}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Try SDK popup first, fall back to redirect
      if (sdkReady && window.TinkLink) {
        window.TinkLink.open({
          client_id: CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          scope: 'accounts:read,transactions:read,balances:read',
          market: 'PL',
          locale: 'pl_PL',
          authorization_code: data.authCode,
          test: data.sandbox === true,
          onSuccess: ({ code }) => {
            setLoading(false);
            exchangeAndConnect(code);
          },
          onError: (err) => {
            setLoading(false);
            setError(`Błąd Tink: ${err.message || err.error}`);
          },
          onCancel: () => {
            setLoading(false);
          },
        });
      } else {
        // Fallback: redirect to Tink Link URL
        setLoading(false);
        window.location.href = data.linkUrl;
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const syncTransactions = async (accountId?: string) => {
    setSyncing(true); setError(''); setSuccess('');
    try {
      const params = new URLSearchParams({ userId, fromDate, categories: catNames.join(',') });
      if (accountId) params.set('accountId', accountId);
      const res = await fetch(`${SERVER}/api/transactions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.expenses.length === 0) {
        setSuccess('Brak nowych transakcji w wybranym okresie.');
      } else {
        onImport(data.expenses);
        setSuccess(`✅ Zaimportowano ${data.expenses.length} transakcji z banku!`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAccounts([]);
    setSuccess('');
    setError('');
    localStorage.removeItem('tink_connected');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Sync banku</div>
        <div className="page-subtitle">Automatyczny import przez Tink Open Banking · Powered by Visa</div>
      </div>

      {/* Status bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sdkReady ? 'var(--success)' : 'var(--warning)' }} />
            <span style={{ fontSize: 13 }}>Tink SDK: {sdkReady ? 'gotowy' : 'ładowanie…'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: serverOk === null ? 'var(--warning)' : serverOk ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ fontSize: 13 }}>Serwer: {serverOk === null ? 'sprawdzam…' : serverOk ? 'online' : 'offline'}</span>
          </div>
          {connected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: 13 }}>Bank połączony</span>
            </div>
          )}
        </div>
        {serverOk === false && (
          <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>
            Uruchom serwer w terminalu:{' '}
            <code style={{ background: 'white', padding: '2px 8px', borderRadius: 6, color: 'var(--text)' }}>
              cd server &amp;&amp; node index.js
            </code>
            <br />
            <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
              Upewnij się że <strong>TINK_CLIENT_SECRET</strong> jest ustawiony w server/.env
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(52,199,89,0.08)', color: 'var(--success)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          {success}
        </div>
      )}

      {connected ? (
        /* ── Connected view ── */
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div className="section-title">Połączone konta</div>
              <button className="btn btn-sm btn-secondary" onClick={disconnect}>Odłącz bank</button>
            </div>

            {accounts.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 14, padding: '8px 0' }}>Ładowanie kont…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                {accounts.map(acc => (
                  <div key={acc.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, textTransform: 'capitalize' }}>{acc.type?.toLowerCase() || 'konto'}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{acc.name}</div>
                    {fmtBalance(acc) && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{fmtBalance(acc)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Importuj od daty</label>
              <input
                type="date"
                className="form-input"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              onClick={() => syncTransactions()}
              disabled={syncing}
            >
              {syncing ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> Pobieranie transakcji…</> : '⬇️  Synchronizuj transakcje'}
            </button>

            {accounts.length > 1 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>Tylko jedno konto:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {accounts.map(acc => (
                    <button key={acc.id} className="btn btn-sm btn-secondary" onClick={() => syncTransactions(acc.id)} disabled={syncing}>
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
            🔒 Połączenie tylko do odczytu · PSD2 · Dane chronione przez Tink (Visa)
          </div>
        </div>
      ) : (
        /* ── Not connected view ── */
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '24px 16px 28px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🏦</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 10 }}>
                Połącz swój bank
              </div>
              <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
                Automatycznie importuj transakcje. Jedno połączenie, wszystkie konta.
              </div>

              <button
                className="btn btn-primary"
                onClick={openTinkLink}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px', marginBottom: 12, maxWidth: 400 }}
              >
                {loading
                  ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> Otwieranie Tink Link…</>
                  : '🔗 Połącz bank przez Tink'}
              </button>

              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Bezpieczne · PSD2 · Tylko odczyt · Powered by Tink (Visa)
              </div>
            </div>

            {/* Supported banks */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '20px 0 4px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Obsługiwane banki w Polsce
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUPPORTED_BANKS.map(b => (
                  <span key={b.name} style={{ background: 'var(--bg)', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 500 }}>
                    {b.emoji} {b.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Secret missing warning */}
          <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Brakuje Client Secret</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Client ID jest ustawiony. Potrzebujesz jeszcze <strong>Client Secret</strong> z Tink Console:
                </div>
                <ol style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, paddingLeft: 16, lineHeight: 2 }}>
                  <li>Wejdź na <strong>console.tink.com</strong></li>
                  <li>Twoja aplikacja → zakładka <strong>Credentials</strong></li>
                  <li>Skopiuj <strong>Client Secret</strong></li>
                  <li>Wklej do <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>server/.env</code> jako <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>TINK_CLIENT_SECRET=...</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
