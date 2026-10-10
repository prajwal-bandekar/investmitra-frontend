# Frontend changelog

Newest at the bottom. Append one `## YYYY-MM-DD` section per ingest.

## 2026-10-06
- Project copied and renamed to `investmitra-frontend`.

## 2026-10-08 to 2026-10-09
- Frontend rebuilt from the Claude Design export: tokens, themes, Stamp, Tape, Shimmer, StateBlock, Field, Toast; pages Landing, Auth, AppShell, Markets, Book, Portfolio, WatchlistPage, Desk.
- `api/client.js` against the new backend (`X-User-Id`, envelope unwrapping).
- Refinement with design-taste-frontend: Glossary, Term tooltips, first-run hints, plainer labels.
- `TradeSlip`: validation, shake, printed receipt, tear-up and filing animations, inline "open a folio".

## 2026-10-10
- Knowledge base created; initial `.ingest-state.json` written with sha256 hashes (no git commits).
