# Frontend UI design

**Source:** Claude Design export in `InvestMitra/design-export` (`InvestMitra.dc.html`, `InvestMitra States.dc.html`, `support.js`, `image-slot.js`). Personality: a financial **newspaper** ("newsprint"). Later refined with the `design-taste-frontend` skill (redesign-preserve mode): less intimidating, plainer labels, glossary and tooltips, receipt/tear/shake slip animations.

## Tokens (`styles/tokens.css`)
| Token | Newsprint (light) | Ink (dark) |
|---|---|---|
| `--paper` | #F5EDE0 | #2A0530 |
| `--paper2` | #EDE2CF | #360B3D |
| `--ink` | #46014A (purple) | #F5EDE0 |
| `--ink2` | #5B2F5E | #D8C5D4 |
| `--accent` (marigold) | #E8A317 | #E8A317 |
| `--on-accent` | #2A0530 | same |
| `--gain` / `--loss` | #0A6634 / #A12E1A | #72D89E / #FF907A |
| `--rule`, `--hover`, `--scrim` | ink at low alpha | paper at low alpha |

Fonts: `--display` **Rozha One** (headlines, masthead), `--serif` **Source Serif 4** (body, 17px/1.55), `--mono` **IBM Plex Mono** (numbers, labels, kickers). Loaded from Google Fonts via `@import`. Body has an SVG paper-grain background.

## Themes
Light = "Newsprint edition", dark = "Ink edition". `ThemeProvider` sets `data-theme` on `<html>`, remembered in `localStorage['investmitra.theme']`; defaults to `prefers-color-scheme`. CSS handles both the media query (when no explicit light choice) and `[data-theme="dark"]`. Toggle labels: rail button "Ink edition"/"Newsprint edition", mobile "INK"/"NEWS".

## Motifs and shared classes (`styles/components.css`)
- **Stamp**: bordered rubber-stamp label, mono caps, slight rotation (`--r`). Variants loss, gain, filled, sm, lg, slam. Used for roles, sectors, STALE, TARGET HIT, BOUGHT/SOLD.
- **Tape**: ticker tape under the banner; label "CLOSE · 9 OCT"; 80s linear loop, pauses on hover; stale items say "stale, <date>".
- **Shimmer**: loading state is a tape crawl ("FETCHING THE WIRE") over shimmering ledger rows, never a spinner.
- **StateBlock**: empty/error states written in the paper's voice.
- **Ledger tables** (`.ledger`, `.table-wrap`): ruled tables; secondary columns hide under 720px.
- **Field**: underlined inputs like a printed form (`.field`); **Segmented** toggle (`.segmented`); buttons `.btn`, `--ink`, `--on`, `--primary` (hard offset shadow), `--stamp`, `--link`.
- `.kicker` small-caps section label, `.double-rule` masthead rule, `.page-head`, `.section-head`, `.mono`, `.display`, `.muted`, `.gain`, `.loss`, `.flat`.
- **Beginner help**: `.hint` first-run box, `Term` dotted-underline tooltips, `Glossary` details block.
- **Toast**: bottom centre, ink background; lifts above the bottom nav under 880px.

## Layout
`.shell` is a full-height flex: left **rail** (264px: brand, date, user, Client ID, cash, nav numbered 01-04, theme/logout) on desktop; below 880px it becomes a top bar plus **bottom nav**. Content max width 1180px. Market banner and Tape sit above content.

## Order slip and receipt (`TradeSlip.jsx`, `TradeSlip.css`)
- **Slip:** card with dashed header, ticker in mono, sector stamp, Buy/Sell segmented control, folio select, quantity stepper, totals block, "Tear up slip" and stamped submit button.
- **Shake** (`im-shake`, 0.42s): on invalid submit or server error.
- **Tear** (`im-tear-a`/`im-tear-b`, 0.72s): slip is rendered twice, clipped along a jagged polygon (`TEAR`), halves fall apart, scrim fades (`im-scrim-out`).
- **Receipt print** (`im-print`, 2s, `steps(22)`): thermal receipt with zigzag `clip-path` edges, emerges from a printer slot (LED blink `im-led`, chug `im-chug`). Content: brand, "Paper trades, real feelings.", date, slip no. `IM-000123`, folio, stock, quantity, price, total, realised P&L, cash left, footer "This receipt is worth exactly ₹0.00."
- **After printing:** `im-thump` (buy/win/flat) or `im-ouch` (loss) on the paper; a rubber **BOUGHT/SOLD stamp** slams (`im-thump-stamp`); on a winning sell a coin and 8 confetti pieces burst (`im-coin`, `im-confetti`).
- **Filing:** receipt shrinks into a "Filed" tray (`im-file`, `im-tray-in`, 0.7s), scrim fades, dialog closes.
- Global keyframes in `tokens.css`: `im-tape`, `im-shim`, `im-stamp`.
- **Reduced motion:** `tokens.css` sets animation and transition durations to 0 under `prefers-reduced-motion`; the slip JS also skips timed phases.

## Voice and copy
Newspaper metaphors ("the wire", "Dalal Street is asleep", "folio", "Price Desk"), mildly humorous error text. Plainer labels were added for learners (Glossary: Folio, Last close, Avg buy, Unrealised, Realised). Landing "Letters to the Editor" keeps the original parody testimonials from Erlich Bachman, Gavin Belson and Russ Hanneman (`content/letters.js`).

## Accessibility notes
Colour is always paired with a sign and arrow; dialog has `role="dialog"`, `aria-modal`; errors use `role="alert"`; receipt has an `sr-only` status; `:focus-visible` outline in accent; tooltips focusable.
