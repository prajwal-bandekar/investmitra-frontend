// Shared-key gate for the hosted demo. Keys live in localStorage and are sent as headers.
// Nothing here is a secret in the code; the owner types the keys in.
const ACCESS = 'investmitra.accessKey';
const ADMIN = 'investmitra.adminKey';

export const REQUIRE_ACCESS_KEY = process.env.REACT_APP_REQUIRE_ACCESS_KEY === 'true';
export const ACCESS_KEY_MESSAGE = /access key required/i;

const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const write = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage blocked */ } };

export const getAccessKey = () => read(ACCESS);
export const setAccessKey = (v) => write(ACCESS, v.trim());
export const getAdminKey = () => read(ADMIN);
export const setAdminKey = (v) => write(ADMIN, v.trim());

// Tiny store so the client (non-React) can tell the gate component what is happening.
let state = { needKey: REQUIRE_ACCESS_KEY && !getAccessKey(), rejected: false, waking: false };
const listeners = new Set();
export const getGateState = () => state;
export function patchGate(patch) {
  const next = { ...state, ...patch };
  if (Object.keys(patch).every((k) => next[k] === state[k])) return;
  state = next;
  listeners.forEach((l) => l());
}
export function subscribeGate(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
