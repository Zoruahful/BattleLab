# BattleLab

![BattleLab banner](assets/readme-banner.svg)

Local-first competitive Pokemon team builder and battle simulator built for fast testing, clean reports, and polished desktop workflows.

![Focus](https://img.shields.io/badge/Focus-Competitive%20Team%20Building-18181B?style=flat-square&labelColor=27272A&color=A3E635)
![Status](https://img.shields.io/badge/Status-Frontend%20Checkpoint-18181B?style=flat-square&labelColor=27272A&color=A3E635)
![Platform](https://img.shields.io/badge/Platform-Windows-18181B?style=flat-square&logo=windows&logoColor=A3E635&labelColor=27272A)
![Local First](https://img.shields.io/badge/Mode-Local%20First-18181B?style=flat-square&labelColor=27272A&color=A3E635)

## About

BattleLab is a standalone desktop app concept for building competitive Pokemon teams, running local battle simulations, and reviewing readable matchup reports without a hosted account or VPS.

- Designed around responsive, interactive, and polished UI.
- Focused first on the Battle Simulator and report experience.
- Built to keep team testing local to the user's machine.
- Planned around clear data contracts before backend simulation wiring.
- Inspired by clean report UX, visual feedback, and practical competitive analysis.

## Current Focus

The first milestone is a frontend-only rough draft using mock data. The current checkpoint includes the core UI shell and fake-data workflows; Reports still need matching detail fixtures for every history card before the milestone is considered accepted.

| Area | Goal |
| --- | --- |
| App Shell | Create the main desktop-style layout, sidebar, and status footer. |
| Team Builder | Build six editable Pokemon slots with filled and empty states. |
| Editor Panel | Add the right-side Pokemon editing panel with moves, ability, item, nature, and stats. |
| Reports | Show saved simulation history with filters and report detail navigation. |
| Overview Report | Recreate the Champion-style overview with win rate, archetype bars, weaknesses, and strategy tips. |

## Current Checkpoint

- Frontend app scaffolded under `app/` with React, TypeScript, and Vite.
- Desktop-style shell, sidebar navigation, header actions, shared panel host, scrim, and blur behavior are in place.
- Team Builder, Pokemon editor panel, guided simulation settings panel, Reports list, and Report Detail Overview render from local fake data.
- Simulation, persistence, Electron packaging, PDF export, and catalog sync are intentionally not wired yet.

## Planned Features

- Six-Pokemon team builder
- Pokemon Showdown-style team import/export
- Champion-format simulation reports
- Local report history
- Animated matchup graphs
- Threat, lead, core, and coverage views
- Defensive coverage matrix
- Local PDF report export
- PC performance profiles
- Future EV optimizer mode

## Tech Stack

**Core App**  
![React](https://img.shields.io/badge/React-18181B?style=flat-square&logo=react&logoColor=A3E635&labelColor=27272A)
![TypeScript](https://img.shields.io/badge/TypeScript-18181B?style=flat-square&logo=typescript&logoColor=A3E635&labelColor=27272A)
![Vite](https://img.shields.io/badge/Vite-18181B?style=flat-square&logo=vite&logoColor=A3E635&labelColor=27272A)
![Electron](https://img.shields.io/badge/Electron-18181B?style=flat-square&logo=electron&logoColor=A3E635&labelColor=27272A)

**Local Data & Runtime**  
![SQLite](https://img.shields.io/badge/SQLite-18181B?style=flat-square&logo=sqlite&logoColor=A3E635&labelColor=27272A)
![Node.js](https://img.shields.io/badge/Node.js-18181B?style=flat-square&logo=nodedotjs&logoColor=A3E635&labelColor=27272A)
![Python](https://img.shields.io/badge/Python-18181B?style=flat-square&logo=python&logoColor=A3E635&labelColor=27272A)

**Tools**  
![Git](https://img.shields.io/badge/Git-18181B?style=flat-square&logo=git&logoColor=A3E635&labelColor=27272A)
![GitHub](https://img.shields.io/badge/GitHub-18181B?style=flat-square&logo=github&logoColor=A3E635&labelColor=27272A)
![Playwright](https://img.shields.io/badge/Playwright-18181B?style=flat-square&logo=playwright&logoColor=A3E635&labelColor=27272A)

## Roadmap

| Phase | Goal | Status |
| --- | --- | --- |
| Phase 0 | Project structure and planning | Complete |
| Phase 1 | Frontend rough draft | In progress |
| Phase 2 | TypeScript data contracts | Planned |
| Phase 3 | Local simulation proof | Planned |
| Phase 4 | Desktop wrapper | Planned |
| Phase 5 | Report export | Planned |

## Project Direction

BattleLab starts with the interface first, then moves into simulation wiring after the report shape and local app workflow are stable.

The intended long-term flow:

```text
Build team -> choose settings -> run simulation -> review report -> export paper report
```

## Disclaimer

BattleLab is an unofficial fan-made tool. This project is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, Game Freak, The Pokemon Company, or Pokemon Showdown.

Pokemon names, move names, item names, and related intellectual property belong to their respective owners.
