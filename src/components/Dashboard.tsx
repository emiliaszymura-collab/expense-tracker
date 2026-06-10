import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Expense, Category, SavingsGoal, View } from '../types';

interface Props {
  expenses: Expense[];
  categories: Category[];
  goals: SavingsGoal[];
  onNavigate: (view: View) => void;
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
  const months: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
    months[key] = 0;
  }
  expenses.forEach(e => {
    const d = new Date(e.date);
    const key = d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
    if (key in months) months[key] += e.amount;
  });
  return Object.entries(months).map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
}

function buildCategoryData(expenses: Expense[], categories: Category[]) {
  const totals: Record<string, number> = {};
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  return categories
    .filter(c => totals[c.name])
    .map(c => ({ name: c.name, value: Math.round(totals[c.name] * 100) / 100, color: c.color, emoji: c.emoji }))
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

export default function Dashboard({ expenses, categories, goals, onNavigate }: Props) {
  const monthExp = getMonthExpenses(expenses);
  const weekExp = getWeekExpenses(expenses);
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const weekTotal = weekExp.reduce((s, e) => s + e.amount, 0);
  const avgDay = monthTotal / new Date().getDate();
  const biggest = [...monthExp].sort((a, b) => b.amount - a.amount)[0];

  const monthlyTrend = buildMonthlyTrend(expenses);
  const categoryData = buildCategoryData(monthExp, categories);
  const weeklyBar = buildWeeklyBar(expenses);
  const recent = expenses.slice(0, 5);

  const getCatColor = (name: string) => categories.find(c => c.name === name)?.color || '#8e8e93';
  const getCatEmoji = (name: string) => categories.find(c => c.name === name)?.emoji || '💰';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Stats Row */}
      <div className="bento bento-4" style={{ marginBottom: 16 }}>
        <div className="card card-sm">
          <div className="stat-label">Ten miesiąc</div>
          <div className="stat-value">{fmt(monthTotal)}</div>
          <div className="stat-sub">{monthExp.length} transakcji</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Ten tydzień</div>
          <div className="stat-value">{fmt(weekTotal)}</div>
          <div className="stat-sub">{weekExp.length} transakcji</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Średnia dzienna</div>
          <div className="stat-value">{fmt(avgDay)}</div>
          <div className="stat-sub">w tym miesiącu</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Największy wydatek</div>
          {biggest ? (
            <>
              <div className="stat-value">{fmt(biggest.amount)}</div>
              <div className="stat-sub">{biggest.description}</div>
            </>
          ) : (
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--text2)' }}>—</div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="bento bento-3" style={{ marginBottom: 16 }}>
        {/* Monthly trend */}
        <div className="card col-span-2">
          <div className="section-header">
            <div className="section-title">Trend miesięczny</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {categoryData.slice(0, 4).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                      <span><span className="emoji">{c.emoji}</span> {c.name}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: 14 }}>Brak danych</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bento bento-3">
        {/* Weekly bar */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Ostatnie 7 dni</div>
          <ResponsiveContainer width="100%" height={150}>
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
            recent.map(e => (
              <div key={e.id} className="expense-row">
                <div className="expense-emoji emoji" style={{ background: `${getCatColor(e.category)}18` }}>{getCatEmoji(e.category)}</div>
                <div className="expense-info">
                  <div className="expense-desc">{e.description}</div>
                  <div className="expense-meta">{e.category} · {new Date(e.date).toLocaleDateString('pl-PL')}</div>
                </div>
                <div className="expense-amount">{fmt(e.amount)}</div>
              </div>
            ))
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
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
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
      </div>
    </div>
  );
}
