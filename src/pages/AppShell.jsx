import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Stocks, Users } from '../api/client';
import { clearUser, getUser, setUser } from '../api/session';
import { longDate, money } from '../format';
import { isMarketOpen, istShortDate, latestClose } from '../lib/market';
import useRemote from '../lib/useRemote';
import { Stamp, Tape, useTheme } from '../ui';
import TradeSlip from './TradeSlip';
import './AppShell.css';

const INVEST_NAV = [
  ['/app/markets', 'Markets', 'Markets', '01'],
  ['/app/book', 'My Book', 'Book', '02'],
  ['/app/watchlist', 'Watchlist', 'Watch', '03'],
  ['/app/desk', 'Price Desk', 'Desk', '04'],
];

const EXPENSE_NAV = [
  ['/app/expenses/overview', 'Daily Ledger', 'Ledger', '01'],
  ['/app/expenses/history', 'History', 'History', '02'],
  ['/app/expenses/budgets', 'Budgets', 'Budgets', '03'],
];

const LAST_PATH = { invest: 'im.lastInvestPath', expense: 'im.lastExpensePath' };

const remember = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage blocked */ } };
const recall = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };

/** InvestMitra | ExpenseMitra switch. Each side reopens where the user left it. */
function ModeSwitch({ mode, compact }) {
  const navigate = useNavigate();
  const go = (target) => {
    if (target === mode) return;
    navigate(target === 'expense'
      ? recall(LAST_PATH.expense, '/app/expenses/overview')
      : recall(LAST_PATH.invest, '/app/markets'));
  };
  return (
    <div className={`modeswitch${compact ? ' modeswitch--compact' : ''}`} role="tablist" aria-label="Switch product">
      <button role="tab" aria-selected={mode === 'invest'} className={mode === 'invest' ? 'is-on' : ''} onClick={() => go('invest')}>
        {compact ? 'Invest' : 'InvestMitra'}
      </button>
      <button role="tab" aria-selected={mode === 'expense'} className={mode === 'expense' ? 'is-on' : ''} onClick={() => go('expense')}>
        {compact ? 'Expense' : 'ExpenseMitra'}
      </button>
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
  const NAV = mode === 'expense' ? EXPENSE_NAV : INVEST_NAV;
  const brand = mode === 'expense' ? 'ExpenseMitra' : 'InvestMitra';

  useEffect(() => { remember(LAST_PATH[mode], location.pathname); }, [mode, location.pathname]);

  const latest = latestClose((tracked.data || []).map((s) => s.price));
  const ctx = useMemo(() => ({
    user,
    refreshUser,
    tracked: tracked.data || [],
    reloadTracked: tracked.reload,
    latest,
    openSlip: (opts) => setSlip(opts),
  }), [user, refreshUser, tracked.data, tracked.reload, latest]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const open = isMarketOpen();
  const roleStamp = user.role === 'ADVISOR' ? 'Advisor' : 'Learner';
  const themeLabel = theme === 'dark' ? 'Newsprint edition' : 'Ink edition';
  const logout = () => { clearUser(); navigate('/'); };

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell" data-mode={mode}>
        <nav className="rail" aria-label="Main">
          <NavLink to="/" className="display rail__brand" key={brand}>{brand}</NavLink>
          <div className="mono rail__vol">Vol. 1 · {istShortDate()}</div>
          <div className="double-rule rail__rule" />
          <div className="rail__who">
            <span className="rail__name">{user.name}</span>
            <Stamp>{roleStamp}</Stamp>
          </div>
          <div className="mono rail__id">Client ID {user.clientId}</div>
          <ModeSwitch mode={mode} />
          {mode === 'invest' ? (
            <>
              <div className="kicker rail__cash-label">Cash in hand</div>
              <div className="mono rail__cash">{money(user.cashBalance)}</div>
              <div className="mono rail__issued">of ₹10,00,000.00 issued</div>
            </>
          ) : (
            <>
              <div className="kicker rail__cash-label">Real money desk</div>
              <p className="rail__issued" style={{ fontSize: 15 }}>Your actual spending. Nothing here is pretend, and nothing here moves money.</p>
            </>
          )}
          <div className="rail__nav">
            {NAV.map(([to, label, , num]) => (
              <NavLink key={to} to={to}><span className="mono">{num}</span>{label}</NavLink>
            ))}
          </div>
          <div className="rail__foot">
            <button className="btn" style={{ width: '100%' }} onClick={toggle}>{themeLabel}</button>
            <button className="btn btn--link" onClick={logout}>Log out</button>
          </div>
        </nav>

        <div className="shell__main">
          <header className="topbar">
            <div style={{ minWidth: 0 }}>
              <NavLink to="/" className="display topbar__brand" key={brand}>{brand}</NavLink>
              <div className="topbar__who">
                <span>{user.name}</span>
                <Stamp size="sm">{roleStamp}</Stamp>
              </div>
            </div>
            <div className="topbar__right">
              <button className="topbar__theme mono" aria-label={themeLabel} onClick={toggle}>{theme === 'dark' ? 'NEWS' : 'INK'}</button>
              <button className="topbar__theme mono" aria-label="Log out" onClick={logout}>OUT</button>
            </div>
          </header>
          <div className="modestrip"><ModeSwitch mode={mode} compact /></div>

          {mode === 'invest' ? (
            <>
              <div className="banner mono">
                <span className="banner__state">{open ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
                <span>
                  {open ? 'Dalal Street is trading. ' : 'Dalal Street is asleep. '}
                  {latest ? `Prices from the close of ${longDate(latest)}.` : 'No closes on file yet; run the morning wire from the Price Desk.'}
                </span>
              </div>
              <Tape stocks={tracked.data} latest={latest} />
            </>
          ) : (
            <div className="banner mono">
              <span className="banner__state">EXPENSEMITRA</span>
              <span>Every rupee has a story. Log it before you forget it.</span>
            </div>
          )}

          <main className="shell__content">
            <div className="shell__page" key={mode}><Outlet /></div>
          </main>

          <nav className="bottomnav" aria-label="Main">
            {NAV.map(([to, , short, num]) => (
              <NavLink key={to} to={to}><span className="mono">{num}</span>{short}</NavLink>
            ))}
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
