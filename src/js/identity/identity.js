// Layered player identity.
//
// Precedence for a player's stable key:  account_id > device_id > normalized_name
// written as "acct:<id>" / "dev:<id>" / "name:<norm>" so the three
// namespaces can never collide.
//
// The DEVICE + NAME layers are always available, synchronous, and never
// throw (they tolerate private-mode localStorage failures). The ACCOUNT
// layer (Supabase Auth magic link) is strictly OPTIONAL and ADDITIVE —
// every account function swallows errors, so with Auth disabled the whole
// app runs on device identity alone.

import { getClient } from '../db/supabase.js';

const DEVICE_KEY = 'rummy_device_id';
const NAME_KEY = 'rummy_display_name';

let cachedAccount = null; // { id, email } | null — populated by loadSession()

// ---- DEVICE LAYER (always available, synchronous, never throws) ----
export function getDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem(DEVICE_KEY);
  } catch {
    /* private mode — fall through to in-memory */
  }
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      localStorage.setItem(DEVICE_KEY, id);
    } catch {
      /* in-memory only for this session */
    }
  }
  return id;
}

export function getRememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function rememberName(name) {
  if (name && name.trim()) {
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* ignore */
    }
  }
}

export function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---- RESOLUTION (core; precedence account > device > name) ----
// Returns the exact identity fields stored on a `players` row (and later
// copied into `player_results` at finish). `account` may be null.
export function buildPlayerIdentityFields(name, account = cachedAccount) {
  const deviceId = getDeviceId();
  const normalized = normalizeName(name);
  let stableKey;
  if (account?.id) stableKey = `acct:${account.id}`;
  else if (deviceId) stableKey = `dev:${deviceId}`;
  else stableKey = `name:${normalized}`;
  return {
    account_id: account?.id ?? null,
    device_id: deviceId,
    normalized_name: normalized,
    stable_key: stableKey,
  };
}

// The current stable key(s) for "me" (stats / leaderboard / head-to-head).
// When signed in, this UNIONS the account key with the device key so that
// games played before sign-in (keyed dev:) still fold into "my" history.
// The account key is kept FIRST so callers that take [0] get the canonical id.
export function getMyStableKeys() {
  const keys = [];
  if (cachedAccount?.id) keys.push(`acct:${cachedAccount.id}`);
  keys.push(`dev:${getDeviceId()}`);
  return keys;
}

// ====================================================================
// ---- ACCOUNT LAYER (OPTIONAL / ADDITIVE) ----
// Non-blocking; all swallow errors. If Supabase Auth is unconfigured,
// cachedAccount stays null and the app runs on device identity.
// ====================================================================
export async function loadSession() {
  try {
    const { data } = await getClient().auth.getUser();
    cachedAccount = data?.user
      ? { id: data.user.id, email: data.user.email }
      : null;
  } catch {
    cachedAccount = null;
  }
  return cachedAccount;
}

export function getAccount() {
  return cachedAccount;
}

export function isSignedIn() {
  return !!cachedAccount?.id;
}

export async function signIn(email) {
  // Magic link. On GitHub Pages, emailRedirectTo must be the Pages URL.
  const { error } = await getClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return { sent: true };
}

export async function signOut() {
  try {
    await getClient().auth.signOut();
  } catch {
    /* ignore */
  }
  cachedAccount = null;
}

export function onAuthChange(cb) {
  try {
    return getClient().auth.onAuthStateChange((_evt, session) => {
      cachedAccount = session?.user
        ? { id: session.user.id, email: session.user.email }
        : null;
      cb(cachedAccount);
    });
  } catch {
    return { data: { subscription: { unsubscribe() {} } } };
  }
}

// Records a device<->account mapping so leaderboard/H2H can fold a
// person's prior device-only history under their account.
export async function linkDeviceToAccount() {
  const acct = cachedAccount;
  const deviceId = getDeviceId();
  if (!acct?.id || !deviceId) return;
  try {
    await getClient()
      .from('identity_links')
      .upsert(
        { account_id: acct.id, device_id: deviceId },
        { onConflict: 'account_id,device_id', ignoreDuplicates: true }
      );
  } catch {
    /* ignore */
  }
}
