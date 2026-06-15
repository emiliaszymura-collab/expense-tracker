// Passkey (WebAuthn / Face ID) login with a PIN as master credential + multi-device recovery.
// Non-breaking: the app gate is only "active" once a PIN has been set.
const crypto = require('crypto');
const db = require('./db');

// @simplewebauthn/server v13 is ESM-only → load via dynamic import and cache it.
let _wa = null;
async function wa() {
  if (!_wa) _wa = await import('@simplewebauthn/server');
  return _wa;
}

const RP_NAME = 'Wydatki';
const USER_ID = Buffer.from('emilia-owner'); // single-user app
const USER_NAME = 'emilia';
const TOKEN_TTL = 30 * 864e5; // 30 days

// ── PIN (scrypt) ───────────────────────────────────────────
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}
function checkPin(pin, rec) {
  if (!rec) return false;
  const h = crypto.scryptSync(String(pin), rec.salt, 64).toString('hex');
  const a = Buffer.from(h), b = Buffer.from(rec.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function isConfigured() {
  return !!(await db.getKV('auth_pin'));
}
async function setPin(pin) {
  if (!pin || String(pin).length < 4) throw new Error('PIN musi mieć min. 4 znaki');
  await db.setKV('auth_pin', hashPin(pin));
}
async function verifyPin(pin) {
  return checkPin(pin, await db.getKV('auth_pin'));
}

// ── Session token (stateless HMAC) ─────────────────────────
async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  let s = await db.getKV('auth_secret');
  if (!s) { s = crypto.randomBytes(32).toString('hex'); await db.setKV('auth_secret', s); }
  return s;
}
async function issueToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL })).toString('base64url');
  const mac = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}
async function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [body, mac] = token.split('.');
  if (!body || !mac) return false;
  const exp = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return !(p.exp && Date.now() > p.exp); }
  catch { return false; }
}

// ── Stored passkey credentials ─────────────────────────────
async function getCredentials() {
  return (await db.getKV('auth_credentials')) || [];
}
async function hasCredentials() {
  return (await getCredentials()).length > 0;
}

// ── WebAuthn: registration ─────────────────────────────────
async function registrationOptions(rpID) {
  const { generateRegistrationOptions } = await wa();
  const creds = await getCredentials();
  const opts = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: USER_ID,
    userName: USER_NAME,
    attestationType: 'none',
    excludeCredentials: creds.map(c => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  await db.setKV('auth_challenge', { challenge: opts.challenge, type: 'reg' });
  return opts;
}
async function verifyRegistration(rpID, origin, response) {
  const { verifyRegistrationResponse } = await wa();
  const saved = await db.getKV('auth_challenge');
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: saved?.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (!verification.verified || !verification.registrationInfo) return false;
  const c = verification.registrationInfo.credential;
  const creds = await getCredentials();
  creds.push({
    id: c.id,
    publicKey: Buffer.from(c.publicKey).toString('base64url'),
    counter: c.counter,
    transports: response.response?.transports || [],
  });
  await db.setKV('auth_credentials', creds);
  await db.setKV('auth_challenge', null);
  return true;
}

// ── WebAuthn: authentication ───────────────────────────────
async function authenticationOptions(rpID) {
  const { generateAuthenticationOptions } = await wa();
  const creds = await getCredentials();
  const opts = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map(c => ({ id: c.id, transports: c.transports })),
    userVerification: 'preferred',
  });
  await db.setKV('auth_challenge', { challenge: opts.challenge, type: 'auth' });
  return opts;
}
async function verifyAuthentication(rpID, origin, response) {
  const { verifyAuthenticationResponse } = await wa();
  const saved = await db.getKV('auth_challenge');
  const creds = await getCredentials();
  const cred = creds.find(c => c.id === response.id);
  if (!cred) return false;
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: saved?.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: cred.id,
      publicKey: Buffer.from(cred.publicKey, 'base64url'),
      counter: cred.counter,
      transports: cred.transports,
    },
  });
  if (!verification.verified) return false;
  cred.counter = verification.authenticationInfo.newCounter;
  await db.setKV('auth_credentials', creds);
  await db.setKV('auth_challenge', null);
  return true;
}

module.exports = {
  isConfigured, setPin, verifyPin,
  issueToken, verifyToken,
  getCredentials, hasCredentials,
  registrationOptions, verifyRegistration,
  authenticationOptions, verifyAuthentication,
};
