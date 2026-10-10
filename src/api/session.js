const KEY = 'investmitra.user';

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
  } catch {
    // ignore
  }
}
