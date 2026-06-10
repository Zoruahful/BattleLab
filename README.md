# BattleLab

> Local-first competitive Pokemon team builder and battle simulator.

![Status](https://img.shields.io/badge/status-planning-4A7C7E?style=for-the-badge)
![React](https://img.shields.io/badge/react-planned-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/typescript-planned-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-planned-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Windows](https://img.shields.io/badge/windows-target-0078D4?style=for-the-badge&logo=windows&logoColor=white)

## About

BattleLab is being designed as a standalone Windows app for building competitive Pokemon teams, running local battle simulations, and reviewing polished reports without needing a hosted account or VPS.

The first version is focused on the Battle Simulator experience:

- Build and edit a six-Pokemon team.
- Run local simulations.
- Review report history.
- Open detailed ChampionLab-style reports.
- Export clean paper reports in a future milestone.

## Current Focus

The project is currently in the rough-draft stage.

The first milestone is a frontend-only mock app using fake data:

- Main app shell
- Team Builder
- Pokemon editor side panel
- Reports history
- Report detail overview

Simulation backend wiring comes after the UI and data contracts are stable.

## Planned Features

- Local team builder
- Pokemon Showdown-style export support
- Champion-format simulation reports
- Report history stored locally
- Animated report graphs and matchup breakdowns
- Defensive coverage matrix
- Local PDF report export
- Performance profiles for different PCs
- Future EV optimizer mode

## Tech Stack

Planned stack:

| Area | Tool |
| --- | --- |
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Desktop App | Electron |
| Local Data | SQLite |
| Simulation Source | Pokemon Showdown |
| Reports | Playwright / Chromium PDF |

## Roadmap

| Phase | Goal | Status |
| --- | --- | --- |
| Phase 0 | Project structure and planning | In progress |
| Phase 1 | Frontend rough draft | Pending |
| Phase 2 | TypeScript data contracts | Pending |
| Phase 3 | Local simulation proof | Pending |
| Phase 4 | Desktop wrapper | Pending |
| Phase 5 | Report export | Pending |

## Disclaimer

BattleLab is an unofficial fan-made tool. This project is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, Game Freak, The Pokemon Company, or Pokemon Showdown.

Pokemon names, move names, item names, and related intellectual property belong to their respective owners.

