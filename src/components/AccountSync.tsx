import React, { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { authHeader } from '../authToken';
import { Repeat } from '../icons';

const SERVER = process.env.REACT_APP_SERVER_URL || '';

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
      setLastSync(d.lastSync || new Date().toISOString());
      setMsg(d.added > 0 ? txLabel(d.added) : 'Brak nowych transakcji — wszystko aktualne.');
    } catch (e: any) {
      setError(e.message || 'Nie udało się zsynchronizować');
    } finally {
      setSyncing(false);
    }
  }, [onImport]);

  // Don't show the sync card when no bank is connected
  if (!connected) return null;

  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Ostatnia aktualizacja</div>
        <div style={{ fontWeight: 600 }}>{fmtDateTime(lastSync)}</div>
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
  );
}
