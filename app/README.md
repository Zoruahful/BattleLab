# BattleLab Frontend

BattleLab's frontend is a Vite, React, and TypeScript application for the local-first desktop product experience.

This package currently implements the first fake-data UI checkpoint: the desktop shell, Team Builder, Pokemon editor panel, guided simulation settings panel, Reports list, and Report Detail Overview.

## Status

This is a frontend rough draft. The app uses local mock data only.

Not implemented yet:

- Electron desktop wrapper
- Pokemon Showdown simulation runtime
- Durable local persistence
- PDF export
- Real catalog sync
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
Reports -> Report Detail Overview -> Back to Reports
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
