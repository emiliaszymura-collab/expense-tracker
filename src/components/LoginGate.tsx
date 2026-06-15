import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { setToken, clearToken, authHeader } from '../authToken';

const SERVER = process.env.REACT_APP_SERVER_URL || '';

type Status = { configured: boolean; hasPasskey: boolean; authed: boolean };

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offerPasskey, setOfferPasskey] = useState(false);
  // Passkeys are per-device — track whether THIS device has registered one
  const [pkHere, setPkHere] = useState(localStorage.getItem('pkRegistered') === '1');

  const supportsPasskey = browserSupportsWebAuthn();
  const markPkHere = () => { localStorage.setItem('pkRegistered', '1'); setPkHere(true); };

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${SERVER}/api/auth/status`, { headers: { ...authHeader() } });
      const s: Status = await r.json();
      setStatus(s);
      return s;
    } catch {
      // If the auth service is unreachable, fail open (don't lock the user out of a working app)
      setStatus({ configured: false, hasPasskey: false, authed: true });
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const post = async (path: string, body?: any) => {
    const r = await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body || {}),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Błąd');
    return data;
  };

  // First-time PIN setup
  const doSetup = async () => {
    setError('');
    if (pin.length < 4) { setError('PIN musi mieć min. 4 cyfry'); return; }
    if (pin !== pin2) { setError('PIN-y nie są takie same'); return; }
    setBusy(true);
    try {
      const { token } = await post('/api/auth/setup', { pin });
      setToken(token);
      setPin(''); setPin2('');
      await refresh();
      if (supportsPasskey && !pkHere) setOfferPasskey(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  // PIN login (this device / recovery)
  const doPinLogin = async () => {
    setError('');
    setBusy(true);
    try {
      const { token } = await post('/api/auth/pin', { pin });
      setToken(token);
      setPin('');
      await refresh();
      // Offer Face ID whenever THIS device hasn't registered one yet (per-device)
      if (supportsPasskey && !pkHere) setOfferPasskey(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  // Passkey (Face ID) login
  const doPasskeyLogin = async () => {
    setError('');
    setBusy(true);
    try {
      const options = await post('/api/auth/passkey/login/options');
      const asr = await startAuthentication({ optionsJSON: options });
      const { token } = await post('/api/auth/passkey/login/verify', { response: asr });
      setToken(token);
      markPkHere();
      await refresh();
    } catch (e: any) {
      setError('Nie rozpoznano twarzy/odcisku — zaloguj się PIN-em, a potem włącz Face ID na tym urządzeniu.');
    } finally { setBusy(false); }
  };

  // Enable passkey on this device (after logging in)
  const enablePasskey = async () => {
    setError('');
    setBusy(true);
    try {
      const options = await post('/api/auth/passkey/register/options');
      const att = await startRegistration({ optionsJSON: options });
      await post('/api/auth/passkey/register/verify', { response: att });
      markPkHere();
      setOfferPasskey(false);
      await refresh();
    } catch (e: any) { setError(e.message || 'Nie udało się włączyć Face ID'); } finally { setBusy(false); }
  };

  const logout = () => { clearToken(); refresh(); };

  // ── Loading ──
  if (!status) {
    return <div style={wrap}><div style={card}><div className="spinner" /></div></div>;
  }

  // ── Authed → show the app (with optional one-time "enable Face ID" prompt) ──
  if (status.authed) {
    return (
      <>
        {children}
        {offerPasskey && supportsPasskey && (
          <div style={modalWrap}>
            <div style={card}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
              <h2 style={h2}>Włączyć Face ID?</h2>
              <p style={sub}>Następnym razem zalogujesz się twarzą/odciskiem — bez PIN-u.</p>
              {error && <div style={err}>{error}</div>}
              <button style={btnPrimary} onClick={enablePasskey} disabled={busy}>
                {busy ? '…' : 'Włącz Face ID'}
              </button>
              <button style={btnText} onClick={() => setOfferPasskey(false)} disabled={busy}>Może później</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Not configured → first-time PIN setup ──
  if (!status.configured) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>
          <h2 style={h2}>Zabezpiecz aplikację</h2>
          <p style={sub}>Ustaw PIN. To pierwszy raz — będzie chronił Twoje dane bankowe.</p>
          {error && <div style={err}>{error}</div>}
          <input style={input} type="password" inputMode="numeric" placeholder="PIN (min. 4 cyfry)" value={pin} onChange={e => setPin(e.target.value)} />
          <input style={input} type="password" inputMode="numeric" placeholder="Powtórz PIN" value={pin2} onChange={e => setPin2(e.target.value)} />
          <button style={btnPrimary} onClick={doSetup} disabled={busy}>{busy ? '…' : 'Ustaw PIN'}</button>
        </div>
      </div>
    );
  }

  // ── Configured, not authed → unlock ──
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🔐</div>
        <h2 style={h2}>Odblokuj</h2>
        <p style={sub}>Twoje dane są chronione.</p>
        {error && <div style={err}>{error}</div>}
        {supportsPasskey && (pkHere || status.hasPasskey) && (
          <button style={btnPrimary} onClick={doPasskeyLogin} disabled={busy}>
            {busy ? '…' : '🙂  Zaloguj przez Face ID'}
          </button>
        )}
        <input style={input} type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && doPinLogin()} />
        <button style={status.hasPasskey ? btnSecondary : btnPrimary} onClick={doPinLogin} disabled={busy}>
          {busy ? '…' : 'Zaloguj PIN-em'}
        </button>
        <button style={btnText} onClick={logout}>Wyloguj / reset tokenu</button>
      </div>
    </div>
  );
}

// ── inline styles (keep this component self-contained) ──
const wrap: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #f5f5f7)', padding: 20 };
const modalWrap: React.CSSProperties = { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 1000, padding: 20 };
const card: React.CSSProperties = { background: 'white', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' };
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 8px' };
const sub: React.CSSProperties = { fontSize: 14, color: 'var(--text2, #6e6e73)', margin: '0 0 20px', lineHeight: 1.5 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1px solid #d2d2d7', fontSize: 16, marginBottom: 10, outline: 'none' };
const btnPrimary: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: 12, border: 'none', background: 'var(--accent, #0071e3)', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10 };
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#e8e8ed', color: '#1d1d1f' };
const btnText: React.CSSProperties = { width: '100%', padding: '8px', border: 'none', background: 'transparent', color: 'var(--text2, #6e6e73)', fontSize: 13, cursor: 'pointer' };
const err: React.CSSProperties = { background: 'rgba(255,59,48,0.08)', color: '#ff3b30', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 };
