# Changelog

## Frontend Shell Polish Checkpoint - 2026-06-13

- Hardened browser-local Team Builder save/load with a versioned payload, shape validation, legacy payload migration, and confirmation before replacing the active team.
- Wired session Settings into the frontend shell for theme handling, animation preference, Pokemon Editor stat mode defaults, and guided Simulation Settings defaults.
- Polished Settings, Catalog Update, and Theater copy while keeping all three clearly frontend-only and pre-runtime.
- Cleaned shared panel classes and close controls across Settings, Catalog Update, and shell fallback dialogs.
- Preserved local-only boundaries: no backend simulation, durable persistence, live catalog sync, Electron wrapper, PDF export, or real Theater decoding is wired yet.

## Frontend Polish and Contract Checkpoints - 2026-06-12

- Stabilized frontend TypeScript data contracts for team builds, fixed move slots, report history projections, report tab data, and catalog update status/progress boundaries.
- Added active report detail tabs for Overview, Threats, Leads, Cores, and Coverage using local mock data.
- Refined the Pokemon Editor with metadata-rich comboboxes, budget-aware allocation controls, stat color ramps, wider panel layouts, and a Gym section with StatRadar.
- Kept Pokemon Editor catalog, radar, and stat workflows frontend-only on fabricated/local data.
- Aligned report surfaces and right-side workspace panels with the shared app shell layout.
- Preserved clear pre-runtime boundaries: no backend simulation, persistence, live sync, PDF generation, Electron wrapper, or real replay decoding is wired yet.

## Phase 1.5 Frontend Shell Checkpoint - 2026-06-10

- Added the Theater shell as a frontend-only replay workspace placeholder.
- Added Settings and Catalog Update panels using the shared shell-owned panel host.
- Added local fake settings, catalog status, and editor catalog data for frontend workflows.
- Improved Team Builder editor integration and clear-slot affordances without adding persistence.
- Added Pokemon Showdown-style team import/export, local round-trip import, and copy fallback behavior.
- Refined Team Builder slot cards with display-only type badges and compact build metadata.
- Expanded the Theater shell with a sample replay library, local search, and static preview states.
- Clarified frontend-only safety states for session saves, disabled loading, confirmed team clearing, Showdown legality notes, and sample replay cards.
- Refined the safety pass with visible `Soon` badges, clearer session-clear copy, and danger styling for confirmed team clearing.
- Updated sidebar active-state behavior so Settings and Catalog Update own the active highlight only while their panels are open.
- Reworked Theater into a sample replay-archive browser with a working local replay player (faux playback, turn-notch scrubber, battle log, and result stats) on fabricated battle data; real replay decoding and shared replay codes remain future work.

## Frontend Milestone 1 - 2026-06-10

- Added the initial Vite, React, and TypeScript frontend app under `app/`.
- Added the desktop-style BattleLab shell with sidebar navigation, header actions, right-side panel host, scrim, and main-content blur.
- Added the Team Builder rough draft with six slots, compact Pokemon cards, fake team data, and a Pokemon editor panel.
- Added the guided simulation settings panel launched from the Team Builder header action.
- Added report history and report detail overview screens using fake local data.
- Added matching fake detail fixtures so every report history card opens an overview detail screen.
- Replaced scaffold documentation with BattleLab-specific setup, status, validation, and product notes.
- Updated ignore rules for internal coordination files, dependencies, build output, generated reports, caches, and local databases.
