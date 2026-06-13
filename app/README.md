# BattleLab Frontend

BattleLab's frontend is a Vite, React, and TypeScript application for the local-first desktop product experience.

This package implements the accepted pre-runtime frontend shell: the desktop shell, Team Builder, Pokemon Editor, guided Simulation Settings, Reports list/detail tabs, Theater preview workspace, Settings, and Catalog Update panels.

## Status

This is an accepted frontend-only pre-simulation shell. The app uses local mock data, fabricated sample reports/replays, and browser session state only.

Implemented now:

- Desktop-style shell navigation and shared right-side panel host
- Team Builder with six slots, local clear, Pokemon Showdown-style import/export, and versioned browser-local save/load
- Pokemon Editor with fake catalog controls, rich-text notes, Gym allocation controls, StatRadar, and budget-aware EV/SP editing
- Guided Simulation Settings panel that stores settings in frontend state only
- Reports list and report detail tabs for Overview, Threats, Leads, Cores, and Coverage on mock data
- Theater sample replay library and faux player built on fabricated battle data
- Settings and Catalog Update panels with clear pre-runtime/session-only boundaries

Not implemented yet:

- Electron desktop wrapper
- Pokemon Showdown simulation runtime
- Durable local persistence
- PDF export
- Real catalog sync
- Real Theater replay decoding or shared replay codes
- Real sprite or icon source

## Getting Started

Install dependencies from this folder:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Project Structure

```text
src/
  components/   Shared UI components
  data/         Local fake data used by the current UI checkpoint
  panels/       Right-side shell panels
  screens/      Main shell screens
  styles/       Feature-level CSS files
  types/        TypeScript UI and catalog contracts
```

## Current UI Flow

```text
Team Builder -> Pokemon Editor Panel
Team Builder -> Guided Simulation Settings Panel
Reports -> Report Detail Tabs -> Back to Reports
Theater -> Sample Replay Archive
Settings -> Session Preferences
Catalog Update -> Local Catalog Preview
```

The guided simulation settings panel confirms settings in local UI state only. It does not run a backend simulation.

## Validation

Before merging frontend changes, run:

```bash
npm run build
npm run lint
```

## Product Notes

BattleLab is designed as a local-first competitive Pokemon team-building and battle-simulation tool. Pokemon Showdown is planned as the future battle simulation and legality source of truth. Catalog or enrichment APIs, if added later, should not be treated as battle legality authorities.

BattleLab is an unofficial fan-made tool and is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, Game Freak, The Pokemon Company, or Pokemon Showdown.
