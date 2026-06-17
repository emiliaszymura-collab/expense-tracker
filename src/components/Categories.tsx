import React, { useState } from 'react';
import { Category } from '../types';
import { CategoryIcon, hasCategoryIcon, Trash2 } from '../icons';

interface Props {
  categories: Category[];
  onAdd: (category: Category) => void;
  onDelete: (id: string) => void;
}

const EMOJIS = ['🍔', '🚗', '🏠', '💊', '🎬', '👗', '📚', '💰', '✈️', '🐾', '🎮', '⚽', '🍷', '☕', '💪', '🎵', '📱', '🛒', '🎁', '💼'];
const COLORS = ['#34c759', '#0071e3', '#ff9500', '#ff3b30', '#af52de', '#ff2d55', '#5ac8fa', '#8e8e93', '#ffcc00', '#ff6b35', '#1db954', '#e91e63'];

const DEFAULT_IDS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export default function Categories({ categories, onAdd, onDelete }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [color, setColor] = useState('#0071e3');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) { setError('Podaj nazwę kategorii'); return; }
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Kategoria o tej nazwie już istnieje');
      return;
    }
    onAdd({ id: crypto.randomUUID(), name: name.trim(), color, emoji });
    setName('');
    setError('');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Kategorie</div>
        <div className="page-subtitle">Zarządzaj kategoriami wydatków</div>
      </div>

      <div className="split-layout">
        {/* List */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>Wszystkie kategorie ({categories.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${cat.color}18`, color: cat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  fontFamily: 'var(--emoji-font)',
                }}>
                  {hasCategoryIcon(cat.name) ? <CategoryIcon name={cat.name} size={22} color={cat.color} /> : cat.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.color}</span>
                  </div>
                </div>
                {!DEFAULT_IDS.includes(cat.id) && (
                  deleteConfirm === cat.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-danger" onClick={() => { onDelete(cat.id); setDeleteConfirm(null); }}>Usuń</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setDeleteConfirm(null)}>Anuluj</button>
                    </div>
                  ) : (
                    <button className="btn btn-icon" onClick={() => setDeleteConfirm(cat.id)}><Trash2 size={16} /></button>
                  )
                )}
                {DEFAULT_IDS.includes(cat.id) && (
                  <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 20 }}>domyślna</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add form */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="section-title" style={{ marginBottom: 20 }}>Dodaj kategorię</div>

          {error && (
            <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nazwa</label>
            <input
              className="form-input"
              placeholder="np. Sport"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ikona</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: 20,
                    border: '1.5px solid', cursor: 'pointer',
                    borderColor: emoji === e ? 'var(--accent)' : 'var(--border)',
                    background: emoji === e ? 'rgba(0,113,227,0.08)' : 'var(--input-bg)',
                    transition: 'all 0.1s',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kolor</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'all 0.1s',
                    outline: color === c ? '2px solid white' : 'none',
                    outlineOffset: '-4px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && (
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {emoji}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Podgląd kategorii</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAdd}>
            ＋ Dodaj kategorię
          </button>
        </div>
      </div>
    </div>
  );
}
