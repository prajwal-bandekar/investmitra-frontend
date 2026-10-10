import axios from 'axios';
import { getUser } from './session';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
});

// Identifies the caller until token-based auth replaces it.
api.interceptors.request.use((config) => {
  const user = getUser();
  if (user) config.headers['X-User-Id'] = user.id;
  return config;
});

// Every endpoint returns { data, message, statusCode }; errors carry a readable message.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const offline = error.request && !error.response;
    const err = new Error(error.response?.data?.message || (offline ? 'The server is not answering.' : error.message));
    err.status = error.response?.status;
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
