# Frontend components

Paths relative to `investmitra-frontend/src/`.

## App wiring
- **index.js**: `ReactDOM.createRoot` renders `<App />`.
- **App.js**: wraps `ThemeProvider` > `ToastProvider` > `BrowserRouter`; imports global CSS (`styles/tokens.css`, `styles/components.css`, `pages/pages.css`); defines routes (see overview.md).

## api / lib / format
- **api/client.js**: axios instance (`REACT_APP_API_URL` or `http://localhost:8080/api`). Request interceptor adds `X-User-Id` from the session. Response interceptor unwraps to the `{data, message, statusCode}` body and converts errors to `Error` with `.status` and `.offline`. Exports `Users`, `Stocks`, `Portfolios`, `Watchlist`, `PriceDesk`.
- **api/session.js**: `getUser`, `setUser`, `clearUser` over `localStorage['investmitra.user']`, all try/catch safe.
- **lib/useRemote.js**: `useRemote(fetcher, deps)` returns `{data, error, loading, reload}`; ignores stale responses via a sequence counter; `reload()` keeps old data visible (no flash).
- **lib/market.js**: `isMarketOpen()` (09:15-15:30 IST Mon-Fri), `istDateline`, `istShortDate`, `latestClose(prices)` (max `asOf`).
- **format.js**: `money`, `signedMoney`, `pct`, `arrow`, `tone` (gain/loss/flat), `qty`, `shortDate`, `longDate`, `stamp`, `parseClientId` ("IM-2031" to 2031).
- **content/letters.js**: array of parody testimonials (Erlich Bachman, Gavin Belson, Russ Hanneman) with stamp text and tilt, shown on Landing.

## ui/ (exported from `ui/index.js`)
- **Stamp** (`ui/Stamp.jsx`): props `tone` ink/loss/gain/filled, `size` sm/md/lg/slam, `tilt`, `onPaper2`.
- **Tape** (`ui/Tape.jsx`): ticker tape of tracked closes; props `stocks`, `latest`; marks stale closes; renders the run twice for a seamless loop.
- **Shimmer** (`ui/Shimmer.jsx`): loading state, tape crawl plus shimmering rows; prop `rows`.
- **StateBlock** (`ui/StateBlock.jsx`): empty/error block; props `stamp`, `title`, `action`, `error`, `plain`.
- **Field** (`ui/Field.jsx`): underlined labelled input/select; props `label`, `number`, `error`, `mono`, `large`, `strong`, `as`.
- **Toast** (`ui/Toast.jsx`): `ToastProvider`, `useToast()` returns `show(text)`; one toast, auto-hides after 3.6s.
- **Theme** (`ui/Theme.jsx`): `ThemeProvider`, `useTheme()` gives `{theme, toggle}`; sets `data-theme` on `<html>`; persisted under `investmitra.theme`.
- **Term** (`ui/Term.jsx`): `<abbr>` jargon tooltip. **Glossary** (`ui/Glossary.jsx`): collapsed `<details>` with 5 terms (Folio, Last close, Avg buy, Unrealised, Realised).

## pages/
- **AppShell.jsx**: layout for `/app/*`: left rail (name, role stamp, Client ID, cash, nav, theme toggle, log out), mobile top bar and bottom nav, market open/closed banner, `Tape`. Exports `useApp()`. Redirects to `/login` without a user. Renders `TradeSlip` when `slip` state is set.
- **Landing.jsx** (+`Landing.css`): masthead, how-it-works steps, top/bottom movers from `Stocks.tracked()`, letters section, calls to action.
- **Auth.jsx** (+`Auth.css`): signup/login in one component via prop `mode`; client-side `validate`; role choice USER ("I'm here to learn") or ADVISOR; on success `setUser` then navigate `/app/markets`.
- **Markets.jsx**: debounced (250ms) search, sector filter, pagination (page size 20), "Get price" (quote fetch), watch toggle (target set 5% under last close), Trade button opens slip; shows Alpha Vantage quota and first-run hint when no folios.
- **Book.jsx**: lists folios with value and P&L; create-folio form (name, optional sector; advisors may enter client ID `IM-xxxx`).
- **Portfolio.jsx**: one folio: summary, holdings table with Buy more / Sell buttons, trade history.
- **WatchlistPage.jsx**: watched stocks, editable target price, remove, Trade button, TARGET HIT stamp from `targetReached`.
- **Desk.jsx**: Price Desk: quota meter (budget dots), "run now" button, last runs log with status and trigger labels.
- **TradeSlip.jsx** (+`TradeSlip.css`): the order slip dialog, receipt, tear and file animations. Props: `stock`, `side`, `portfolioId`, `latest`, `cash`, `onClose`, `onDone`. Details in business-logic.md and ui-design.md.
