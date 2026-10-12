export const SESSION_KEY = 'investmitra.user';
const KEY = SESSION_KEY;
/** Where each product was last open; forgotten on logout so the next user starts clean. */
export const LAST_PATH = { invest: 'im.lastInvestPath', expense: 'im.lastExpensePath' };

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function setUser(user) {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable (private mode); the session lasts until reload.
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LAST_PATH.invest);
    localStorage.removeItem(LAST_PATH.expense);
  } catch {
    // ignore
  }
}
