import React, { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { authHeader } from '../authToken';
import { Repeat, Landmark } from '../icons';

const SERVER = process.env.REACT_APP_SERVER_URL || '';

interface Account {
  uid: string;
  name: string;
  iban?: string;
  currency?: string;
  balance?: number | null;
  bank?: string;
}

function fmtMoney(v?: number | null, currency = 'PLN') {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pl-PL', { style: 'currency', currency });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return 'jeszcze nie synchronizowano';
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

// Polish plural: 1 → "1 nową transakcję", 2–4 → "nowe transakcje", 5+ → "nowych transakcji"
function txLabel(n: number) {
  if (n === 1) return 'Dodano 1 nową transakcję';
  const m10 = n % 10, m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `Dodano ${n} nowe transakcje`;
  return `Dodano ${n} nowych transakcji`;
}

interface Props {
  onImport: (expenses: Expense[]) => void;
}

export default function AccountSync({ onImport }: Props) {
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${SERVER}/api/eb/accounts`, { headers: { ...authHeader() } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && d.connected) {
          setConnected(true);
          setAccounts(d.accounts || []);
          setLastSync(d.lastSync || null);
        }
      })
      .catch(() => {});
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true); setMsg(''); setError('');
    try {
      const res = await fetch(`${SERVER}/api/eb/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Błąd synchronizacji');
      if (d.expenses && d.expenses.length) onImport(d.expenses);
      if (d.accounts) setAccounts(d.accounts);
      setLastSync(d.lastSync || new Date().toISOString());
      setMsg(d.added > 0 ? txLabel(d.added) : 'Brak nowych transakcji — wszystko aktualne.');
    } catch (e: any) {
      setError(e.message || 'Nie udało się zsynchronizować');
    } finally {
      setSyncing(false);
    }
  }, [onImport]);

  // Don't show the card when no bank is connected
  if (!connected) return null;

  // Total balance — sum accounts that share the dominant currency (almost always PLN)
  const currency = accounts.find(a => a.currency)?.currency || 'PLN';
  const total = accounts
    .filter(a => typeof a.balance === 'number' && (a.currency || currency) === currency)
    .reduce((s, a) => s + (a.balance as number), 0);
  const hasBalances = accounts.some(a => typeof a.balance === 'number');

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>Stan konta</div>
          {hasBalances ? (
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.8px', color: 'var(--text)' }}>
              {fmtMoney(total, currency)}
            </div>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--text2)' }}>Saldo zostanie pobrane przy synchronizacji</div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Ostatnia aktualizacja: {fmtDateTime(lastSync)}
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>{msg}</div>}
          {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠️ {error}</div>}
        </div>
        <button
          className="btn btn-primary"
          onClick={syncNow}
          disabled={syncing}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {syncing ? (
            <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> Synchronizuję…</>
          ) : (
            <><Repeat size={16} /> Synchronizuj teraz</>
          )}
        </button>
      </div>

      {/* Per-account breakdown when there's more than one account */}
      {accounts.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 16 }}>
          {accounts.map(acc => (
            <div key={acc.uid} style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Landmark size={14} strokeWidth={1.8} color="var(--text2)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc.bank || acc.name}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtMoney(acc.balance, acc.currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
