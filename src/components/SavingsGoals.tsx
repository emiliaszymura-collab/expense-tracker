import React, { useState } from 'react';
import { SavingsGoal } from '../types';
import { Target } from '../icons';

interface Props {
  goals: SavingsGoal[];
  onAdd: (goal: SavingsGoal) => void;
  onUpdate: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}

const GOAL_EMOJIS = ['🏠', '✈️', '🚗', '💻', '📱', '💍', '🎓', '🐾', '🎮', '💰', '🏋️', '🌴'];
const GOAL_COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#5ac8fa', '#ff3b30', '#ffcc00'];

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

export default function SavingsGoals({ goals, onAdd, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [color, setColor] = useState('#0071e3');
  const [error, setError] = useState('');
  const [addMoney, setAddMoney] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) { setError('Podaj nazwę celu'); return; }
    if (!target || parseFloat(target) <= 0) { setError('Podaj prawidłową kwotę docelową'); return; }
    if (!deadline) { setError('Podaj datę docelową'); return; }
    onAdd({ id: crypto.randomUUID(), name: name.trim(), target: parseFloat(target), current: 0, deadline, color, emoji });
    setName(''); setTarget(''); setDeadline(''); setError(''); setShowForm(false);
  };

  const handleAddMoney = (goalId: string) => {
    const val = parseFloat(addMoney[goalId] || '0');
    if (!val || val <= 0) return;
    onUpdate(goalId, val);
    setAddMoney(prev => ({ ...prev, [goalId]: '' }));
  };

  const daysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Cele oszczędnościowe</div>
            <div className="page-subtitle">{goals.length} aktywnych celów</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Anuluj' : '＋ Nowy cel'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 20 }}>Nowy cel oszczędnościowy</div>
          {error && (
            <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nazwa celu</label>
            <input className="form-input" placeholder="np. Wakacje na Malediwach" value={name} onChange={e => { setName(e.target.value); setError(''); }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Kwota docelowa (PLN)</label>
              <input className="form-input" type="number" placeholder="0,00" value={target} onChange={e => setTarget(e.target.value)} min="1" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Data docelowa</label>
              <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ikona</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GOAL_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)} style={{ width: 38, height: 38, borderRadius: 8, fontSize: 20, border: '1.5px solid', cursor: 'pointer', borderColor: emoji === e ? 'var(--accent)' : 'var(--border)', background: emoji === e ? 'rgba(0,113,227,0.08)' : 'white' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Kolor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', outline: color === c ? '2px solid white' : 'none', outlineOffset: '-4px' }} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAdd}>
            Stwórz cel
          </button>
        </div>
      )}

      {/* Goals grid */}
      {goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: 'var(--text2)' }}><Target size={40} strokeWidth={1.5} /></div>
            <div className="empty-state-title">Brak celów oszczędnościowych</div>
            <div className="empty-state-sub">Stwórz pierwszy cel, aby śledzić swoje oszczędności</div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>＋ Nowy cel</button>
          </div>
        </div>
      ) : (
        <div className="bento bento-3">
          {goals.map(g => {
            const pct = Math.min((g.current / g.target) * 100, 100);
            const days = daysLeft(g.deadline);
            const remaining = g.target - g.current;
            const monthlyNeeded = days > 0 ? (remaining / (days / 30)) : 0;

            return (
              <div key={g.id} className="goal-card">
                <div className="goal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="emoji" style={{ width: 52, height: 52, borderRadius: 14, background: `${g.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {g.emoji}
                    </div>
                    <div>
                      <div className="goal-name">{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                        {days > 0 ? `${days} dni pozostało` : 'Termin minął'}
                      </div>
                    </div>
                  </div>
                  {deleteConfirm === g.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-danger" onClick={() => { onDelete(g.id); setDeleteConfirm(null); }}>Usuń</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setDeleteConfirm(null)}>Anuluj</button>
                    </div>
                  ) : (
                    <button className="btn btn-icon" onClick={() => setDeleteConfirm(g.id)}>🗑</button>
                  )}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Odłożone</div>
                      <div style={{ fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(g.current)}</div>
                    </div>
                    <div style={{ minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Cel</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(g.target)}</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>Ukończone</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(pct)}%</div>
                    </div>
                    <div style={{ minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>Brakuje</div>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(remaining)}</div>
                    </div>
                  </div>
                </div>

                {days > 0 && remaining > 0 && (
                  <div style={{ background: `${g.color}10`, borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Potrzeba miesięcznie: </span>
                    <span style={{ fontWeight: 600, color: g.color }}>{fmt(monthlyNeeded)}</span>
                  </div>
                )}

                {pct >= 100 && (
                  <div style={{ background: 'rgba(52,199,89,0.1)', borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 13, color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                    🎉 Cel osiągnięty!
                  </div>
                )}

                {/* Add money */}
                {pct < 100 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0,00"
                      value={addMoney[g.id] || ''}
                      onChange={e => setAddMoney(prev => ({ ...prev, [g.id]: e.target.value }))}
                      min="0.01"
                      step="0.01"
                      style={{ flex: 1, minWidth: 0, padding: '9px 12px', fontSize: 14 }}
                      onKeyDown={e => e.key === 'Enter' && handleAddMoney(g.id)}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      onClick={() => handleAddMoney(g.id)}
                      disabled={!addMoney[g.id] || parseFloat(addMoney[g.id]) <= 0}
                    >
                      Dodaj
                    </button>
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 12 }}>
                  Termin: {new Date(g.deadline).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
