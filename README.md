# BattleLab

![BattleLab banner](assets/readme-banner.svg)

Local-first competitive Pokemon team builder and battle simulator built for fast testing, clean reports, and polished desktop workflows.

![Focus](https://img.shields.io/badge/Focus-Competitive%20Team%20Building-18181B?style=flat-square&labelColor=27272A&color=A3E635)
![Status](https://img.shields.io/badge/Status-Pre--Simulation%20Frontend%20Shell-18181B?style=flat-square&labelColor=27272A&color=A3E635)
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

The current build is a frontend-only pre-simulation shell using mock data and local session state. BattleLab now has a coherent desktop-style workflow for Team Builder, Pokemon editing, guided simulation setup, report review, Theater previews, Settings, and Catalog Update boundaries before runtime or persistence work begins.

| Area | Goal |
| --- | --- |
| App Shell | Desktop-style layout, sidebar navigation, shared right-side panels, scrim, and blurred main view. |
| Team Builder | Six editable Pokemon slots with local clear, import/export, and guided simulation entry. |
| Pokemon Editor | Fake catalog editing with combobox metadata, Gym allocation table, StatRadar, and budget-aware EV/SP controls. |
| Reports | Saved simulation history plus Overview, Threats, Leads, Cores, and Coverage detail tabs on mock data. |
| Theater | Sample-only replay archive browser and faux local player built on fabricated battle data. |
| Catalog Update | Fake local catalog readiness preview while keeping Pokemon Showdown as the future legality source of truth. |
| Settings | Session-only settings panel; durable persistence and deeper app-wide behavior are planned. |

## Current Checkpoint

- Frontend app scaffolded under `app/` with React, TypeScript, and Vite.
- Desktop-style shell, sidebar navigation, header actions, shared panel host, scrim, and blur behavior are in place.
- Team Builder supports local editing, clearing, Pokemon Showdown-style import/export, session save feedback, and guided simulation settings.
- Pokemon Editor includes frontend-only fake catalog pickers, metadata-rich comboboxes, Gym allocation controls, StatRadar, and defensive budget warnings.
- Reports list/detail and all current report detail tabs render from mock data.
- Theater remains a sample-only replay workspace with fabricated playback data.
- Phase 2 TypeScript data contracts are stable enough for the current Team Builder, Editor, Reports, Catalog Update, and pre-runtime flows.
- Clear frontend boundaries are visible for disabled loading, local-only saves, sample replay previews, catalog data, and Showdown legality.
- Simulation, persistence, Electron packaging, PDF export, live catalog sync, and real replay decoding/sharing are intentionally not wired yet; Theater plays fabricated sample data only.

## Planned Work

- Apply Settings preferences across more of the frontend shell.
- Plan local catalog update architecture and cache boundaries.
- Wire a local simulation runtime after the pre-runtime frontend remains stable.
- Add durable local persistence for teams, settings, catalog data, and reports.
- Local PDF report export
- Desktop packaging with Electron
- Future EV optimizer mode

## Tech Stack

**In use now**
![React](https://img.shields.io/badge/React-18181B?style=flat-square&logo=react&logoColor=A3E635&labelColor=27272A)
![TypeScript](https://img.shields.io/badge/TypeScript-18181B?style=flat-square&logo=typescript&logoColor=A3E635&labelColor=27272A)
![Vite](https://img.shields.io/badge/Vite-18181B?style=flat-square&logo=vite&logoColor=A3E635&labelColor=27272A)

**Tools**  
![Git](https://img.shields.io/badge/Git-18181B?style=flat-square&logo=git&logoColor=A3E635&labelColor=27272A)
![GitHub](https://img.shields.io/badge/GitHub-18181B?style=flat-square&logo=github&logoColor=A3E635&labelColor=27272A)

**Planned**
![Electron](https://img.shields.io/badge/Electron-18181B?style=flat-square&logo=electron&logoColor=A3E635&labelColor=27272A)
![SQLite](https://img.shields.io/badge/SQLite-18181B?style=flat-square&logo=sqlite&logoColor=A3E635&labelColor=27272A)
![Node.js](https://img.shields.io/badge/Node.js-18181B?style=flat-square&logo=nodedotjs&logoColor=A3E635&labelColor=27272A)
![Python](https://img.shields.io/badge/Python-18181B?style=flat-square&logo=python&logoColor=A3E635&labelColor=27272A)
![Playwright](https://img.shields.io/badge/Playwright-18181B?style=flat-square&logo=playwright&logoColor=A3E635&labelColor=27272A)

## Roadmap

| Phase | Goal | Status |
| --- | --- | --- |
| Phase 0 | Project structure and planning | Complete |
| Phase 1 | Frontend rough draft | Complete |
| Phase 1.5 | Pre-simulation frontend shell | Complete |
| Phase 2 | Stable frontend data contracts | Complete |
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
