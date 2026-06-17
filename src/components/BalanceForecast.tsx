import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { MeasuredChart } from '../Chart';
import { Expense } from '../types';
import { spendingOnly } from '../categorize';
import { detectSubscriptions, monthlyTotal } from '../subscriptions';
import { authHeader } from '../authToken';

const SERVER = process.env.REACT_APP_SERVER_URL || '';

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

interface Props { expenses: Expense[]; }

export default function BalanceForecast({ expenses }: Props) {
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [manual, setManual] = useState<string>(() => localStorage.getItem('currentBalance') || '');
  const [editing, setEditing] = useState(false);

  // Pull current balance from connected bank accounts (if any)
  useEffect(() => {
    fetch(`${SERVER}/api/eb/accounts`, { headers: { ...authHeader() } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.accounts) {
          const sum = d.accounts.reduce((s: number, a: any) => s + (typeof a.balance === 'number' ? a.balance : 0), 0);
          if (sum > 0) setBankBalance(Math.round(sum * 100) / 100);
        }
      })
      .catch(() => {});
  }, []);

  const startBalance = bankBalance != null ? bankBalance : (parseFloat((manual || '').replace(',', '.')) || null);

  const forecast = useMemo(() => {
    if (startBalance == null) return null;
    const spend = spendingOnly(expenses);
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 864e5);

    // Variable daily spend = last-30-day spending minus monthly subscriptions, spread over 30 days
    const subs = detectSubscriptions(expenses);
    const subMonthly = monthlyTotal(subs);
    const last30 = spend.filter(e => new Date(e.date) >= cutoff).reduce((s, e) => s + e.amount, 0);
    const baseDaily = Math.max(0, (last30 - subMonthly) / 30);

    const subDays = subs.map(s => ({ day: new Date(s.lastDate).getDate(), amount: s.amount }));

    const data: { day: string; saldo: number }[] = [];
    let balance = startBalance;
    data.push({ day: 'dziś', saldo: Math.round(balance * 100) / 100 });
    for (let d = 1; d <= 30; d++) {
      const date = new Date(now.getTime() + d * 864e5);
      balance -= baseDaily;
      for (const s of subDays) { if (date.getDate() === s.day) balance -= s.amount; }
      data.push({ day: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }), saldo: Math.round(balance * 100) / 100 });
    }

    const min = Math.min(...data.map(p => p.saldo));
    const negPoint = data.find(p => p.saldo < 0);
    return { data, min, end: data[data.length - 1].saldo, baseDaily, negDay: negPoint?.day || null };
  }, [expenses, startBalance]);

  const saveManual = () => {
    const v = parseFloat((manual || '').replace(',', '.'));
    if (!isNaN(v)) localStorage.setItem('currentBalance', String(v));
    setEditing(false);
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title">Prognoza salda (30 dni)</div>
        {bankBalance == null && startBalance != null && (
          <button className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>✏️ Saldo</button>
        )}
      </div>

      {startBalance == null || editing ? (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Podaj aktualne saldo, a przewidzę jak zmieni się przez 30 dni na podstawie Twoich wydatków i subskrypcji. (Jeśli połączysz bank, saldo pobierze się automatycznie.)
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="form-input" type="number" inputMode="decimal" placeholder="np. 2500" value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveManual()} style={{ maxWidth: 200 }} autoFocus />
            <button className="btn btn-primary" onClick={saveManual}>Pokaż prognozę</button>
          </div>
        </div>
      ) : forecast && (
        <>
          {forecast.min < 0 && (
            <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 14, fontWeight: 500 }}>
              ⚠️ Przy obecnym tempie saldo może spaść poniżej 0{forecast.negDay ? ` ok. ${forecast.negDay}` : ''}. Warto ograniczyć wydatki.
            </div>
          )}
          <MeasuredChart height={240}>
            {(w) => (
            <AreaChart width={w} height={240} data={forecast.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={forecast.min < 0 ? '#ff3b30' : '#34c759'} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={forecast.min < 0 ? '#ff3b30' : '#34c759'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} interval={Math.ceil(forecast.data.length / 7)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v)}`} width={48} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="saldo" stroke={forecast.min < 0 ? '#ff3b30' : '#34c759'} strokeWidth={2.5} fill="url(#balGrad)" dot={false} />
            </AreaChart>
            )}
          </MeasuredChart>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>Teraz: <strong style={{ color: 'var(--text)' }}>{fmt(startBalance)}</strong></span>
            <span style={{ color: 'var(--text2)' }}>Za 30 dni: <strong style={{ color: forecast.end < 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(forecast.end)}</strong></span>
            <span style={{ color: 'var(--text2)' }}>~{fmt(forecast.baseDaily)}/dzień</span>
          </div>
        </>
      )}
    </div>
  );
}
