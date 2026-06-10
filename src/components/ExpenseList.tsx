import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../types';

interface Props {
  expenses: Expense[];
  categories: Category[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

export default function ExpenseList({ expenses, categories, onDelete, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getCatColor = (name: string) => categories.find(c => c.name === name)?.color || '#8e8e93';
  const getCatEmoji = (name: string) => categories.find(c => c.name === name)?.emoji || '💰';

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) list = list.filter(e => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()) || (e.notes || '').toLowerCase().includes(search.toLowerCase()));
    if (catFilter) list = list.filter(e => e.category === catFilter);
    if (dateFrom) list = list.filter(e => e.date >= dateFrom);
    if (dateTo) list = list.filter(e => e.date <= dateTo);
    list.sort((a, b) => {
      if (sort === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === 'amount-desc') return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return list;
  }, [expenses, search, catFilter, dateFrom, dateTo, sort]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Wydatki</div>
            <div className="page-subtitle">{filtered.length} transakcji · łącznie {fmt(total)}</div>
          </div>
          <button className="btn btn-primary" onClick={onAdd}>＋ Dodaj wydatek</button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filters">
          <input
            type="text"
            className="search-input"
            placeholder="🔍  Szukaj wydatków..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Wszystkie kategorie</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
          <input type="date" className="filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Od" />
          <input type="date" className="filter-select" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Do" />
          <select className="filter-select" value={sort} onChange={e => setSort(e.target.value as any)}>
            <option value="date-desc">Najnowsze</option>
            <option value="date-asc">Najstarsze</option>
            <option value="amount-desc">Najdroższe</option>
            <option value="amount-asc">Najtańsze</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-title">Brak wydatków</div>
            <div className="empty-state-sub">
              {expenses.length === 0 ? 'Dodaj pierwszy wydatek' : 'Brak wyników dla wybranych filtrów'}
            </div>
            {expenses.length === 0 && (
              <button className="btn btn-primary" onClick={onAdd}>＋ Dodaj wydatek</button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop table */}
            <table className="table expense-table-desktop">
              <thead>
                <tr>
                  <th>Kategoria</th>
                  <th>Opis</th>
                  <th>Data</th>
                  <th style={{ textAlign: 'right' }}>Kwota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="emoji" style={{ width: 32, height: 32, borderRadius: 8, background: `${getCatColor(e.category)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                          {getCatEmoji(e.category)}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{e.category}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{e.description}</div>
                      {e.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{e.notes}</div>}
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>
                      {new Date(e.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 15 }}>
                      {fmt(e.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {deleteConfirm === e.id ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-danger" onClick={() => { onDelete(e.id); setDeleteConfirm(null); }}>Usuń</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setDeleteConfirm(null)}>Anuluj</button>
                        </div>
                      ) : (
                        <button className="btn btn-icon" onClick={() => setDeleteConfirm(e.id)} title="Usuń">🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="expense-list-mobile">
              {filtered.map(e => (
                <div key={e.id} className="expense-row">
                  <div className="expense-emoji emoji" style={{ background: `${getCatColor(e.category)}18` }}>
                    {getCatEmoji(e.category)}
                  </div>
                  <div className="expense-info">
                    <div className="expense-desc">{e.description}</div>
                    <div className="expense-meta">
                      {e.category} · {new Date(e.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div className="expense-amount">{fmt(e.amount)}</div>
                    {deleteConfirm === e.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-danger" onClick={() => { onDelete(e.id); setDeleteConfirm(null); }}>Usuń</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setDeleteConfirm(null)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn-icon" style={{ padding: '6px 8px', fontSize: 14 }} onClick={() => setDeleteConfirm(e.id)}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
