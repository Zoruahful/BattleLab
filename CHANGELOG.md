# Changelog

## Phase 1.5 Frontend Shell Checkpoint - 2026-06-10

- Added the Theater shell as a frontend-only replay workspace placeholder.
- Added Settings and Catalog Update panels using the shared shell-owned panel host.
- Added local fake settings, catalog status, and editor catalog data for frontend workflows.
- Improved Team Builder editor handoff and clear-slot affordances without adding persistence.
- Added Pokemon Showdown-style team import/export, local round-trip import, and copy fallback behavior.
- Refined Team Builder slot cards with display-only type badges and compact build metadata.
- Expanded the Theater shell with a sample replay library, local search, and static preview states.
- Clarified frontend-only safety states for session saves, disabled loading, confirmed team clearing, Showdown legality notes, and sample replay cards.
- Refined the safety pass with visible `Soon` badges, clearer session-clear copy, and danger styling for confirmed team clearing.
- Updated sidebar active-state behavior so Settings and Catalog Update own the active highlight only while their panels are open.

## Frontend Milestone 1 - 2026-06-10

- Added the initial Vite, React, and TypeScript frontend app under `app/`.
- Added the desktop-style BattleLab shell with sidebar navigation, header actions, right-side panel host, scrim, and main-content blur.
- Added the Team Builder rough draft with six slots, compact Pokemon cards, fake team data, and a Pokemon editor panel.
- Added the guided simulation settings panel launched from the Team Builder header action.
- Added report history and report detail overview screens using fake local data.
- Added matching fake detail fixtures so every report history card opens an overview detail screen.
- Replaced scaffold documentation with BattleLab-specific setup, status, validation, and product notes.
- Updated ignore rules for local-only coordination files, mockup references, dependencies, build output, generated reports, caches, and local databases.
