# BattleLab

BattleLab is a local-first React + TypeScript GUI application that demonstrates typed application architecture, structured data contracts, import/export workflows, browser-local persistence, report rendering, validation, documentation, Git/GitHub source control, and maintainable frontend development. The domain context is competitive Pokemon team analysis, but the engineering focus is application design, data workflow reliability, defensive UI behavior, and a practical roadmap toward durable local persistence and SQL-backed reporting.

- **Status:** Active development; frontend GUI + Catalog/Pokemon Showdown Engine foundation
- **Platform:** Browser/Vite today; desktop packaging planned/in progress
- **Tech Stack:** React, TypeScript, Vite, JavaScript, HTML, CSS, npm
- **Focus:** GUI application development, typed data models, local-first workflows, validation, documentation
- **Persistence:** Browser `localStorage` + IndexedDB cache boundaries; SQLite is not implemented yet
- **Testing:** ESLint + TypeScript/Vite build validation; automated tests planned

![BattleLab banner](assets/readme-banner.svg)

## Engineering Highlights

- **Application design and development:** Built a multi-screen GUI application with a desktop-style shell, navigation, shared panel host, typed state, and feature-specific React components.
- **GUI workflow implementation:** Implemented Team Builder, Pokemon Editor, guided setup, Reports, Theater preview, Settings, and Catalog Update workflows with responsive interaction patterns.
- **Typed data models / data contracts:** Defined TypeScript interfaces for teams, Pokemon entries, simulation settings, reports, catalog records, storage boundaries, and Pokemon Showdown legality read models.
- **Local persistence and data workflows:** Implemented browser-local saved-team persistence with schema/version validation and IndexedDB-backed catalog/engine cache boundaries for update workflows.
- **Testing, validation, and debugging:** Current quality checks use ESLint, TypeScript build validation, Vite production builds, validation helper modules, defensive parsing, and manual workflow QA.
- **Documentation and maintainability:** Maintains public documentation that separates completed work from planned work and documents architecture, validation, and product boundaries.

## Relevant Engineering Skills Demonstrated

React, TypeScript, Vite, JavaScript, HTML, CSS, npm, Node.js tooling, Git, GitHub, GUI application development, local-first application design, data validation, import/export workflows, report views, debugging, documentation, source control, IndexedDB, browser `localStorage`, typed data contracts, modular frontend architecture, Pokemon Showdown package integration.

### Planned / In Progress

SQLite, SQL, relational database concepts, SQL-backed reporting, unit testing, Playwright, Electron desktop packaging, PDF report export, real simulation runtime, replay decoding/sharing.

## Software Engineering Role Alignment

| Software Engineering Requirement | BattleLab Evidence | Status |
| --- | --- | --- |
| GUI application development | React + TypeScript desktop-style app shell, panels, screens, forms, dialogs, filters, report tabs, and interactive editors. | Demonstrated |
| SQL queries and reports | Current reports render from typed mock data. SQL report queries are planned after SQLite persistence is added. | Planned |
| Relational database concepts | SQLite schema design is on the roadmap for teams, Pokemon entries, reports, settings, and catalog cache data. | Planned |
| Debugging and defect resolution | Defensive parsing, invalid saved-team handling, explicit runtime-unavailable fallbacks, and validation helper modules support troubleshooting. | Partially Demonstrated |
| Testing and validation | `npm run lint` and `npm run build` validate the current app; validation helpers exist, but automated unit/E2E tests are not configured yet. | Partially Demonstrated |
| Source control | Public repository is structured for Git/GitHub review, with tracked app source and local-only workflow artifacts kept out of public docs. | Demonstrated |
| Documentation | README, app README, changelog, and code-level contracts document current behavior, boundaries, and roadmap. | Demonstrated |
| Technical design | Typed domain contracts and modular data services separate UI state, catalog data, Showdown legality, storage boundaries, and report views. | Demonstrated |
| Maintaining existing systems | The project has iterative feature lanes and validation checks; formal trouble-ticket workflow is local and not public-facing yet. | Partially Demonstrated |
| Code review readiness | Source is organized into feature directories with lint/build gates; unit tests and PR templates would strengthen review readiness. | Partially Demonstrated |
| Object-oriented programming / typed software design | The codebase uses TypeScript interfaces, union types, typed read models, service-style modules, and component contracts rather than Java/C# classes. | Partially Demonstrated |

## Architecture Overview

BattleLab is organized as a Vite frontend application under [`app/`](app/) with a React shell in [`app/src/App.tsx`](app/src/App.tsx). The app uses main screens, right-side panels, shared components, typed data modules, and feature-level CSS to keep GUI workflows separated and maintainable.

- **Frontend application shell:** Sidebar navigation, header actions, shared panel host, modal overlays, selected report routing, and active team/session state live in the app shell.
- **Screens / panels / components:** Team Builder, Reports, Theater, Pokemon Editor, Simulation Settings, Catalog Update, and Settings are separated into [`screens`](app/src/screens/), [`panels`](app/src/panels/), and [`components`](app/src/components/).
- **Domain types and data contracts:** Core contracts live in [`app/src/types/index.ts`](app/src/types/index.ts), with catalog, runtime, storage, report, and Pokemon Showdown contracts split into feature-specific type files.
- **Persistence and cache boundaries:** Saved teams use `localStorage` with schema/version checks. Catalog and Engine cache boundaries use IndexedDB-oriented services such as [`app/src/data/catalogUpdateCache.ts`](app/src/data/catalogUpdateCache.ts) and [`app/src/data/catalogStorageBoundary.ts`](app/src/data/catalogStorageBoundary.ts).
- **Import/export logic:** [`app/src/utils/showdownTeam.ts`](app/src/utils/showdownTeam.ts) parses and exports Pokemon Showdown-style team text while keeping the current team contract intact.
- **Report rendering:** [`ReportsListView`](app/src/screens/ReportsListView.tsx) and [`ReportDetailOverviewView`](app/src/screens/ReportDetailOverviewView.tsx) render sortable/filterable report history and tabbed report details from typed report data.
- **Settings/session behavior:** [`SettingsPanel`](app/src/panels/SettingsPanel.tsx) manages session preferences and clearly labels durable settings as future work.
- **Validation and defensive UI behavior:** Save/load validation, clear confirmations, budget-aware stat editing, runtime-unavailable fallbacks, and explicit Catalog/Engine update boundaries reduce accidental destructive behavior.

## Data and Persistence

SQLite is not implemented yet. There are no schema files, SQL migrations, relational tables, `SELECT` statements, joins, database query tools, or SQL reports in the current repository.

Current persistence is browser-local:

- **Saved teams:** [`App.tsx`](app/src/App.tsx) stores the current team in `localStorage` using a versioned `battlelab.savedTeam` payload, validates loaded data, migrates older saved-team payloads, and rejects invalid saved data without overwriting the active team.
- **Catalog update cache:** [`catalogUpdateCache.ts`](app/src/data/catalogUpdateCache.ts) defines IndexedDB stores for section metadata, section payloads, generated catalog data, and Pokemon Showdown Engine metadata/payload cache entries.
- **Catalog storage boundary:** [`catalogStorageBoundary.ts`](app/src/data/catalogStorageBoundary.ts) documents the current browser IndexedDB adapter and explicitly marks packaged local storage, SQLite, Electron, filesystem writes, report storage, settings storage, and simulation output storage as not implemented.
- **Reports:** Current report views render from typed mock report data. They demonstrate report UI, sorting, filtering, and detail tabs, not durable report persistence.

### SQLite Persistence Roadmap

The planned SQLite layer should add durable local storage without changing the current GUI workflows. Proposed tables:

- `teams`: saved team metadata, format, created/updated timestamps.
- `pokemon_entries`: team slot data, species, ability, item, moves, EVs/IVs, notes, and catalog references.
- `simulation_reports`: generated report metadata, summary fields, status, settings snapshot, and report payload.
- `settings`: user preferences, default format, performance profile, editor mode, and diagnostics flags.
- `catalog_cache`: catalog source signatures, generated catalog versions, section metadata, and cache freshness.

Planned SQL reports:

- Saved teams by updated date, format, and slot completion.
- Report history by win rate, battle count, opponent pool, and generated date.
- Filtered matchup reports by type coverage, threat severity, and format.
- Catalog lookup by Pokemon, move, ability, item, and source signature.
- Settings retrieval for startup defaults and workspace preferences.

## Testing, Debugging, and Quality

Current validation commands:

```bash
cd app
npm run lint
npm run build
```

Automated unit tests are a planned improvement. Current quality checks focus on TypeScript build validation, linting, manual workflow testing, and defensive UI validation.

Manual QA checklist:

- Team Builder import/export
- Save/load validation
- Clear confirmation
- Guided simulation setup
- Report view rendering
- Settings behavior
- Responsive layout checks
- Invalid input handling

Current defensive behavior includes invalid saved-team rejection, confirmation before clearing teams, clamped numeric inputs in simulation/stat controls, runtime-unavailable fallbacks for Pokemon Showdown legality, and explicit no-simulation/no-hidden-execution boundaries in Catalog Update and Engine update flows.

## Key Features

| Feature | Engineering Value |
| --- | --- |
| Team Builder | Demonstrates stateful GUI editing, six-slot data modeling, typed team contracts, Showdown-style import/export, save/load validation, clear confirmation, and format-aware legality entry points. |
| Pokemon Editor | Demonstrates complex form state, searchable comboboxes, typed catalog references, rich-text notes, stat calculations, budget warnings, and defensive editor behavior. |
| Guided Simulation Setup | Demonstrates structured configuration forms, clamped numeric inputs, opponent pool selection, performance profile selection, and local session handoff without running a backend simulation. |
| Reports Dashboard | Demonstrates report list rendering, filtering, sorting, summary metrics, tabbed detail views, and typed report contracts using mock data. |
| Theater / Replay Preview | Demonstrates sample replay browsing, faux playback state, scrubber interactions, archive search, and keyboard handling using fabricated battle data. Real replay decoding is planned. |
| Settings | Demonstrates session-scoped preferences, form state management, default format/profile handling, and clear labels for durable settings that are not implemented yet. |
| Catalog Update Boundaries | Demonstrates explicit user-triggered update flows, IndexedDB cache boundaries, PokeAPI enrichment separation, Pokemon Showdown Engine readiness work, and safety constraints around storage/execution. |

## Project Roadmap

### Completed

- React + TypeScript frontend shell with desktop-style navigation and panel workflows.
- Team Builder with import/export, local clear, browser-local saved-team persistence, and validation.
- Pokemon Editor with catalog-backed picker projections, rich notes, stat editing, and defensive budget behavior.
- Reports list/detail views using typed mock report data.
- Theater preview using fabricated sample replay data.
- Settings session behavior.
- Typed data contracts for teams, Pokemon entries, settings, reports, catalog data, storage boundaries, and Showdown legality.
- ESLint and TypeScript/Vite build validation.

### In Progress

- Catalog Update workflow and browser IndexedDB cache behavior.
- Pokemon Showdown Engine update foundation.
- Format-aware legality boundaries for Team Builder and Pokemon Editor.
- Separation of catalog enrichment data from Pokemon Showdown legality authority.

### Planned

- SQLite durable local persistence.
- SQL-backed reporting with `SELECT`, filtering, joins, and query-based report views.
- Unit tests.
- Playwright end-to-end tests.
- Electron desktop packaging.
- PDF report export.
- Real simulation runtime.
- Catalog sync hardening.
- Replay decoding and sharing.

## How to Run Locally

Install dependencies:

```bash
cd app
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

There is currently no `npm test` script.

## Resume Bullet Version

- Built BattleLab, a React + TypeScript local-first GUI application with typed data contracts, import/export workflows, report views, browser-local saved-team persistence, and defensive validation.
- Implemented modular frontend workflows for Team Builder, Pokemon Editor, guided setup, Reports, Theater preview, Settings, and Catalog Update boundaries using Vite, TypeScript, HTML, CSS, and npm tooling.
- Maintained clear technical documentation and build/lint validation while planning SQLite persistence, SQL-backed reporting, unit tests, Playwright coverage, and Electron desktop packaging.

## Disclaimer

BattleLab is an unofficial fan-made tool. This project is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, Game Freak, The Pokemon Company, or Pokemon Showdown.

Pokemon names, move names, item names, and related intellectual property belong to their respective owners.
