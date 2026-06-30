import React, { useState } from 'react';
import { View } from '../types';
import { ViewIcon, Plus } from '../icons';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  accent: string;
  onAccentChange: (c: string) => void;
}

const ACCENTS = [
  { name: 'Niebieski', color: '#0071e3' },
  { name: 'Zielony', color: '#34c759' },
  { name: 'Fioletowy', color: '#af52de' },
  { name: 'Pomarańczowy', color: '#ff9500' },
];

function AccentPicker({ accent, onAccentChange }: { accent: string; onAccentChange: (c: string) => void }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Kolor akcentu
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {ACCENTS.map(a => (
          <button
            key={a.color}
            title={a.name}
            aria-label={a.name}
            onClick={() => onAccentChange(a.color)}
            style={{
              width: 26, height: 26, borderRadius: '50%', background: a.color, cursor: 'pointer',
              border: accent === a.color ? '2px solid var(--text)' : '2px solid transparent',
              boxShadow: accent === a.color ? '0 0 0 2px var(--card)' : 'none', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface NavItem {
  view: View;
  icon: string;
  label: string;
}

const mainItems: NavItem[] = [
  { view: 'dashboard', icon: '◼', label: 'Dashboard' },
  { view: 'expenses', icon: '💳', label: 'Wydatki' },
  { view: 'add', icon: '＋', label: 'Dodaj' },
  { view: 'scanner', icon: '🧾', label: 'Paragony' },
  { view: 'advisor', icon: '🤖', label: 'AI' },
];

const toolItems: NavItem[] = [
  { view: 'subscriptions', icon: '🔁', label: 'Subskrypcje' },
  { view: 'categories', icon: '🏷️', label: 'Kategorie' },
  { view: 'goals', icon: '🎯', label: 'Cele' },
  { view: 'banksync', icon: '🏦', label: 'Sync banku' },
  { view: 'import', icon: '📥', label: 'Import CSV' },
];


export default function Navigation({ currentView, onNavigate, accent, onAccentChange }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Bottom tabs: 4 items + "Więcej" = 5 total, so the center "+" sits exactly in the middle
  const bottomTabs: NavItem[] = [
    { view: 'dashboard', icon: '◼', label: 'Dashboard' },
    { view: 'expenses', icon: '💳', label: 'Wydatki' },
    { view: 'add', icon: '＋', label: 'Dodaj' },
    { view: 'scanner', icon: '🧾', label: 'Paragony' },
  ];

  const moreItems: NavItem[] = [
    { view: 'advisor', icon: '🤖', label: 'AI doradca' },
    { view: 'subscriptions', icon: '🔁', label: 'Subskrypcje' },
    { view: 'categories', icon: '🏷️', label: 'Kategorie' },
    { view: 'goals', icon: '🎯', label: 'Cele' },
    { view: 'banksync', icon: '🏦', label: 'Sync banku' },
    { view: 'import', icon: '📥', label: 'Import CSV' },
  ];

  const isMoreActive = moreItems.some(i => i.view === currentView);

  return (
    <>
      {/* ── Mobile Top Bar (logo) ── */}
      <header className="mobile-topbar">
        <img src="/logo.png?v=2" alt="" width={32} height={32} style={{ borderRadius: 8, objectFit: 'contain', flexShrink: 0, display: 'block' }} />
        <span className="mobile-topbar-title">Wydatki<span>.</span></span>
      </header>

      {/* ── Desktop Sidebar ── */}
      <nav className="nav">
        <div className="nav-logo">
          <img src="/logo.png?v=2" alt="" width={32} height={32} style={{ borderRadius: 8, objectFit: 'contain', flexShrink: 0, display: 'block' }} />
          <div>Wydatki<span>.</span></div>
        </div>

        <div className="nav-section-title">Główne</div>
        {mainItems.map(item => (
          <button
            key={item.view}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <span className="nav-item-icon"><ViewIcon view={item.view} size={19} /></span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="nav-section-title">Narzędzia</div>
        {toolItems.map(item => (
          <button
            key={item.view}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <span className="nav-item-icon"><ViewIcon view={item.view} size={19} /></span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="nav-bottom">
          <AccentPicker accent={accent} onAccentChange={onAccentChange} />
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-nav">
        {bottomTabs.map(item => (
          <button
            key={item.view}
            className={`bottom-nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => { onNavigate(item.view); setMoreOpen(false); }}
          >
            {item.view === 'add' ? (
              <div className="bottom-nav-add-btn">
                <Plus size={24} strokeWidth={2.4} color="#fff" />
              </div>
            ) : (
              <>
                <span className="bottom-nav-icon"><ViewIcon view={item.view} size={22} /></span>
                <span className="bottom-nav-label">{item.label}</span>
              </>
            )}
          </button>
        ))}

        {/* Więcej */}
        <button
          className={`bottom-nav-item ${isMoreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
        >
          <span className="bottom-nav-icon">•••</span>
          <span className="bottom-nav-label">Więcej</span>
        </button>
      </nav>

      {/* ── More Sheet ── */}
      {moreOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setMoreOpen(false)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-title">Więcej</div>

            {moreItems.map(item => (
              <button
                key={item.view}
                className={`bottom-sheet-item ${currentView === item.view ? 'active' : ''}`}
                onClick={() => { onNavigate(item.view); setMoreOpen(false); }}
              >
                <span style={{ display: 'inline-flex' }}><ViewIcon view={item.view} size={22} /></span>
                <span>{item.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text2)' }}>›</span>
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 16 }}>
              <AccentPicker accent={accent} onAccentChange={onAccentChange} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
