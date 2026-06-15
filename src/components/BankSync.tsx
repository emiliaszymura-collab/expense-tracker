import React, { useState, useEffect, useCallback } from 'react';
import { Expense, Category } from '../types';
import { authHeader } from '../authToken';

interface Props {
  categories: Category[];
  onImport: (expenses: Expense[]) => void;
}

interface Bank {
  name: string;
  country: string;
  logo?: string;
  maxDays?: number;
}

interface Account {
  uid: string;
  name: string;
  iban?: string;
  currency?: string;
  balance?: number | null;
  bank?: string;
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
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });

  const catNames = categories.map(c => c.name);

  // Check backend config + existing connection, and auto-load any server-stored transactions
  useEffect(() => {
    fetch(`${SERVER}/api/eb/health`, { headers: { ...authHeader() } })
      .then(r => r.json())
      .then(d => {
        setConfigured(!!d.configured);
        if (d.connected) {
          setConnected(true);
          fetch(`${SERVER}/api/eb/accounts`, { headers: { ...authHeader() } }).then(r => r.json()).then(a => setAccounts(a.accounts || [])).catch(() => {});
        }
      })
      .catch(() => setConfigured(false));
    // Pull whatever the server has already imported (auto-refresh runs every 6h server-side)
    fetch(`${SERVER}/api/eb/stored`, { headers: { ...authHeader() } })
      .then(r => r.json())
      .then(d => { if (d.expenses && d.expenses.length) onImport(d.expenses); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Polish banks (when not connected, or when adding another bank)
  useEffect(() => {
    if (configured && (!connected || showPicker) && banks.length === 0) {
      fetch(`${SERVER}/api/eb/banks`, { headers: { ...authHeader() } })
        .then(r => r.json())
        .then(d => Array.isArray(d) ? setBanks(d) : setError(d.error || 'Nie udało się pobrać banków'))
        .catch(() => setError('Nie udało się pobrać listy banków'));
    }
  }, [configured, connected, showPicker, banks.length]);

  // Complete a session from the callback code
  const completeSession = useCallback(async (code: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SERVER}/api/eb/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd autoryzacji');
      setAccounts(data.accounts || []);
      setConnected(true);
      setSuccess('✅ Bank połączony! Możesz teraz synchronizować transakcje.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle redirect back from the bank (?code=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      completeSession(code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectBank = async (bank: Bank) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SERVER}/api/eb/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ aspspName: bank.name, country: bank.country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się rozpocząć połączenia');
      window.location.href = data.url; // redirect to the bank
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const syncTransactions = async () => {
    setSyncing(true); setError(''); setSuccess('');
    try {
      const params = new URLSearchParams({ fromDate, categories: catNames.join(',') });
      const res = await fetch(`${SERVER}/api/eb/transactions?${params}`, { headers: { ...authHeader() } });
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
        <div className="page-subtitle">Automatyczny import na żywo · prawdziwe banki · PSD2 · Enable Banking</div>
      </div>

      {configured === false && (
        <div className="card" style={{ borderLeft: '3px solid var(--warning)', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bank nie jest jeszcze skonfigurowany</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Dodaj <code>EB_APP_ID</code> i <code>EB_PRIVATE_KEY</code> w zmiennych środowiskowych serwera (Railway).
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

      {connected && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div className="section-title">Połączone konta</div>
              <button className="btn btn-sm btn-secondary" onClick={disconnect}>Odłącz wszystkie</button>
            </div>

            {accounts.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 14, padding: '8px 0' }}>Ładowanie kont…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                {accounts.map(acc => (
                  <div key={acc.uid} style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px' }}>
                    {acc.bank && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>{acc.bank}</div>}
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

            {!showPicker && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 10 }}
                onClick={() => setShowPicker(true)}
              >
                ➕  Dodaj kolejny bank
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
            🔒 Połączenie tylko do odczytu · PSD2 · Dane chronione przez Enable Banking
          </div>
        </div>
      )}

      {(!connected || showPicker) && (
        <div className="card">
          {connected && (
            <div style={{ textAlign: 'right', marginBottom: 4 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowPicker(false)}>✕ Anuluj</button>
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>Połącz swój bank</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 360, margin: '0 auto' }}>
              Wybierz bank z listy. Zalogujesz się raz, bezpiecznie, a transakcje będą się aktualizować automatycznie.
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
                    key={b.name}
                    onClick={() => connectBank(b)}
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
            🔒 Bezpieczne · PSD2 · Tylko odczyt · Powered by Enable Banking
          </div>
        </div>
      )}
    </div>
  );
}
