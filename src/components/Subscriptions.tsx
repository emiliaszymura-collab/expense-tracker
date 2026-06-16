import React, { useMemo } from 'react';
import { Expense } from '../types';
import { detectSubscriptions, monthlyTotal } from '../subscriptions';
import { Stagger, StaggerItem, AnimatedNumber } from '../motion';
import { Repeat } from '../icons';

interface Props { expenses: Expense[]; }

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

export default function Subscriptions({ expenses }: Props) {
  const subs = useMemo(() => detectSubscriptions(expenses), [expenses]);
  const perMonth = monthlyTotal(subs);
  const perYear = perMonth * 12;
  const unusedCount = subs.filter(s => s.unused).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Subskrypcje</div>
        <div className="page-subtitle">Automatycznie wykryte cykliczne płatności</div>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>Płacisz za subskrypcje</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1px', color: 'var(--accent)' }}>
            <AnimatedNumber value={perMonth} format={fmt} /> <span style={{ fontSize: 18, color: 'var(--text2)', fontWeight: 500 }}>/ miesiąc</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
            to {fmt(perYear)} rocznie{unusedCount > 0 ? ` · ⚠️ ${unusedCount} możliwe nieużywane` : ''}
          </div>
        </div>
        <div style={{ color: 'var(--accent)' }}><Repeat size={40} strokeWidth={1.7} /></div>
      </div>

      {subs.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <div className="empty-state-icon">🔁</div>
            <div className="empty-state-title">Brak wykrytych subskrypcji</div>
            <div className="empty-state-sub">Wykrywam płatności, które powtarzają się co miesiąc z podobną kwotą. Zaimportuj transakcje z banku, a pojawią się tutaj.</div>
          </div>
        </div>
      ) : (
        <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subs.map(s => (
            <StaggerItem key={s.name} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', opacity: s.unused ? 0.85 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg)', color: s.unused ? 'var(--warning)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Repeat size={20} strokeWidth={1.9} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {s.unused
                      ? <span style={{ color: 'var(--warning)' }}>Brak płatności od {s.monthsSinceLast} mies. — może nieużywane?</span>
                      : `${fmt(s.yearly)} rocznie · ${s.count} płatności`}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(s.amount)}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>/ miesiąc</div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', padding: '16px 0' }}>
        Wykrywanie na podstawie powtarzalnych płatności — sprawdź, zanim coś anulujesz.
      </div>
    </div>
  );
}
