import React, { useState, useEffect, useCallback } from 'react';
import { Expense, Category } from '../types';

interface Props {
  categories: Category[];
  onImport: (expenses: Expense[]) => void;
}

interface Bank {
  id: string;
  name: string;
  logo?: string;
  maxAccessDays?: number;
}

interface Account {
  id: string;
  name: string;
  iban?: string;
  currency?: string;
  balance?: number | null;
}

// Same origin as the API (served from the backend)
const SERVER = process.env.REACT_APP_SERVER_URL || '';

function fmtMoney(v?: number | null, currency = 'PLN') {
  if (v === null || v === undefined) return null;
  return v.toLocaleString('pl-PL', { style: 'currency', currency });
}

export default function BankSync({ categories, onImport }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });

  const catNames = categories.map(c => c.name);

  // Check backend config
  useEffect(() => {
    fetch(`${SERVER}/api/gc/health`)
      .then(r => r.json())
      .then(d => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);

  // Load Polish banks once configured & not connected
  useEffect(() => {
    if (configured && !connected && banks.length === 0) {
      fetch(`${SERVER}/api/gc/banks`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? setBanks(d) : setError(d.error || 'Nie udało się pobrać banków'))
        .catch(() => setError('Nie udało się pobrać listy banków'));
    }
  }, [configured, connected, banks.length]);

  // Load accounts for a linked requisition
  const loadAccounts = useCallback(async (ref?: string) => {
    setLoading(true); setError('');
    try {
      const url = ref ? `${SERVER}/api/gc/accounts?ref=${encodeURIComponent(ref)}` : `${SERVER}/api/gc/accounts`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd pobierania kont');
      if (data.status === 'LN') {
        setAccounts(data.accounts || []);
        setConnected(true);
        setSuccess('✅ Bank połączony! Możesz teraz synchronizować transakcje.');
      } else {
        setError('Połączenie nie zostało jeszcze zatwierdzone w banku. Spróbuj ponownie.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle redirect back from the bank (?ref=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      window.history.replaceState({}, '', window.location.pathname);
      loadAccounts(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectBank = async (institutionId: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SERVER}/api/gc/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się rozpocząć połączenia');
      // Redirect the user to the bank's authorization page
      window.location.href = data.link;
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const syncTransactions = async () => {
    setSyncing(true); setError(''); setSuccess('');
    try {
      const params = new URLSearchParams({ fromDate, categories: catNames.join(',') });
      const res = await fetch(`${SERVER}/api/gc/transactions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd pobierania transakcji');
      if (!data.expenses || data.expenses.length === 0) {
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
  };

  const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Sync banku</div>
        <div className="page-subtitle">Automatyczny import przez GoCardless · prawdziwe banki · PSD2</div>
      </div>

      {configured === false && (
        <div className="card" style={{ borderLeft: '3px solid var(--warning)', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>GoCardless nie jest jeszcze skonfigurowany</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Dodaj <code>GC_SECRET_ID</code> i <code>GC_SECRET_KEY</code> w zmiennych środowiskowych serwera (Railway).
              </div>
            </div>
          </div>
        </div>
      )}

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
        /* ── Connected: accounts + sync ── */
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div className="section-title">Połączone konta</div>
              <button className="btn btn-sm btn-secondary" onClick={disconnect}>Odłącz</button>
            </div>

            {accounts.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 14, padding: '8px 0' }}>Ładowanie kont…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                {accounts.map(acc => (
                  <div key={acc.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{acc.name}</div>
                    {acc.iban && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{acc.iban}</div>}
                    {fmtMoney(acc.balance, acc.currency) && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{fmtMoney(acc.balance, acc.currency)}</div>
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
              onClick={syncTransactions}
              disabled={syncing}
            >
              {syncing ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> Pobieranie transakcji…</> : '⬇️  Synchronizuj transakcje'}
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
            🔒 Połączenie tylko do odczytu · PSD2 · Dane chronione przez GoCardless
          </div>
        </div>
      ) : (
        /* ── Not connected: bank picker ── */
        <div className="card">
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>Połącz swój bank</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 360, margin: '0 auto' }}>
              Wybierz bank z listy. Zalogujesz się raz, bezpiecznie, a transakcje zaimportują się automatycznie.
            </div>
          </div>

          {configured && banks.length === 0 && !error && (
            <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, padding: '16px' }}>
              <span className="spinner" /> Ładowanie listy banków…
            </div>
          )}

          {banks.length > 0 && (
            <>
              <input
                className="form-input"
                placeholder="Szukaj banku… (np. PKO, mBank, ING)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 14 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                {filteredBanks.map(b => (
                  <button
                    key={b.id}
                    onClick={() => connectBank(b.id)}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 12, padding: '12px', cursor: 'pointer',
                      textAlign: 'left', fontSize: 13, fontWeight: 500,
                    }}
                  >
                    {b.logo
                      ? <img src={b.logo} alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
                      : <span style={{ fontSize: 22 }}>🏦</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, marginTop: 14 }}>
              <span className="spinner" /> Przekierowuję do banku…
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginTop: 16 }}>
            🔒 Bezpieczne · PSD2 · Tylko odczyt · Powered by GoCardless
          </div>
        </div>
      )}
    </div>
  );
}
