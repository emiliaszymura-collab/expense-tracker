import React, { useState } from 'react';
import { Expense, Category } from '../types';

interface Props {
  categories: Category[];
  onAdd: (expense: Expense) => void;
  onBack: () => void;
}

export default function AddExpense({ categories, onAdd, onBack }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || '');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Podaj prawidłową kwotę');
      return;
    }
    if (!description.trim()) {
      setError('Podaj opis wydatku');
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      category,
      description: description.trim(),
      date,
      notes: notes.trim() || undefined,
    });
  };

  const selectedCat = categories.find(c => c.name === category);

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Wróć
        </button>
        <div className="page-title">Dodaj wydatek</div>
        <div className="page-subtitle">Wprowadź szczegóły transakcji</div>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Kwota (PLN)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(''); }}
                  min="0.01"
                  step="0.01"
                  style={{ fontSize: 24, fontWeight: 700, paddingLeft: 40 }}
                  autoFocus
                />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text2)', fontWeight: 600 }}>zł</span>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Kategoria</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 20, border: '1.5px solid',
                      borderColor: category === c.name ? c.color : 'var(--border)',
                      background: category === c.name ? `${c.color}18` : 'white',
                      color: category === c.name ? c.color : 'var(--text2)',
                      cursor: 'pointer', fontWeight: 500, fontSize: 14,
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Opis</label>
              <input
                type="text"
                className="form-input"
                placeholder="np. Obiad w restauracji"
                value={description}
                onChange={e => { setDescription(e.target.value); setError(''); }}
                maxLength={100}
              />
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={today}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notatki (opcjonalnie)</label>
              <textarea
                className="form-textarea"
                placeholder="Dodatkowe informacje..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={300}
              />
            </div>

            {/* Preview */}
            {amount && description && (
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="emoji" style={{ width: 44, height: 44, borderRadius: 12, background: selectedCat ? `${selectedCat.color}18` : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {selectedCat?.emoji || '💰'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{description}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{category} · {new Date(date).toLocaleDateString('pl-PL')}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {parseFloat(amount || '0').toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Zapisz wydatek
              </button>
              <button type="button" className="btn btn-secondary" onClick={onBack}>
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
