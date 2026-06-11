import { useEffect, useMemo, useState } from 'react'
import {
  localBattleLabSettings,
  localSimulationSettings,
  opponentPools,
  performanceProfiles,
  reportHistoryEntries,
  simulationReportsById,
  submittedTeam as initialSubmittedTeam,
} from './data'
import CatalogUpdatePanel from './panels/CatalogUpdatePanel'
import PokemonEditorPanel, { type PokemonEditorDraft } from './panels/PokemonEditorPanel'
import SettingsPanel from './panels/SettingsPanel'
import SimulationSettingsPanel from './panels/SimulationSettingsPanel'
import ReportDetailOverviewView from './screens/ReportDetailOverviewView'
import ReportsListView from './screens/ReportsListView'
import TeamBuilderView from './screens/TeamBuilderView'
import TheaterView from './screens/TheaterView'
import type { BattleLabSettings, ReportHistoryEntry, SimulationSettings, SubmittedTeam } from './types'
import './App.css'

type MainViewId = 'team' | 'reports' | 'theater'
type ActivePanelId = 'editor' | 'simulate' | 'sync' | 'settings' | 'filter' | null

type NavIconName = 'team' | 'reports' | 'theater' | 'catalog' | 'settings'

type NavItem = {
  id: string
  label: string
  icon: NavIconName
  kind: 'view' | 'panel'
  target: MainViewId | NonNullable<ActivePanelId>
}

type ShellPanelState = {
  activeView: MainViewId
  activePanel: ActivePanelId
  editingSlot: number | null
}

const navItems: NavItem[] = [
  { id: 'team', label: 'Team Builder', icon: 'team', kind: 'view', target: 'team' },
  { id: 'reports', label: 'Reports', icon: 'reports', kind: 'view', target: 'reports' },
  { id: 'theater', label: 'Theater', icon: 'theater', kind: 'view', target: 'theater' },
  { id: 'sync', label: 'Catalog Update', icon: 'catalog', kind: 'panel', target: 'sync' },
  { id: 'settings', label: 'Settings', icon: 'settings', kind: 'panel', target: 'settings' },
]

const viewCopy: Record<MainViewId, { title: string; subtitle: string }> = {
  team: {
    title: 'Team Builder',
    subtitle: 'Competitive Pokemon team workspace with local fake data.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Unified simulation history and report overview placeholder.',
  },
  theater: {
    title: 'Theater',
    subtitle: 'Local replay library and future export-code workspace.',
  },
}

function App() {
  const [shellState, setShellState] = useState<ShellPanelState>({
    activeView: 'team',
    activePanel: null,
    editingSlot: null,
  })
  const [simulationSettings, setSimulationSettings] =
    useState<SimulationSettings>(localSimulationSettings)
  const [battleLabSettings, setBattleLabSettings] =
    useState<BattleLabSettings>(localBattleLabSettings)
  const [activeTeam, setActiveTeam] = useState<SubmittedTeam>(initialSubmittedTeam)
  const [teamSaved, setTeamSaved] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const { activeView, activePanel, editingSlot } = shellState
  const panelOpen = activePanel !== null
  const activeItem = useMemo(
    () => navItems.find((item) => item.kind === 'view' && item.target === activeView) ?? navItems[0],
    [activeView],
  )

  const closePanel = () =>
    setShellState((current) => ({
      ...current,
      activePanel: null,
      editingSlot: null,
    }))

  const openPanel = (panel: NonNullable<ActivePanelId>, editingSlotValue: number | null = null) =>
    setShellState((current) => ({
      ...current,
      activePanel: panel,
      editingSlot: editingSlotValue,
    }))

  const setActiveView = (view: MainViewId) =>
    setShellState({
      activeView: view,
      activePanel: null,
      editingSlot: null,
    })

  const handleNav = (item: NavItem) => {
    if (item.kind === 'view') {
      setActiveView(item.target as MainViewId)
      return
    }

    openPanel(item.target as NonNullable<ActivePanelId>)
  }

  const handleSaveTeam = () => {
    setTeamSaved(true)
    window.setTimeout(() => setTeamSaved(false), 1600)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panelOpen) {
        closePanel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panelOpen])

  return (
    <div className="stage">
      <div className="stage-inner">
        <div className="desktop-window">
          <TitleBar activeTitle={activeItem.label} />

          <div className="win-body">
            <Sidebar activeView={activeView} activePanel={activePanel} onNavigate={handleNav} />

            <main className={`main ${panelOpen ? 'is-blurred' : ''}`}>
              <header className="main-header">
                <div>
                  <span className="eyebrow">BattleLab</span>
                  <h1>{viewCopy[activeView].title}</h1>
                  <p>{viewCopy[activeView].subtitle}</p>
                </div>

                <div className="main-actions">
                  {activeView === 'team' ? (
                    <>
                      <button className="secondary-action" type="button" onClick={handleSaveTeam}>
                        {teamSaved ? 'Saved for this session' : 'Save team'}
                      </button>
                      <button
                        className="secondary-action"
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Coming soon: loading saved teams needs local storage."
                      >
                        Load team soon
                      </button>
                      <button className="primary-action" type="button" onClick={() => openPanel('simulate')}>
                        Run simulation
                      </button>
                    </>
                  ) : null}
                </div>
              </header>

              <section className="main-body">
                {renderMainView(
                  activeView,
                  openPanel,
                  selectedReportId,
                  (entry) => setSelectedReportId(entry.reportId),
                  () => setSelectedReportId(null),
                  activeTeam,
                  setActiveTeam,
                )}
              </section>
            </main>

            <button
              className={`scrim ${panelOpen ? 'is-visible' : ''}`}
              type="button"
              aria-label="Close active panel"
              onClick={closePanel}
            />

            <ActivePanelHost
              activePanel={activePanel}
              editingSlot={editingSlot}
              battleLabSettings={battleLabSettings}
              team={activeTeam}
              simulationSettings={simulationSettings}
              onClose={closePanel}
              onBattleLabSettingsChange={setBattleLabSettings}
              onTeamChange={setActiveTeam}
              onSimulationSettingsChange={setSimulationSettings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TitleBar({ activeTitle }: { activeTitle: string }) {
  return (
    <div className="win-titlebar">
      <div className="titlebar-title">
        <span className="titlebar-mark" aria-hidden="true" />
        <span>BattleLab</span>
        <span className="titlebar-team">Sandstorm Hyper Offense / {activeTitle}</span>
      </div>
      <div className="titlebar-controls" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function Sidebar({
  activeView,
  activePanel,
  onNavigate,
}: {
  activeView: MainViewId
  activePanel: ActivePanelId
  onNavigate: (item: NavItem) => void
}) {
  const activePanelHasNavItem = navItems.some(
    (item) => item.kind === 'panel' && item.target === activePanel,
  )

  return (
    <aside className="sidebar" aria-label="BattleLab navigation">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          BL
        </div>
        <div>
          <p className="brand-name">BattleLab</p>
          <p className="brand-subtitle">Local battle simulator</p>
        </div>
      </div>

      <nav className="nav-stack">
        <p className="nav-section">The Lab</p>
        {navItems.map((item) => {
          const isActive = activePanelHasNavItem
            ? item.kind === 'panel' && item.target === activePanel
            : item.kind === 'view' && item.target === activeView

          return (
            <button
              className={`nav-item ${isActive ? 'active' : ''}`}
              key={item.id}
              onClick={() => onNavigate(item)}
              type="button"
            >
              <NavIcon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="team-list" aria-label="Teams placeholder">
        <p className="nav-section">Teams</p>
        <button className="team-list-item active" type="button">
          Sandstorm Hyper Offense
        </button>
        <button className="team-list-item" type="button">
          Rain Balance
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="local-status" role="group" aria-label="Local system status">
          <div className="ls-row">
            <span className="ls-dot ok" aria-hidden="true" />
            <span className="ls-label">System Check</span>
            <span className="ls-value">OK</span>
          </div>
          <div className="ls-row">
            <span className="ls-dot ok" aria-hidden="true" />
            <span className="ls-label">Local Cache</span>
            <span className="ls-value">Ready</span>
          </div>
          <div className="ls-row">
            <span className="ls-dot ok" aria-hidden="true" />
            <span className="ls-label">Performance</span>
            <span className="ls-value">Balanced</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavIcon({ name }: { name: NavIconName }) {
  return (
    <span className="nav-ico" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {name === 'team' ? (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </>
        ) : null}
        {name === 'reports' ? (
          <>
            <path d="M4 4v16h16" />
            <path d="M8 14l3-3 3 2 4-5" />
          </>
        ) : null}
        {name === 'theater' ? (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </>
        ) : null}
        {name === 'catalog' ? (
          <>
            <path d="M20 11a8 8 0 1 0-2.3 6" />
            <path d="M20 4v5h-5" />
          </>
        ) : null}
        {name === 'settings' ? (
          <>
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
            <circle cx="9" cy="6" r="2" />
            <circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="18" r="2" />
          </>
        ) : null}
      </svg>
    </span>
  )
}

function renderMainView(
  activeView: MainViewId,
  openPanel: (panel: NonNullable<ActivePanelId>, editingSlotValue?: number | null) => void,
  selectedReportId: string | null,
  onSelectReport: (entry: ReportHistoryEntry) => void,
  onBackToReports: () => void,
  team: SubmittedTeam,
  onTeamChange: (team: SubmittedTeam) => void,
) {
  if (activeView === 'team') {
    return (
      <TeamBuilderView
        team={team}
        onSlotSelect={(slotIndex) => openPanel('editor', slotIndex)}
        onClearTeam={() => onTeamChange(clearSubmittedTeam(team))}
        onSlotClear={(slotIndex) => onTeamChange(clearSubmittedTeamSlot(team, slotIndex))}
        onImportTeam={onTeamChange}
      />
    )
  }

  if (activeView === 'theater') {
    return <TheaterView />
  }

  const selectedReport = selectedReportId ? simulationReportsById[selectedReportId] : null

  if (selectedReport) {
    return <ReportDetailOverviewView report={selectedReport} onBack={onBackToReports} />
  }

  return (
    <ReportsListView
      entries={reportHistoryEntries}
      selectedReportId={selectedReportId}
      onSelectReport={onSelectReport}
      onOpenFilters={() => openPanel('filter')}
    />
  )
}

function ActivePanelHost({
  activePanel,
  editingSlot,
  battleLabSettings,
  team,
  simulationSettings,
  onClose,
  onBattleLabSettingsChange,
  onTeamChange,
  onSimulationSettingsChange,
}: {
  activePanel: ActivePanelId
  editingSlot: number | null
  battleLabSettings: BattleLabSettings
  team: SubmittedTeam
  simulationSettings: SimulationSettings
  onClose: () => void
  onBattleLabSettingsChange: (settings: BattleLabSettings) => void
  onTeamChange: (team: SubmittedTeam) => void
  onSimulationSettingsChange: (settings: SimulationSettings) => void
}) {
  if (activePanel === 'editor') {
    const slotNumber = (editingSlot ?? 0) + 1
    const pokemon = team.slots.find((slot) => slot.slot === slotNumber)?.pokemon ?? null

    const handleSavePokemon = (draft: PokemonEditorDraft) => {
      onTeamChange(upsertSubmittedTeamPokemon(team, slotNumber, draft.pokemon))
      onClose()
    }

    return (
      <PokemonEditorPanel
        open
        slotIndex={editingSlot}
        slotNumber={slotNumber}
        pokemon={pokemon}
        onClose={onClose}
        onSave={handleSavePokemon}
      />
    )
  }

  if (activePanel === 'settings') {
    return (
      <SettingsPanel
        open
        settings={battleLabSettings}
        profiles={performanceProfiles}
        onClose={onClose}
        onSave={(settings) => {
          onBattleLabSettingsChange(settings)
          onClose()
        }}
      />
    )
  }

  if (activePanel === 'simulate') {
    return (
      <SimulationSettingsPanel
        open
        settings={simulationSettings}
        opponentPools={opponentPools}
        performanceProfiles={performanceProfiles}
        onChange={onSimulationSettingsChange}
        onClose={onClose}
        onStart={(settings) => {
          onSimulationSettingsChange(settings)
          onClose()
        }}
      />
    )
  }

  if (activePanel === 'sync') {
    return <CatalogUpdatePanel open onClose={onClose} />
  }

  const panel = getPanelContent(activePanel)

  return (
    <aside className={`side-panel ${activePanel ? 'is-open' : ''}`} aria-hidden={!activePanel}>
      <header className="panel-header">
        <div>
          <span className="panel-eyebrow">{panel.eyebrow}</span>
          <h2>{panel.title}</h2>
        </div>
        <button className="panel-close" type="button" aria-label="Close panel" onClick={onClose}>
          x
        </button>
      </header>

      <div className="panel-body">
        <p>{panel.description}</p>
        <div className="panel-placeholder">
          <strong>{panel.placeholderTitle}</strong>
          <span>{panel.placeholderDetail}</span>
        </div>
      </div>

      <footer className="panel-footer">
        <button className="secondary-action" type="button" onClick={onClose}>
          Close
        </button>
        <button className="primary-action" type="button" onClick={onClose}>
          Done
        </button>
      </footer>
    </aside>
  )
}

function clearSubmittedTeam(team: SubmittedTeam): SubmittedTeam {
  return {
    ...team,
    slots: team.slots.map((slot) => ({ ...slot, pokemon: null })) as SubmittedTeam['slots'],
    updatedAt: new Date().toISOString(),
  }
}

function clearSubmittedTeamSlot(team: SubmittedTeam, slotIndex: number): SubmittedTeam {
  const slotNumber = slotIndex + 1

  return {
    ...team,
    slots: team.slots.map((slot) =>
      slot.slot === slotNumber ? { ...slot, pokemon: null } : slot,
    ) as SubmittedTeam['slots'],
    updatedAt: new Date().toISOString(),
  }
}

function upsertSubmittedTeamPokemon(
  team: SubmittedTeam,
  slotNumber: number,
  pokemon: PokemonEditorDraft['pokemon'],
): SubmittedTeam {
  return {
    ...team,
    slots: team.slots.map((slot) =>
      slot.slot === slotNumber
        ? {
            ...slot,
            pokemon: {
              ...pokemon,
              slot: slot.slot,
            },
          }
        : slot,
    ) as SubmittedTeam['slots'],
    updatedAt: new Date().toISOString(),
  }
}

function getPanelContent(activePanel: ActivePanelId) {
  if (activePanel === 'filter') {
    return {
      eyebrow: 'Reports',
      title: 'Filter reports',
      description: 'Reports filters should open over the Reports main view through the shared panel host.',
      placeholderTitle: 'Filter integration point',
      placeholderDetail: 'Report detail, tabs, and filter state remain owned by the reports lane.',
    }
  }

  return {
    eyebrow: 'Panel',
    title: 'No panel selected',
    description: 'Choose a shell action to open a side panel.',
    placeholderTitle: 'Panel host',
    placeholderDetail: 'The host remains mounted so transitions and layout stay stable.',
  }
}

export default App
