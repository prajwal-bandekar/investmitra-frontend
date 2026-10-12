import axios from 'axios';
import { clearUser, getUser } from './session';
import { ACCESS_KEY_MESSAGE, getAccessKey, getAdminKey, patchGate } from './access';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
});

// A free-tier host sleeps when idle; the first call may take a minute to be answered.
const FIRST_CALL_TIMEOUT = 70000;
const WAKING_AFTER = 3000;
let firstDone = false;
let wakingTimer = null;
const firstSettled = () => {
  firstDone = true;
  clearTimeout(wakingTimer);
  patchGate({ waking: false });
};

// Identifies the caller until token-based auth replaces it; adds the shared access/admin keys.
api.interceptors.request.use((config) => {
  const user = getUser();
  if (user) config.headers['X-User-Id'] = user.id;
  const access = getAccessKey();
  if (access) config.headers['X-Access-Key'] = access;
  const admin = getAdminKey();
  if (admin && (config.url || '').startsWith('/admin')) config.headers['X-Admin-Key'] = admin;
  if (!firstDone) {
    config.timeout = FIRST_CALL_TIMEOUT;
    if (!wakingTimer) wakingTimer = setTimeout(() => patchGate({ waking: true }), WAKING_AFTER);
  }
  return config;
});

// Every endpoint returns { data, message, statusCode }; errors carry a readable message.
api.interceptors.response.use(
  (response) => {
    if (!firstDone) firstSettled();
    return response.data;
  },
  (error) => {
    if (!firstDone) firstSettled();
    const offline = error.request && !error.response;
    const err = new Error(error.response?.data?.message || (offline ? 'The server is not answering.' : error.message));
    err.status = error.response?.status;
    // A rejected session ends here, whichever call noticed. Login/sign-up 401s are plain wrong-password errors.
    const url = error.config?.url || '';
    // The shared access key is missing or wrong: show the key screen, not the login redirect.
    if (err.status === 401 && ACCESS_KEY_MESSAGE.test(error.response?.data?.message || '')) {
      patchGate({ needKey: true, rejected: !!getAccessKey() });
      err.accessKey = true;
      return Promise.reject(err);
    }
    if (err.status === 401 && getUser() && !url.startsWith('/users/login') && url !== '/users') {
      clearUser();
      const path = window.location.pathname;
      if (path.startsWith('/app')) {
        try { sessionStorage.setItem('im.returnTo', path + window.location.search); } catch { /* storage blocked */ }
        window.location.assign('/login');
      }
    }
    err.offline = offline;
    return Promise.reject(err);
  }
);

export const Users = {
  signUp: (body) => api.post('/users', body),
  login: (email, password) => api.post('/users/login', { email, password }),
  get: (id) => api.get(`/users/${id}`),
};

export const Stocks = {
  search: (params) => api.get('/stocks', { params }),
  tracked: () => api.get('/stocks/tracked'),
  get: (symbol) => api.get(`/stocks/${encodeURIComponent(symbol)}`),
  quote: (symbol) => api.get(`/stocks/${encodeURIComponent(symbol)}/quote`),
  sectors: () => api.get('/sectors'),
};

export const Portfolios = {
  list: () => api.get('/portfolios'),
  create: (body) => api.post('/portfolios', body),
  get: (id) => api.get(`/portfolios/${id}`),
  trade: (id, body) => api.post(`/portfolios/${id}/trades`, body),
  trades: (id) => api.get(`/portfolios/${id}/trades`),
};

export const Watchlist = {
  list: () => api.get('/watchlist'),
  save: (symbol, targetPrice) => api.post('/watchlist', { symbol, targetPrice }),
  remove: (symbol) => api.delete(`/watchlist/${encodeURIComponent(symbol)}`),
};

export const PriceDesk = {
  run: () => api.post('/admin/price-job/run'),
  runs: () => api.get('/admin/price-job/runs'),
  quota: () => api.get('/admin/price-job/quota'),
};

// ---- ExpenseMitra ----

export const Expenses = {
  categories: () => api.get('/expense-categories'),
  createCategory: (body) => api.post('/expense-categories', body),
  updateCategory: (id, body) => api.put(`/expense-categories/${id}`, body),
  list: (params) => api.get('/expenses', { params }),
  create: (body) => api.post('/expenses', body),
  update: (id, body) => api.put(`/expenses/${id}`, body),
  remove: (id) => api.delete(`/expenses/${id}`),
  summary: (month) => api.get('/expenses/summary', { params: { month } }),
  budgets: (month) => api.get('/budgets', { params: { month } }),
  saveBudgets: (month, items) => api.put('/budgets', { month, items }),
};
