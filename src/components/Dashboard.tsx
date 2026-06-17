import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Expense, Category, SavingsGoal, View } from '../types';
import { categorize, catColor, catEmoji, spendingOnly, savingsTotal } from '../categorize';
import { Stagger, StaggerItem, Reveal, AnimatedNumber } from '../motion';
import { CategoryIcon, PiggyBank, Target } from '../icons';
import BalanceForecast from './BalanceForecast';
import WeeklyReport from './WeeklyReport';

interface Props {
  expenses: Expense[];
  categories: Category[];
  goals: SavingsGoal[];
  onNavigate: (view: View) => void;
  budget: number;
  onSetBudget: (b: number) => void;
  apiKey: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

function getMonthExpenses(expenses: Expense[]) {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function getWeekExpenses(expenses: Expense[]) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return expenses.filter(e => new Date(e.date) >= weekAgo);
}

function buildMonthlyTrend(expenses: Expense[]) {
  if (expenses.length === 0) return [];
  const now = new Date();
  // Start from the first month that actually has data (no leading empty months)
  let minTime = Infinity;
  expenses.forEach(e => { const t = new Date(e.date).getTime(); if (!isNaN(t) && t < minTime) minTime = t; });
  if (!isFinite(minTime)) return [];
  const first = new Date(minTime);
  let start = new Date(first.getFullYear(), first.getMonth(), 1);
  // Cap the window to the last 12 months for readability
  const earliestAllowed = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (start < earliestAllowed) start = earliestAllowed;

  const months: { key: string; total: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    months.push({ key: cursor.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }), total: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const index: Record<string, number> = {};
  months.forEach((m, i) => { index[m.key] = i; });
  expenses.forEach(e => {
    const key = new Date(e.date).toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
    if (key in index) months[index[key]].total += e.amount;
  });
  return months.map(m => ({ month: m.key, total: Math.round(m.total * 100) / 100 }));
}

function buildCategoryData(expenses: Expense[]) {
  const totals: Record<string, number> = {};
  expenses.forEach(e => { const c = categorize(e); totals[c] = (totals[c] || 0) + e.amount; });
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, color: catColor(name), emoji: catEmoji(name) }))
    .sort((a, b) => b.value - a.value);
}

function buildWeeklyBar(expenses: Expense[]) {
  const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const now = new Date();
  const data: { day: string; kwota: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = days[d.getDay()];
    const total = expenses
      .filter(e => {
        const ed = new Date(e.date);
        return ed.toDateString() === d.toDateString();
      })
      .reduce((s, e) => s + e.amount, 0);
    data.push({ day: dayStr, kwota: Math.round(total * 100) / 100 });
  }
  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow)', fontSize: 13 }}>
        <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ expenses, goals, onNavigate, budget, onSetBudget, apiKey }: Props) {
  const [editBudget, setEditBudget] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState(String(budget || ''));
  // Savings transfers (Smart Saver) are NOT spending — exclude them from every total/chart.
  const spending = spendingOnly(expenses);
  const monthExp = getMonthExpenses(spending);
  const weekExp = getWeekExpenses(spending);
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const weekTotal = weekExp.reduce((s, e) => s + e.amount, 0);
  const avgDay = monthTotal / new Date().getDate();
  const biggest = [...monthExp].sort((a, b) => b.amount - a.amount)[0];
  const monthSavings = savingsTotal(getMonthExpenses(expenses));

  const monthlyTrend = buildMonthlyTrend(spending);
  const categoryData = buildCategoryData(monthExp);
  const weeklyBar = buildWeeklyBar(spending);
  const recent = spending.slice(0, 5);

  // ── "Dziś" widget: how much you can still spend per remaining day ──
  const _now = new Date();
  const daysInMonth = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - _now.getDate() + 1);
  const remaining = budget - monthTotal;
  const perDay = remaining / daysLeft;
  const overBudget = remaining < 0;

  const saveBudget = () => {
    const v = parseFloat(budgetInput.replace(',', '.'));
    if (!isNaN(v) && v >= 0) onSetBudget(Math.round(v));
    setEditBudget(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* "Dziś" widget */}
      <div className="card" style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        {budget <= 0 || editBudget ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Ustaw miesięczny budżet</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Podaj, ile chcesz wydawać miesięcznie — policzę, ile możesz wydać dziś.</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                type="number"
                inputMode="decimal"
                placeholder="np. 3000"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveBudget()}
                style={{ maxWidth: 200 }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={saveBudget}>Zapisz</button>
              {budget > 0 && <button className="btn btn-secondary" onClick={() => setEditBudget(false)}>Anuluj</button>}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>
                {overBudget ? '⚠️ Przekroczono budżet o' : 'Możesz dziś wydać'}
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', color: overBudget ? 'var(--danger)' : 'var(--success)' }}>
                <AnimatedNumber value={Math.abs(overBudget ? remaining : perDay)} format={fmt} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
                {overBudget
                  ? `Budżet ${fmt(budget)} · wydano ${fmt(monthTotal)}`
                  : `przez ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'} · budżet ${fmt(budget)} · zostało ${fmt(remaining)}`}
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => { setBudgetInput(String(budget)); setEditBudget(true); }}>✏️ Budżet</button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <Stagger className="bento bento-4" style={{ marginBottom: 16 }}>
        <StaggerItem className="card card-sm">
          <div className="stat-label">Ten miesiąc</div>
          <div className="stat-value">{fmt(monthTotal)}</div>
          <div className="stat-sub">{monthExp.length} transakcji</div>
        </StaggerItem>
        <StaggerItem className="card card-sm">
          <div className="stat-label">Ten tydzień</div>
          <div className="stat-value">{fmt(weekTotal)}</div>
          <div className="stat-sub">{weekExp.length} transakcji</div>
        </StaggerItem>
        <StaggerItem className="card card-sm">
          <div className="stat-label">Średnia dzienna</div>
          <div className="stat-value">{fmt(avgDay)}</div>
          <div className="stat-sub">w tym miesiącu</div>
        </StaggerItem>
        <StaggerItem className="card card-sm">
          <div className="stat-label">Największy wydatek</div>
          {biggest ? (
            <>
              <div className="stat-value">{fmt(biggest.amount)}</div>
              <div className="stat-sub">{biggest.description}</div>
            </>
          ) : (
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--text2)' }}>—</div>
          )}
        </StaggerItem>
      </Stagger>

      {/* Savings set aside (Smart Saver) — informational, not counted as spending */}
      {monthSavings > 0 && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderLeft: '3px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-flex', color: 'var(--success)' }}><PiggyBank size={26} strokeWidth={1.9} /></span>
            <div>
              <div style={{ fontWeight: 600 }}>Odłożone oszczędności (Smart Saver)</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Nie wliczone w wydatki — to Twoje odkładane środki</div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{fmt(monthSavings)}</div>
        </div>
      )}

      {/* Charts Row */}
      <Reveal className="bento bento-3" style={{ marginBottom: 16 }}>
        {/* Monthly trend */}
        <div className="card col-span-2">
          <div className="section-header">
            <div className="section-title">Trend miesięczny</div>
          </div>
          <ResponsiveContainer width="99%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071e3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v} zł`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#0071e3" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 4, fill: '#0071e3', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Kategorie</div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {categoryData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flexShrink: 0, display: 'inline-flex', color: c.color }}><CategoryIcon name={c.name} size={15} color={c.color} /></span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: 14 }}>Brak danych</div>
          )}
        </div>
      </Reveal>

      {/* Weekly AI report */}
      <Reveal>
        <WeeklyReport expenses={expenses} apiKey={apiKey} />
      </Reveal>

      {/* Balance forecast */}
      <Reveal>
        <BalanceForecast expenses={expenses} />
      </Reveal>

      {/* Bottom Row */}
      <Reveal className="bento bento-3">
        {/* Weekly bar */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Ostatnie 7 dni</div>
          <ResponsiveContainer width="99%" height={150}>
            <BarChart data={weeklyBar} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kwota" fill="#0071e3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent expenses */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Ostatnie wydatki</div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('expenses')}>Zobacz wszystkie</button>
          </div>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)', fontSize: 14 }}>
              Brak wydatków
            </div>
          ) : (
            recent.map(e => {
              const cat = categorize(e);
              return (
                <div key={e.id} className="expense-row">
                  <div className="expense-emoji" style={{ background: `${catColor(cat)}18`, color: catColor(cat) }}><CategoryIcon name={cat} color={catColor(cat)} /></div>
                  <div className="expense-info">
                    <div className="expense-desc">{e.description}</div>
                    <div className="expense-meta">{cat} · {new Date(e.date).toLocaleDateString('pl-PL')}</div>
                  </div>
                  <div className="expense-amount">{fmt(e.amount)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Goals */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Cele oszczędnościowe</div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('goals')}>Zarządzaj</button>
          </div>
          {goals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)', fontSize: 14 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: 'var(--text2)' }}><Target size={30} strokeWidth={1.6} /></div>
              Brak celów
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {goals.slice(0, 3).map(g => {
                const pct = Math.min((g.current / g.target) * 100, 100);
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="emoji">{g.emoji}</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</span>
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                      <span>{fmt(g.current)}</span>
                      <span>{fmt(g.target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
