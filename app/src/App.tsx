import { useEffect, useMemo, useState } from 'react'
import {
  localSimulationSettings,
  opponentPools,
  performanceProfiles,
  reportHistoryEntries,
  simulationReportsById,
  submittedTeam,
} from './data'
import PokemonEditorPanel from './panels/PokemonEditorPanel'
import SimulationSettingsPanel from './panels/SimulationSettingsPanel'
import ReportDetailOverviewView from './screens/ReportDetailOverviewView'
import ReportsListView from './screens/ReportsListView'
import TeamBuilderView from './screens/TeamBuilderView'
import type { ReportHistoryEntry, SimulationSettings } from './types'
import './App.css'

type MainViewId = 'team' | 'reports'
type ActivePanelId = 'editor' | 'simulate' | 'sync' | 'settings' | 'filter' | null

type NavItem = {
  id: string
  label: string
  detail: string
  kind: 'view' | 'panel'
  target: MainViewId | NonNullable<ActivePanelId>
}

type ShellPanelState = {
  activeView: MainViewId
  activePanel: ActivePanelId
  editingSlot: number | null
}

const navItems: NavItem[] = [
  { id: 'team', label: 'Team Builder', detail: 'Six-slot roster', kind: 'view', target: 'team' },
  { id: 'reports', label: 'Reports', detail: 'History and detail', kind: 'view', target: 'reports' },
  { id: 'sync', label: 'Data Sync', detail: 'Offline catalog', kind: 'panel', target: 'sync' },
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
}

function App() {
  const [shellState, setShellState] = useState<ShellPanelState>({
    activeView: 'team',
    activePanel: null,
    editingSlot: null,
  })
  const [simulationSettings, setSimulationSettings] =
    useState<SimulationSettings>(localSimulationSettings)
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
                  <button className="secondary-action" type="button">
                    Load team
                  </button>
                  <button className="secondary-action" type="button" onClick={() => openPanel('settings')}>
                    Settings
                  </button>
                  {activeView === 'team' ? (
                    <button className="primary-action" type="button" onClick={() => openPanel('simulate')}>
                      Run simulation
                    </button>
                  ) : null}
                </div>
              </header>

              <section className="main-body">
                {renderMainView(activeView, openPanel, selectedReportId, (entry) =>
                  setSelectedReportId(entry.reportId),
                () =>
                  setSelectedReportId(null),
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
              simulationSettings={simulationSettings}
              onClose={closePanel}
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
          const isActive =
            item.kind === 'view' ? activeView === item.target : activePanel === item.target

          return (
            <button
              className={`nav-item ${isActive ? 'active' : ''}`}
              key={item.id}
              onClick={() => onNavigate(item)}
              type="button"
            >
              <span className="nav-dot" aria-hidden="true" />
              <span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-detail">{item.detail}</span>
              </span>
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
        <button className="settings-link" type="button" onClick={() => onNavigate(navPanel('settings'))}>
          Settings
        </button>
        <div className="sidebar-status">
          <span>Local status</span>
          <strong>Ready</strong>
        </div>
      </div>
    </aside>
  )
}

function navPanel(panel: NonNullable<ActivePanelId>): NavItem {
  return {
    id: panel,
    label: panel,
    detail: 'Panel',
    kind: 'panel',
    target: panel,
  }
}

function renderMainView(
  activeView: MainViewId,
  openPanel: (panel: NonNullable<ActivePanelId>, editingSlotValue?: number | null) => void,
  selectedReportId: string | null,
  onSelectReport: (entry: ReportHistoryEntry) => void,
  onBackToReports: () => void,
) {
  if (activeView === 'team') {
    return (
      <TeamBuilderView
        onSlotSelect={(slotIndex) => openPanel('editor', slotIndex)}
      />
    )
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
  simulationSettings,
  onClose,
  onSimulationSettingsChange,
}: {
  activePanel: ActivePanelId
  editingSlot: number | null
  simulationSettings: SimulationSettings
  onClose: () => void
  onSimulationSettingsChange: (settings: SimulationSettings) => void
}) {
  if (activePanel === 'editor') {
    const slotNumber = (editingSlot ?? 0) + 1
    const pokemon = submittedTeam.slots.find((slot) => slot.slot === slotNumber)?.pokemon ?? null

    return (
      <PokemonEditorPanel
        open
        slotIndex={editingSlot}
        slotNumber={slotNumber}
        pokemon={pokemon}
        onClose={onClose}
        onSave={onClose}
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

function getPanelContent(activePanel: ActivePanelId) {
  if (activePanel === 'sync') {
    return {
      eyebrow: 'Data Sync',
      title: 'Catalog sync',
      description: 'Offline-first catalog import and update controls will use this panel host later.',
      placeholderTitle: 'No production sync',
      placeholderDetail: 'Catalog source selection, caching, and API calls are intentionally not implemented.',
    }
  }

  if (activePanel === 'settings') {
    return {
      eyebrow: 'Settings',
      title: 'Local preferences',
      description: 'Performance profile and desktop preferences can be mounted here after contracts settle.',
      placeholderTitle: 'Shell-owned settings panel',
      placeholderDetail: 'This checkpoint only prepares the right-side panel behavior.',
    }
  }

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
