import React, { useState, useMemo } from 'react';
import { Expense, SavingsGoal } from '../types';
import { spendingOnly, categorize } from '../categorize';
import { Stagger, StaggerItem, AnimatedNumber } from '../motion';

interface Props {
  expenses: Expense[];
  goals: SavingsGoal[];
  onAddToGoal: (goalId: string, amount: number) => void;
}

type Kind = 'limit' | 'noCat' | 'noSpend';
interface Challenge {
  id: string;
  title: string;
  emoji: string;
  kind: Kind;
  days: number;
  param?: number;     // daily limit (zł) for 'limit'
  category?: string;  // blocked category for 'noCat'
  startDate: string;  // YYYY-MM-DD
  reward: number;     // points
  awarded?: boolean;
}

const TEMPLATES: Omit<Challenge, 'id' | 'startDate'>[] = [
  { title: 'Tydzień bez jedzenia na mieście', emoji: '🍔', kind: 'noCat', category: 'Jedzenie', days: 7, reward: 100 },
  { title: 'Limit 50 zł / dzień', emoji: '💸', kind: 'limit', param: 50, days: 7, reward: 80 },
  { title: '3 dni bez żadnych zakupów', emoji: '🛑', kind: 'noSpend', days: 3, reward: 60 },
  { title: 'Tydzień bez Rozrywki', emoji: '🎬', kind: 'noCat', category: 'Rozrywka', days: 7, reward: 70 },
  { title: 'Limit 30 zł / dzień (hardcore)', emoji: '🔥', kind: 'limit', param: 30, days: 5, reward: 120 },
];

function load(): Challenge[] {
  try { return JSON.parse(localStorage.getItem('challenges') || '[]'); } catch { return []; }
}
function save(list: Challenge[]) { localStorage.setItem('challenges', JSON.stringify(list)); }

// Per-day spend map for spending-only expenses
function dailyMaps(expenses: Expense[]) {
  const total: Record<string, number> = {};
  const byCat: Record<string, Set<string>> = {}; // date -> set of categories
  for (const e of spendingOnly(expenses)) {
    const d = (e.date || '').slice(0, 10);
    total[d] = (total[d] || 0) + e.amount;
    (byCat[d] = byCat[d] || new Set()).add(categorize(e));
  }
  return { total, byCat };
}

export default function Challenges({ expenses, goals, onAddToGoal }: Props) {
  const [list, setList] = useState<Challenge[]>(load);
  const maps = useMemo(() => dailyMaps(expenses), [expenses]);

  const persist = (next: Challenge[]) => { setList(next); save(next); };

  const start = (t: Omit<Challenge, 'id' | 'startDate'>) => {
    const c: Challenge = { ...t, id: `ch_${Date.now()}`, startDate: new Date().toISOString().slice(0, 10) };
    persist([c, ...list]);
  };
  const remove = (id: string) => persist(list.filter(c => c.id !== id));

  // streak of compliant days from start (stops at first violation)
  const evalChallenge = (c: Challenge) => {
    const start = new Date(c.startDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0, violated = false;
    for (let d = 0; d < c.days; d++) {
      const date = new Date(start.getTime() + d * 864e5);
      if (date > today) break; // future days not counted yet
      const key = date.toISOString().slice(0, 10);
      let ok = true;
      if (c.kind === 'limit') ok = (maps.total[key] || 0) <= (c.param || 0);
      else if (c.kind === 'noSpend') ok = !(maps.total[key] > 0);
      else if (c.kind === 'noCat') ok = !(maps.byCat[key]?.has(c.category || ''));
      if (ok) streak++; else { violated = true; break; }
    }
    const done = streak >= c.days;
    const failed = violated && !done;
    return { streak, done, failed };
  };

  const points = list.reduce((s, c) => s + (evalChallenge(c).done ? c.reward : 0), 0);

  const awardToGoal = (c: Challenge) => {
    if (goals[0]) onAddToGoal(goals[0].id, c.reward);
    persist(list.map(x => x.id === c.id ? { ...x, awarded: true } : x));
  };

  const activeTitles = new Set(list.filter(c => { const r = evalChallenge(c); return !r.done && !r.failed; }).map(c => c.title));
  const activeTemplates = TEMPLATES.filter(t => !activeTitles.has(t.title));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Wyzwania</div>
        <div className="page-subtitle">Oszczędzaj z głową — zbieraj punkty i serie</div>
      </div>

      {/* Points summary */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>Zdobyte punkty</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}><AnimatedNumber value={points} /> pkt</div>
        </div>
        <div className="emoji" style={{ fontSize: 44 }}>🏆</div>
      </div>

      {/* Active challenges */}
      {list.length > 0 && (
        <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {list.map(c => {
            const { streak, done, failed } = evalChallenge(c);
            const pct = Math.min(100, Math.round((streak / c.days) * 100));
            return (
              <StaggerItem key={c.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span className="emoji" style={{ fontSize: 26 }}>{done ? '✅' : failed ? '❌' : c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {done ? `Ukończone! +${c.reward} pkt 🎉` : failed ? 'Nie udało się tym razem' : `Seria: ${streak}/${c.days} dni 🔥`}
                    </div>
                  </div>
                  <button className="btn btn-icon btn-sm" onClick={() => remove(c.id)} title="Usuń">🗑</button>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: done ? 'var(--success)' : failed ? 'var(--danger)' : 'var(--accent)', transition: 'width 0.5s cubic-bezier(0.25,0.1,0.25,1)' }} />
                </div>
                {done && !c.awarded && goals.length > 0 && (
                  <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={() => awardToGoal(c)}>
                    💰 Dodaj {c.reward} zł do celu „{goals[0].name}"
                  </button>
                )}
                {c.awarded && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--success)' }}>✓ Dodano do celu oszczędnościowego</div>}
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Templates to start */}
      <div className="section-title" style={{ marginBottom: 12 }}>Podejmij wyzwanie</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {activeTemplates.map((t, i) => (
          <button key={i} className="card" onClick={() => start(t)} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="emoji" style={{ fontSize: 28 }}>{t.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{t.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t.days} dni · +{t.reward} pkt</div>
            </div>
          </button>
        ))}
        {activeTemplates.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>Wszystkie wyzwania podjęte 💪</div>
        )}
      </div>
    </div>
  );
}
