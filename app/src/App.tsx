import { useEffect, useMemo, useRef, useState } from 'react'
import {
  localBattleLabSettings,
  localSimulationSettings,
  opponentPools,
  performanceProfiles,
  reportHistoryEntries,
  simulationReportsById,
  createShowdownTeamLegalityReadModel,
  submittedTeam as initialSubmittedTeam,
  type ShowdownTeamLegalityReadModel,
  type ShowdownTeamLegalitySlotResult,
  type ShowdownTeamLegalityStatus,
} from './data'
import CatalogUpdatePanel from './panels/CatalogUpdatePanel'
import PokemonEditorPanel, { type PokemonEditorDraft } from './panels/PokemonEditorPanel'
import SettingsPanel from './panels/SettingsPanel'
import SimulationSettingsPanel from './panels/SimulationSettingsPanel'
import ReportDetailOverviewView from './screens/ReportDetailOverviewView'
import ReportsListView from './screens/ReportsListView'
import TeamBuilderView from './screens/TeamBuilderView'
import TheaterView from './screens/TheaterView'
import type {
  BattleLabSettings,
  PokemonMoveSlots,
  ReportHistoryEntry,
  SimulationSettings,
  SubmittedTeam,
} from './types'
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

const SAVED_TEAM_STORAGE_KEY = 'battlelab.savedTeam.v1'
const SAVED_TEAM_PAYLOAD_SCHEMA = 'battlelab.savedTeam'
const SAVED_TEAM_PAYLOAD_VERSION = 1

type SavedTeamPayload = {
  schema: typeof SAVED_TEAM_PAYLOAD_SCHEMA
  version: typeof SAVED_TEAM_PAYLOAD_VERSION
  savedAt: string
  team: SubmittedTeam
}

type SavedTeamReadResult =
  | { status: 'ready'; team: SubmittedTeam; shouldMigrate: boolean }
  | { status: 'missing' }
  | { status: 'invalid'; reason: string }

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
    subtitle: 'Review sample simulation history and report summaries.',
  },
  theater: {
    title: 'Theater',
    subtitle: 'Watch and review local battle replays.',
  },
}

function App() {
  const desktopRuntime = typeof window !== 'undefined' && Boolean(window.battleLabDesktop)
  const [shellState, setShellState] = useState<ShellPanelState>({
    activeView: 'team',
    activePanel: null,
    editingSlot: null,
  })
  const [simulationSettings, setSimulationSettings] =
    useState<SimulationSettings | null>(null)
  const [battleLabSettings, setBattleLabSettings] =
    useState<BattleLabSettings>(localBattleLabSettings)
  const [activeTeam, setActiveTeam] = useState<SubmittedTeam>(initialSubmittedTeam)
  const [teamSaved, setTeamSaved] = useState(false)
  const [savedTeamAvailable, setSavedTeamAvailable] = useState(() =>
    typeof window !== 'undefined' ? Boolean(window.localStorage.getItem(SAVED_TEAM_STORAGE_KEY)) : false,
  )
  const [loadConfirmOpen, setLoadConfirmOpen] = useState(false)
  const [pendingLoadTeam, setPendingLoadTeam] = useState<SubmittedTeam | null>(null)
  const [loadTeamError, setLoadTeamError] = useState<string | null>(null)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [teamLegalityStatus, setTeamLegalityStatus] =
    useState<ShowdownTeamLegalityStatus>('not-checked')
  const [teamLegalityReadModel, setTeamLegalityReadModel] =
    useState<ShowdownTeamLegalityReadModel | null>(null)
  const [teamLegalityError, setTeamLegalityError] = useState<string | null>(null)
  const [teamLegalityRunKey, setTeamLegalityRunKey] = useState(0)
  const teamLegalityRequestId = useRef(0)

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
    window.localStorage.setItem(SAVED_TEAM_STORAGE_KEY, JSON.stringify(createSavedTeamPayload(activeTeam)))
    setSavedTeamAvailable(true)
    setTeamSaved(true)
    setLoadTeamError(null)
    window.setTimeout(() => setTeamSaved(false), 1600)
  }

  const handleLoadTeam = () => {
    const savedTeam = readSavedTeam()

    if (savedTeam.status === 'missing') {
      setSavedTeamAvailable(false)
      setLoadTeamError('No saved team was found on this device.')
      return
    }

    if (savedTeam.status === 'invalid') {
      window.localStorage.removeItem(SAVED_TEAM_STORAGE_KEY)
      setSavedTeamAvailable(false)
      setLoadTeamError(savedTeam.reason)
      return
    }

    if (savedTeam.shouldMigrate) {
      window.localStorage.setItem(SAVED_TEAM_STORAGE_KEY, JSON.stringify(createSavedTeamPayload(savedTeam.team)))
    }

    setPendingLoadTeam(savedTeam.team)
    setLoadConfirmOpen(true)
    setLoadTeamError(null)
  }

  const confirmLoadTeam = () => {
    if (!pendingLoadTeam) {
      setLoadConfirmOpen(false)
      return
    }

    updateActiveTeam(pendingLoadTeam, { checkLegality: true })
    setLoadConfirmOpen(false)
    setPendingLoadTeam(null)
  }

  const cancelLoadTeam = () => {
    setLoadConfirmOpen(false)
    setPendingLoadTeam(null)
  }

  const dismissLoadTeamError = () => {
    setLoadTeamError(null)
  }

  const updateActiveTeam = (team: SubmittedTeam, options?: { checkLegality?: boolean }) => {
    setActiveTeam(team)
    setTeamLegalityStatus(options?.checkLegality ? 'checking' : 'not-checked')
    setTeamLegalityReadModel(null)
    setTeamLegalityError(null)

    if (options?.checkLegality) {
      setTeamLegalityRunKey((current) => current + 1)
    }
  }

  const handleTeamFormatChange = (format: SubmittedTeam['format']) => {
    updateActiveTeam(
      {
        ...activeTeam,
        format,
        updatedAt: new Date().toISOString(),
      },
      { checkLegality: true },
    )
  }

  useEffect(() => {
    if (teamLegalityRunKey === 0) return

    const requestId = teamLegalityRequestId.current + 1
    teamLegalityRequestId.current = requestId

    const timeoutId = window.setTimeout(() => {
      setTeamLegalityStatus('checking')
      setTeamLegalityError(null)

      createShowdownTeamLegalityReadModel(activeTeam, {
        runtimeLoader: 'browser-data',
      })
        .then((readModel) => {
          if (teamLegalityRequestId.current !== requestId) return

          setTeamLegalityReadModel(readModel)
          setTeamLegalityStatus(readModel.status)
        })
        .catch((error) => {
          if (teamLegalityRequestId.current !== requestId) return

          setTeamLegalityReadModel(null)
          setTeamLegalityStatus('failed')
          setTeamLegalityError(
            error instanceof Error ? error.message : 'Pokemon Showdown team legality check failed.',
          )
        })
    }, 450)

    return () => window.clearTimeout(timeoutId)
  }, [activeTeam, teamLegalityRunKey])

  useEffect(() => {
    const root = document.documentElement
    if (battleLabSettings.theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', battleLabSettings.theme)
    }
  }, [battleLabSettings.theme])

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
    <div
      className={`stage ${desktopRuntime ? 'is-desktop-runtime' : ''}`}
      data-animations={battleLabSettings.animationsEnabled ? 'on' : 'off'}
    >
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
                        {teamSaved ? 'Saved' : 'Save team'}
                      </button>
                      <button
                        className="secondary-action"
                        type="button"
                        disabled={!savedTeamAvailable}
                        title={
                          savedTeamAvailable
                            ? 'Load the last team saved on this device.'
                            : 'No saved team on this device yet.'
                        }
                        onClick={handleLoadTeam}
                      >
                        Load team
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
                  updateActiveTeam,
                  handleTeamFormatChange,
                  teamLegalityReadModel,
                  teamLegalityStatus,
                  teamLegalityError,
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
              onTeamChange={updateActiveTeam}
              teamLegalitySlot={
                teamLegalityReadModel?.slotResults.find((slot) => slot.slot === (editingSlot ?? 0) + 1) ?? null
              }
              onSimulationSettingsChange={setSimulationSettings}
            />

            {loadConfirmOpen ? (
              <div className="bl-io-overlay" role="dialog" aria-modal="true" aria-label="Confirm load team">
                <button
                  className="bl-io-scrim"
                  type="button"
                  aria-label="Cancel load team"
                  onClick={cancelLoadTeam}
                />
                <div className="bl-io-dialog bl-clear-confirm-dialog">
                  <header className="bl-io-header">
                    <div>
                      <span className="eyebrow">Load team</span>
                      <h3>Replace the current team?</h3>
                    </div>
                    <button
                      className="bl-io-close"
                      type="button"
                      aria-label="Cancel load team"
                      onClick={cancelLoadTeam}
                    >
                      <AppCloseIcon />
                    </button>
                  </header>

                  <p className="bl-io-note">
                    Loading replaces the current in-session team with the team saved on this device.
                  </p>

                  <div className="bl-io-actions">
                    <button className="secondary-action" type="button" onClick={cancelLoadTeam}>
                      Cancel
                    </button>
                    <button className="primary-action" type="button" onClick={confirmLoadTeam}>
                      Load team
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {loadTeamError ? (
              <div className="bl-io-overlay" role="dialog" aria-modal="true" aria-label="Load team unavailable">
                <button
                  className="bl-io-scrim"
                  type="button"
                  aria-label="Close load team message"
                  onClick={dismissLoadTeamError}
                />
                <div className="bl-io-dialog bl-clear-confirm-dialog">
                  <header className="bl-io-header">
                    <div>
                      <span className="eyebrow">Load team</span>
                      <h3>Saved team could not be loaded</h3>
                    </div>
                    <button
                      className="bl-io-close"
                      type="button"
                      aria-label="Close load team message"
                      onClick={dismissLoadTeamError}
                    >
                      <AppCloseIcon />
                    </button>
                  </header>

                  <p className="bl-io-note">{loadTeamError}</p>

                  <div className="bl-io-actions">
                    <button className="primary-action" type="button" onClick={dismissLoadTeamError}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function TitleBar({ activeTitle }: { activeTitle: string }) {
  const desktopReady = typeof window !== 'undefined' && Boolean(window.battleLabDesktop)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const desktop = window.battleLabDesktop
    if (!desktop) return

    desktop.windowControls
      .isMaximized()
      .then(setMaximized)
      .catch(() => setMaximized(false))
  }, [])

  const handleOpenDataFolder = () => {
    void window.battleLabDesktop?.app.openDataFolder()
  }

  const handleMinimize = () => {
    void window.battleLabDesktop?.windowControls.minimize()
  }

  const handleToggleMaximize = () => {
    window.battleLabDesktop?.windowControls
      .toggleMaximize()
      .then(setMaximized)
      .catch(() => setMaximized(false))
  }

  const handleClose = () => {
    void window.battleLabDesktop?.windowControls.close()
  }

  return (
    <div className="win-titlebar">
      <div className="titlebar-title">
        <span className="titlebar-mark" aria-hidden="true" />
        <span>BattleLab</span>
        <span className="titlebar-team">Sandstorm Hyper Offense / {activeTitle}</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-data-button"
          type="button"
          disabled={!desktopReady}
          title={desktopReady ? 'Open BattleLab data folder' : 'Desktop data folder is available in the app runtime.'}
          onClick={handleOpenDataFolder}
        >
          Data
        </button>
        <button
          type="button"
          disabled={!desktopReady}
          aria-label="Minimize window"
          title="Minimize"
          onClick={handleMinimize}
        >
          <span aria-hidden="true">-</span>
        </button>
        <button
          type="button"
          disabled={!desktopReady}
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
          title={maximized ? 'Restore' : 'Maximize'}
          onClick={handleToggleMaximize}
        >
          <span aria-hidden="true">{maximized ? 'R' : 'M'}</span>
        </button>
        <button
          className="titlebar-close"
          type="button"
          disabled={!desktopReady}
          aria-label="Close window"
          title="Close"
          onClick={handleClose}
        >
          <span aria-hidden="true">X</span>
        </button>
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
  onTeamChange: (team: SubmittedTeam, options?: { checkLegality?: boolean }) => void,
  onTeamFormatChange: (format: SubmittedTeam['format']) => void,
  teamLegalityReadModel: ShowdownTeamLegalityReadModel | null,
  teamLegalityStatus: ShowdownTeamLegalityStatus,
  teamLegalityError: string | null,
) {
  if (activeView === 'team') {
    return (
      <TeamBuilderView
        team={team}
        onSlotSelect={(slotIndex) => openPanel('editor', slotIndex)}
        onClearTeam={() => onTeamChange(clearSubmittedTeam(team), { checkLegality: true })}
        onSlotClear={(slotIndex) => onTeamChange(clearSubmittedTeamSlot(team, slotIndex), { checkLegality: true })}
        onImportTeam={(importedTeam) => onTeamChange(importedTeam, { checkLegality: true })}
        onFormatChange={onTeamFormatChange}
        legalityReadModel={teamLegalityReadModel}
        legalityStatus={teamLegalityStatus}
        legalityError={teamLegalityError}
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
  teamLegalitySlot,
  onSimulationSettingsChange,
}: {
  activePanel: ActivePanelId
  editingSlot: number | null
  battleLabSettings: BattleLabSettings
  team: SubmittedTeam
  simulationSettings: SimulationSettings | null
  onClose: () => void
  onBattleLabSettingsChange: (settings: BattleLabSettings) => void
  onTeamChange: (team: SubmittedTeam, options?: { checkLegality?: boolean }) => void
  teamLegalitySlot: ShowdownTeamLegalitySlotResult | null
  onSimulationSettingsChange: (settings: SimulationSettings) => void
}) {
  if (activePanel === 'editor') {
    const slotNumber = (editingSlot ?? 0) + 1
    const pokemon = team.slots.find((slot) => slot.slot === slotNumber)?.pokemon ?? null

    const handleSavePokemon = (draft: PokemonEditorDraft) => {
      onTeamChange(upsertSubmittedTeamPokemon(team, slotNumber, draft.pokemon), { checkLegality: true })
      onClose()
    }

    return (
      <PokemonEditorPanel
        open
        slotIndex={editingSlot}
        slotNumber={slotNumber}
        pokemon={pokemon}
        statEditorMode={battleLabSettings.statEditorMode}
        teamLegalitySlot={teamLegalitySlot}
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
    const activeSimulationSettings =
      simulationSettings ?? createSimulationSettingsFromDefaults(localSimulationSettings, battleLabSettings)

    return (
      <SimulationSettingsPanel
        open
        settings={activeSimulationSettings}
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
          <AppCloseIcon />
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

function AppCloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
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

function createSimulationSettingsFromDefaults(
  baseSettings: SimulationSettings,
  settings: BattleLabSettings,
): SimulationSettings {
  const defaultProfile =
    performanceProfiles.find((profile) => profile.id === settings.defaultPerformanceProfileId) ??
    performanceProfiles[0]

  return {
    ...baseSettings,
    format: settings.defaultFormat,
    performanceProfileId: defaultProfile?.id ?? baseSettings.performanceProfileId,
    workerCount: defaultProfile?.recommendedWorkerCount ?? baseSettings.workerCount,
  }
}

function createSavedTeamPayload(team: SubmittedTeam): SavedTeamPayload {
  return {
    schema: SAVED_TEAM_PAYLOAD_SCHEMA,
    version: SAVED_TEAM_PAYLOAD_VERSION,
    savedAt: new Date().toISOString(),
    team,
  }
}

function readSavedTeam(): SavedTeamReadResult {
  const storedTeam = window.localStorage.getItem(SAVED_TEAM_STORAGE_KEY)

  if (!storedTeam) {
    return { status: 'missing' }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(storedTeam)
  } catch {
    return {
      status: 'invalid',
      reason: 'The saved team data is not readable. The current team was left unchanged.',
    }
  }

  if (isSavedTeamPayload(parsed)) {
    return { status: 'ready', team: parsed.team, shouldMigrate: false }
  }

  if (isSubmittedTeam(parsed)) {
    return { status: 'ready', team: parsed, shouldMigrate: true }
  }

  return {
    status: 'invalid',
    reason: 'The saved team data is missing required team fields or uses an unsupported version. The current team was left unchanged.',
  }
}

function isSavedTeamPayload(value: unknown): value is SavedTeamPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.schema === SAVED_TEAM_PAYLOAD_SCHEMA &&
    value.version === SAVED_TEAM_PAYLOAD_VERSION &&
    typeof value.savedAt === 'string' &&
    isSubmittedTeam(value.team)
  )
}

function isSubmittedTeam(value: unknown): value is SubmittedTeam {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isBattleFormat(value.format) &&
    typeof value.description === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.slots) &&
    value.slots.length === 6 &&
    value.slots.every((slot, index) => isTeamSlot(slot, index + 1))
  )
}

function isTeamSlot(value: unknown, slotNumber: number): value is SubmittedTeam['slots'][number] {
  return isRecord(value) && value.slot === slotNumber && (value.pokemon === null || isPokemonBuild(value.pokemon))
}

function isPokemonBuild(value: unknown): value is SubmittedTeam['slots'][number]['pokemon'] {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    isSlotNumber(value.slot) &&
    typeof value.species === 'string' &&
    typeof value.level === 'number' &&
    isPokemonType(value.teraType) &&
    typeof value.item === 'string' &&
    typeof value.ability === 'string' &&
    typeof value.nature === 'string' &&
    isPokemonMoveSlots(value.moves) &&
    isStatSpread(value.evs) &&
    isStatSpread(value.ivs) &&
    (value.notes === undefined || typeof value.notes === 'string')
  )
}

function isBattleFormat(value: unknown): value is SubmittedTeam['format'] {
  return value === 'vgc-regulation-h' || value === 'vgc-regulation-g' || value === 'custom'
}

function isSlotNumber(value: unknown): value is SubmittedTeam['slots'][number]['slot'] {
  return [1, 2, 3, 4, 5, 6].includes(value as number)
}

function isPokemonType(value: unknown): boolean {
  return [
    'Normal',
    'Fire',
    'Water',
    'Electric',
    'Grass',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Dark',
    'Steel',
    'Fairy',
  ].includes(value as string)
}

function isPokemonMoveSlots(value: unknown): value is PokemonMoveSlots {
  return Array.isArray(value) && value.length === 4 && value.every((move) => typeof move === 'string')
}

function isStatSpread(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].every((stat) => typeof value[stat] === 'number')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
