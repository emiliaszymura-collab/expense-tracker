// Multi-user auth: each person registers their own account (username + PIN),
// optionally adds a passkey (Face ID) per device. Tokens carry the userId, and
// all server-side data is isolated per user.
const crypto = require('crypto');
const db = require('./db');

// @simplewebauthn (WebAuthn/Face ID) needs a WebCrypto instance on globalThis.
// Some Node versions don't expose it by default → provide it, or passkeys fail with
// "An instance of the Crypto API could not be located".
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;

// @simplewebauthn/server v13 is ESM-only → load via dynamic import and cache it.
let _wa = null;
async function wa() {
  if (!_wa) _wa = await import('@simplewebauthn/server');
  return _wa;
}

const RP_NAME = 'Spendli';
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

// ── User store (KV 'users' = array of {id, username, salt, hash, passkeys:[]}) ──
async function listUsers() {
  return (await db.getKV('users')) || [];
}
async function saveUsers(users) {
  await db.setKV('users', users);
}
function normName(u) {
  return String(u || '').trim().toLowerCase();
}
async function getUserById(id) {
  return (await listUsers()).find(u => u.id === id) || null;
}
async function getUserByName(username) {
  const n = normName(username);
  return (await listUsers()).find(u => normName(u.username) === n) || null;
}

function validUsername(u) {
  return /^[a-zA-Z0-9_.-]{3,24}$/.test(String(u || '').trim());
}

async function register(username, pin) {
  if (!validUsername(username)) throw new Error('Nazwa: 3–24 znaki (litery, cyfry, _ . -)');
  if (!pin || String(pin).length < 4) throw new Error('PIN musi mieć min. 4 znaki');
  if (await getUserByName(username)) throw new Error('Ta nazwa jest już zajęta');
  const users = await listUsers();
  const user = {
    id: crypto.randomUUID(),
    username: String(username).trim(),
    ...hashPin(pin),
    passkeys: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

async function login(username, pin) {
  const user = await getUserByName(username);
  if (!user || !checkPin(pin, user)) return null;
  return user;
}

// ── Session token (stateless HMAC over {uid, exp}) ─────────
async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  let s = await db.getKV('auth_secret');
  if (!s) { s = crypto.randomBytes(32).toString('hex'); await db.setKV('auth_secret', s); }
  return s;
}
async function issueToken(uid) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Date.now() + TOKEN_TTL })).toString('base64url');
  const mac = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}
// Returns the payload {uid, exp} if valid, otherwise null.
async function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const exp = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
// Resolve a token to a live user (or null).
async function userFromToken(token) {
  const p = await verifyToken(token);
  if (!p || !p.uid) return null;
  return getUserById(p.uid);
}

// ── Passkey credential index (credId → uid) for usernameless login ──
async function passkeyIndex() {
  return (await db.getKV('passkey_index')) || {};
}

// ── WebAuthn: registration (must be logged in → uid) ───────
async function registrationOptions(uid, rpID) {
  const user = await getUserById(uid);
  if (!user) throw new Error('Brak użytkownika');
  const { generateRegistrationOptions } = await wa();
  const opts = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: Buffer.from(user.id),
    userName: user.username,
    attestationType: 'none',
    excludeCredentials: (user.passkeys || []).map(c => ({ id: c.id, transports: c.transports })),
    // residentKey 'required' → the passkey is discoverable, so usernameless Face ID login works
    authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
  });
  await db.setKV(`auth_challenge:${uid}`, opts.challenge);
  return opts;
}
async function verifyRegistration(uid, rpID, origin, response) {
  const { verifyRegistrationResponse } = await wa();
  const challenge = await db.getKV(`auth_challenge:${uid}`);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (!verification.verified || !verification.registrationInfo) return false;
  const c = verification.registrationInfo.credential;
  const users = await listUsers();
  const user = users.find(u => u.id === uid);
  if (!user) return false;
  user.passkeys = user.passkeys || [];
  user.passkeys.push({
    id: c.id,
    publicKey: Buffer.from(c.publicKey).toString('base64url'),
    counter: c.counter,
    transports: response.response?.transports || [],
  });
  await saveUsers(users);
  const idx = await passkeyIndex();
  idx[c.id] = uid;
  await db.setKV('passkey_index', idx);
  await db.setKV(`auth_challenge:${uid}`, null);
  return true;
}

// ── WebAuthn: usernameless authentication (discoverable credentials) ──
async function authenticationOptions(rpID) {
  const { generateAuthenticationOptions } = await wa();
  const opts = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [], // discoverable → device picks the passkey, resolves to its user
    userVerification: 'preferred',
  });
  await db.setKV('auth_challenge_login', opts.challenge);
  return opts;
}
// Returns the uid on success, otherwise null.
async function verifyAuthentication(rpID, origin, response) {
  const { verifyAuthenticationResponse } = await wa();
  const idx = await passkeyIndex();
  const uid = idx[response.id];
  if (!uid) return null;
  const user = await getUserById(uid);
  const cred = (user?.passkeys || []).find(c => c.id === response.id);
  if (!cred) return null;
  const challenge = await db.getKV('auth_challenge_login');
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: cred.id,
      publicKey: Buffer.from(cred.publicKey, 'base64url'),
      counter: cred.counter,
      transports: cred.transports,
    },
  });
  if (!verification.verified) return null;
  const users = await listUsers();
  const u = users.find(x => x.id === uid);
  const cc = u.passkeys.find(c => c.id === response.id);
  cc.counter = verification.authenticationInfo.newCounter;
  await saveUsers(users);
  await db.setKV('auth_challenge_login', null);
  return uid;
}

// ── One-time migration: fold the old single-user (auth_pin) into a real account ──
// Returns the legacy user's id if a migration happened, else null.
async function migrateLegacy() {
  const users = await listUsers();
  if (users.length) return null;
  const legacyPin = await db.getKV('auth_pin');
  if (!legacyPin) return null;
  const legacyCreds = (await db.getKV('auth_credentials')) || [];
  const user = {
    id: crypto.randomUUID(),
    username: 'emilia',
    salt: legacyPin.salt,
    hash: legacyPin.hash,
    passkeys: legacyCreds,
    createdAt: new Date().toISOString(),
  };
  await saveUsers([user]);
  if (legacyCreds.length) {
    const idx = {};
    for (const c of legacyCreds) idx[c.id] = user.id;
    await db.setKV('passkey_index', idx);
  }
  console.log(`[auth] migrated legacy single-user PIN → account "${user.username}" (${user.id})`);
  return user.id;
}

module.exports = {
  register, login,
  issueToken, verifyToken, userFromToken,
  registrationOptions, verifyRegistration,
  authenticationOptions, verifyAuthentication,
  getUserById, getUserByName, listUsers,
  migrateLegacy,
};
