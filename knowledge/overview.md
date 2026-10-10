# Frontend overview

**Purpose:** Browser UI for InvestMitra: landing page, sign up and login, markets search, order slip, folios (portfolios), watchlist, and the Price Desk (admin view of the Alpha Vantage job and quota).

**Repo:** `investmitra-frontend` | **Port:** 3000 | **API:** `http://localhost:8080/api` (override with `REACT_APP_API_URL`)

## Stack
React 18 (Create React App, `react-scripts` 5.0.1), react-router-dom v6, axios, plain CSS (no CSS framework in use), Google Fonts loaded via `@import` in `styles/tokens.css`. JavaScript only (no TypeScript). Design source: Claude Design export in `InvestMitra/design-export` (see ui-design.md).

## Structure (`src/`)
| Path | Contents |
|---|---|
| `index.js`, `App.js` | Mount, providers (`ThemeProvider`, `ToastProvider`), routes |
| `api/client.js`, `api/session.js` | axios instance and per-resource API objects; localStorage user session |
| `lib/market.js`, `lib/useRemote.js` | IST market clock helpers; data-loading hook |
| `format.js` | Rupee, percent, date formatting (Indian grouping) |
| `content/letters.js` | Landing "Letters to the Editor" (parody testimonials) |
| `ui/` | Reusable components: Stamp, Tape, Shimmer, StateBlock, Field, Toast, Theme, Term, Glossary |
| `pages/` | Landing, Auth, AppShell (layout + context), Markets, Book, Portfolio, WatchlistPage, Desk, TradeSlip |
| `styles/` | `tokens.css` (design tokens, base, keyframes), `components.css` (shared classes) |
| `pages/*.css` | Per-page styles (`AppShell.css`, `Auth.css`, `Landing.css`, `TradeSlip.css`, `pages.css`) |

## Routes
`/` Landing, `/signup` and `/login` Auth, `/app` AppShell with children: `markets` (default), `book`, `book/:id`, `watchlist`, `desk`. Unknown paths redirect to `/`. `AppShell` redirects to `/login` when no stored user.

## Build / run / test
```
npm install
npm start        # dev server :3000
npm run build    # production bundle in build/
npm test         # CRA jest; there are NO tests yet
```
Needs the backend running for any data. Unused dependencies still in `package.json`: bootstrap, react-bootstrap, gsap, scrolltrigger (see open-issues.md).
