# Frontend decisions (ADR log)

Format: date, decision, why, alternatives rejected, status.

## F01 Project rename (2026-10-06)
- **Decision:** Frontend folder is `investmitra-frontend`; old Wells Fargo naming removed.
- **Why:** Part of the project copy and rename (see backend D01).
- **Status:** Done.

## F02 Full redesign from a Claude Design export (2026-10-08)
- **Decision:** Rebuild the UI from the Claude Design export ("newsprint" personality): Rozha One + Source Serif 4 + IBM Plex Mono, purple ink #46014A + marigold #E8A317, stamps, ticker tape, light "Newsprint" and dark "Ink" editions.
- **Why:** Distinctive identity instead of a generic Bootstrap look.
- **Rejected:** Keeping the Bootstrap/GSAP original UI (those dependencies are now unused).
- **Status:** Implemented; not yet visually verified in a browser by the assistant.

## F03 Beginner-friendly refinement via design-taste-frontend (2026-10-09)
- **Decision:** Apply the `design-taste-frontend` skill in redesign-preserve mode: less intimidating, glossary and tooltips, plainer labels, receipt print / tear / shake slip animations.
- **Why:** Target users are students and freshers who may not know trading jargon.
- **Rejected:** A fully new visual direction (preserve the newsprint identity).
- **Status:** Done.

## F04 Keep the parody testimonials (2026-10-09)
- **Decision:** Landing "Letters to the Editor" keep the original parody quotes (Erlich Bachman, Gavin Belson, Russ Hanneman).
- **Why:** User wanted them preserved from the original site.
- **Status:** Done.

## F05 Taste-skill repo review (2026-10-10)
- **Decision:** Leonxlnx/taste-skill was reviewed and judged safe; only `design-taste-frontend` is in use.
- **Rejected:** Installing the other skills from that repo.
- **Status:** Done.

## F06 Plain CSS, context instead of a state library (2026-10-09)
- **Decision:** Plain CSS with tokens; small `useRemote` hook plus a React context (`useApp`) from `AppShell`; session in `localStorage`.
- **Why:** App is small; keeps dependencies minimal.
- **Rejected:** Redux, React Query, CSS framework.
- **Status:** Done.

## F07 Placeholder session (2026-10-08)
- **Decision:** Store the whole user object in `localStorage` and send `X-User-Id`.
- **Why:** Mirrors the backend placeholder auth.
- **Status:** To be replaced when the backend issues tokens.
