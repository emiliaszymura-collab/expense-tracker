import React, { useState } from 'react';
import { View } from '../types';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
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


export default function Navigation({ currentView, onNavigate, apiKey, onApiKeyChange, accent, onAccentChange }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Bottom tabs: 4 main + "Więcej"
  const bottomTabs: NavItem[] = [
    { view: 'dashboard', icon: '◼', label: 'Dashboard' },
    { view: 'expenses', icon: '💳', label: 'Wydatki' },
    { view: 'add', icon: '＋', label: 'Dodaj' },
    { view: 'scanner', icon: '🧾', label: 'Paragony' },
    { view: 'advisor', icon: '🤖', label: 'AI' },
  ];

  const moreItems: NavItem[] = [
    { view: 'subscriptions', icon: '🔁', label: 'Subskrypcje' },
    { view: 'categories', icon: '🏷️', label: 'Kategorie' },
    { view: 'goals', icon: '🎯', label: 'Cele' },
    { view: 'banksync', icon: '🏦', label: 'Sync banku' },
    { view: 'import', icon: '📥', label: 'Import CSV' },
  ];

  const isMoreActive = moreItems.some(i => i.view === currentView);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="nav">
        <div className="nav-logo">
          Wydatki<span>.</span>
        </div>

        <div className="nav-section-title">Główne</div>
        {mainItems.map(item => (
          <button
            key={item.view}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <span className="nav-item-icon">{item.icon}</span>
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
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="nav-bottom">
          <span className="api-key-label">Anthropic API Key</span>
          <input
            type={showKey ? 'text' : 'password'}
            className="api-key-input"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
            onFocus={() => setShowKey(true)}
            onBlur={() => setShowKey(false)}
          />
          {apiKey
            ? <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>✓ Klucz ustawiony</div>
            : <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>Wymagany dla OCR i AI</div>
          }
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
                <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span>
              </div>
            ) : (
              <>
                <span className="bottom-nav-icon emoji">{item.icon}</span>
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
                <span className="emoji" style={{ fontSize: 22 }}>{item.icon}</span>
                <span>{item.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text2)' }}>›</span>
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Anthropic API Key
              </div>
              <input
                type="password"
                className="api-key-input"
                style={{ fontSize: 15, padding: '12px 14px', borderRadius: 12 }}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => onApiKeyChange(e.target.value)}
              />
              {apiKey
                ? <div style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>✓ Klucz ustawiony</div>
                : <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Wymagany dla Skanowania i AI</div>
              }
              <AccentPicker accent={accent} onAccentChange={onAccentChange} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
