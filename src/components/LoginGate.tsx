import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { getToken, setToken, authHeader } from '../authToken';

const SERVER = process.env.REACT_APP_SERVER_URL || '';

type Status = { authed: boolean; username: string | null; hasPasskey: boolean };
type Mode = 'login' | 'register';

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offerPasskey, setOfferPasskey] = useState(false);
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
      // If the auth service is unreachable: honour an existing token optimistically,
      // otherwise require login (don't silently unlock a shared device).
      const s: Status = { authed: !!getToken(), username: null, hasPasskey: false };
      setStatus(s);
      return s;
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

  const afterAuth = async () => {
    setPin(''); setPin2(''); setError('');
    await refresh();
    if (supportsPasskey && !pkHere) setOfferPasskey(true);
  };

  const doRegister = async () => {
    setError('');
    if (username.trim().length < 3) { setError('Nazwa musi mieć min. 3 znaki'); return; }
    if (pin.length < 4) { setError('PIN musi mieć min. 4 cyfry'); return; }
    if (pin !== pin2) { setError('PIN-y nie są takie same'); return; }
    setBusy(true);
    try {
      const { token } = await post('/api/auth/register', { username: username.trim(), pin });
      setToken(token);
      await afterAuth();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const doLogin = async () => {
    setError('');
    if (!username.trim()) { setError('Podaj nazwę użytkownika'); return; }
    setBusy(true);
    try {
      const { token } = await post('/api/auth/login', { username: username.trim(), pin });
      setToken(token);
      await afterAuth();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

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
      setError('Nie rozpoznano — zaloguj się nazwą i PIN-em, potem włącz Face ID.');
    } finally { setBusy(false); }
  };

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

  // ── Not authed → login / register ──
  const submit = mode === 'register' ? doRegister : doLogin;
  return (
    <div style={wrap}>
      <div style={card}>
        <img src="/logo.png?v=2" alt="" width={56} height={56} style={{ borderRadius: 14, marginBottom: 12 }} />
        <h2 style={h2}>{mode === 'register' ? 'Załóż konto' : 'Zaloguj się'}</h2>
        <p style={sub}>
          {mode === 'register'
            ? 'Wybierz nazwę i PIN. Twoje dane będą prywatne i chronione.'
            : 'Wpisz swoją nazwę i PIN, aby wejść do aplikacji.'}
        </p>
        {error && <div style={err}>{error}</div>}

        {supportsPasskey && pkHere && (
          <button style={btnSecondary} onClick={doPasskeyLogin} disabled={busy}>
            {busy ? '…' : '🙂  Zaloguj przez Face ID'}
          </button>
        )}

        <input
          style={input}
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Nazwa użytkownika"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          style={input}
          type="password"
          inputMode="numeric"
          placeholder={mode === 'register' ? 'PIN (min. 4 cyfry)' : 'PIN'}
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && mode === 'login' && submit()}
        />
        {mode === 'register' && (
          <input
            style={input}
            type="password"
            inputMode="numeric"
            placeholder="Powtórz PIN"
            value={pin2}
            onChange={e => setPin2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        )}

        <button style={btnPrimary} onClick={submit} disabled={busy}>
          {busy ? '…' : (mode === 'register' ? 'Utwórz konto' : 'Zaloguj się')}
        </button>

        <button
          style={btnText}
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
        >
          {mode === 'register' ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Załóż nowe'}
        </button>
      </div>
    </div>
  );
}

// ── inline styles (keep this component self-contained) ──
const wrap: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #f5f5f7)', padding: 20 };
const modalWrap: React.CSSProperties = { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 1000, padding: 20 };
const card: React.CSSProperties = { background: 'var(--card, #fff)', color: 'var(--text, #1d1d1f)', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.18)' };
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 8px' };
const sub: React.CSSProperties = { fontSize: 14, color: 'var(--text2, #6e6e73)', margin: '0 0 20px', lineHeight: 1.5 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: 16, marginBottom: 10, outline: 'none' };
const btnPrimary: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: 12, border: 'none', background: 'var(--accent, #0071e3)', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10 };
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#e8e8ed', color: '#1d1d1f' };
const btnText: React.CSSProperties = { width: '100%', padding: '8px', border: 'none', background: 'transparent', color: 'var(--text2, #6e6e73)', fontSize: 13, cursor: 'pointer' };
const err: React.CSSProperties = { background: 'rgba(255,59,48,0.08)', color: '#ff3b30', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 };
