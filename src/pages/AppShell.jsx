import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Stocks, Users } from '../api/client';
import { LAST_PATH, SESSION_KEY, clearUser, getUser, setUser } from '../api/session';
import { money } from '../format';
import { latestClose } from '../lib/market';
import useRemote from '../lib/useRemote';
import { Tape, useTheme } from '../ui';
import TradeSlip from './TradeSlip';
import './AppShell.css';

const INVEST_NAV = [
  ['/app/markets', 'Markets'],
  ['/app/book', 'Portfolios'],
  ['/app/watchlist', 'Watchlist'],
];
// No admin role exists yet; advisors stand in for admins on the Price Desk.
const DESK = ['/app/desk', 'Price Desk'];

const EXPENSE_NAV = [
  ['/app/expenses/overview', 'Ledger'],
  ['/app/expenses/plan', 'Plan'],
  ['/app/expenses/history', 'History'],
  ['/app/expenses/budgets', 'Budgets'],
];

const remember = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage blocked */ } };
const recall = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

/**
 * Maps a path to the page it may be restored to, or null. Only list pages are restored: detail pages such as
 * /app/book/12 fall back to their section root, and the Price Desk is for advisors only.
 */
const restorable = (path, mode, isAdvisor) => {
  if (typeof path !== 'string') return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
  const nav = mode === 'expense' ? EXPENSE_NAV : [...INVEST_NAV, ...(isAdvisor ? [DESK] : [])];
  const hit = nav.find(([to]) => clean === to);
  if (hit) return hit[0];
  if (mode === 'invest' && clean.startsWith('/app/book/')) return '/app/book';
  return null;
};

const DEFAULT_PATH = { invest: '/app/markets', expense: '/app/expenses/overview' };

/** InvestMitra | ExpenseMitra switch. Each side reopens where the user left it. Placed by CSS: in the header on wide screens, a strip below it otherwise. */
function ModeSwitch({ mode, isAdvisor }) {
  const navigate = useNavigate();
  const go = (target) => {
    if (target === mode) return;
    navigate(restorable(recall(LAST_PATH[target]), target, isAdvisor) || DEFAULT_PATH[target]);
  };
  return (
    <div className="modeswitch" role="group" aria-label="Switch product">
      <button type="button" aria-pressed={mode === 'invest'} className={mode === 'invest' ? 'is-on' : ''} onClick={() => go('invest')}>Invest</button>
      <button type="button" aria-pressed={mode === 'expense'} className={mode === 'expense' ? 'is-on' : ''} onClick={() => go('expense')}>Expense</button>
    </div>
  );
}

const AppContext = createContext(null);

/**
 * Shared state for signed-in pages: the user, tracked prices, and the order slip.
 * `openSlip({ stock, side, portfolioId, onDone })` opens the slip from any page.
 */
export const useApp = () => useContext(AppContext);

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [user, setCurrentUser] = useState(getUser());
  const [slip, setSlip] = useState(null);
  const tracked = useRemote(() => Stocks.tracked(), []);

  const refreshUser = useCallback(async () => {
    const current = getUser();
    if (!current) return;
    try {
      const res = await Users.get(current.id);
      setUser(res.data);
      setCurrentUser(res.data);
    } catch (err) {
      if (err.status === 404) {
        clearUser();
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const mode = location.pathname.startsWith('/app/expenses') ? 'expense' : 'invest';
  const brand = mode === 'expense' ? 'ExpenseMitra' : 'InvestMitra';

  const isAdvisor = user?.role === 'ADVISOR';
  useEffect(() => {
    const page = restorable(location.pathname, mode, isAdvisor);
    if (page) remember(LAST_PATH[mode], page);
  }, [mode, location.pathname, isAdvisor]);

  // Logging in or out in another tab changes this tab's session too. A different account means a clean reload,
  // so nothing from the previous user stays on screen; the same account is left alone.
  const userId = useRef(user?.id);
  userId.current = user?.id;
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== null && e.key !== SESSION_KEY) return;
      const next = getUser();
      if (!next) { setCurrentUser(null); return; }
      if (next.id !== userId.current) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const latest = latestClose((tracked.data || []).map((s) => s.price));
  const ctx = useMemo(() => ({
    user,
    refreshUser,
    tracked: tracked.data || [],
    reloadTracked: tracked.reload,
    latest,
    isAdvisor,
    openSlip: (opts) => setSlip(opts),
  }), [user, isAdvisor, refreshUser, tracked.data, tracked.reload, latest]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const baseNav = mode === 'expense' ? EXPENSE_NAV : INVEST_NAV;
  const navItems = mode === 'invest' && isAdvisor ? [...baseNav, DESK] : baseNav;
  const logout = () => { clearUser(); navigate('/'); };

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell" data-mode={mode}>
        <div className="shell__main">
          <header className="topbar">
            <NavLink to={mode === 'expense' ? '/app/expenses/overview' : '/app/markets'} className="display topbar__brand" key={brand}>{brand}</NavLink>
            <nav className="topbar__nav" aria-label="Main">
              {navItems.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            </nav>
            <div className="topbar__mode"><ModeSwitch mode={mode} isAdvisor={isAdvisor} /></div>
            <div className="topbar__right">
              {mode === 'invest' && (
                <div className="topbar__cashbox">
                  <span className="topbar__cashlabel">Cash</span>
                  <span className="mono topbar__cash">{money(user.cashBalance)}</span>
                </div>
              )}
              <button className="topbar__btn mono" aria-label={themeLabel} title={themeLabel} onClick={toggle}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
              <button className="topbar__btn mono" title={user.name} onClick={logout}>Log out</button>
            </div>
          </header>
          {mode === 'invest' && <Tape stocks={tracked.data} latest={latest} />}

          <main className="shell__content">
            <div className="shell__page" key={mode}><Outlet /></div>
          </main>

          <nav className="bottomnav" aria-label="Main (mobile)">
            {navItems.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          </nav>
        </div>
      </div>

      {slip && (
        <TradeSlip {...slip} cash={user.cashBalance} onClose={() => setSlip(null)}
          onDone={() => { refreshUser(); slip.onDone?.(); }} />
      )}
    </AppContext.Provider>
  );
}
