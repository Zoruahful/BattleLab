import { useState } from 'react'
import { fakeCatalogUpdateSnapshot } from '../data'
import type {
  CatalogFetchExecutionStatus,
  CatalogSourceFetchStatus,
  CatalogUpdateCategory,
  CatalogUpdateCategoryStatus,
  CatalogUpdateSnapshot,
} from '../types'
import '../styles/settings-catalog-panels.css'

type CatalogRuntimeStatus = CatalogFetchExecutionStatus | CatalogSourceFetchStatus | CatalogUpdateSnapshot['progress']['status']

type CatalogRuntimeCategoryProgress = Partial<Record<CatalogUpdateCategory['id'], {
  progressPercent?: number
  status?: CatalogRuntimeStatus
}>>

export type CatalogUpdatePanelProps = {
  open?: boolean
  snapshot?: CatalogUpdateSnapshot
  runtimeCategoryProgress?: CatalogRuntimeCategoryProgress
  runtimeMessage?: string
  runtimeStatus?: CatalogRuntimeStatus
  onClose?: () => void
}

const categoryStatusLabels: Record<CatalogUpdateCategoryStatus, string> = {
  current: 'Current',
  stale: 'Stale',
  needsReview: 'Review required',
}

type CatalogProgressDisplayState =
  | 'disabled'
  | 'preview'
  | 'checking'
  | 'fetching'
  | 'using-cache'
  | 'validating'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'
  | 'blocked'

type CatalogProgressRawStatus =
  | 'idle'
  | 'disabled'
  | 'planned'
  | 'blocked'
  | 'queued'
  | 'fetching'
  | 'using-cache'
  | 'validating-source'
  | 'normalizing'
  | 'validating-catalog'
  | 'validating-bundle'
  | 'complete'
  | 'complete-with-warnings'
  | 'failed'
  | 'cancelled'
  | 'offline'
  | 'rate-limited'
  | 'retrying'
  | 'production-disabled'
  | 'development'
  | 'test'
  | 'local-preview'
  | 'checking'
  | 'downloading'
  | 'applying'
  | 'running'
  | 'validating'
  | 'warning'
  | 'error'
  | 'fetched'

const progressStatusLabels: Record<CatalogProgressRawStatus, string> = {
  idle: 'Local preview ready',
  disabled: 'Catalog updates are off in this build',
  planned: 'Checking for updates…',
  queued: 'Checking for updates…',
  checking: 'Checking for updates…',
  fetching: 'Downloading catalog data…',
  downloading: 'Downloading catalog data…',
  running: 'Downloading catalog data…',
  'using-cache': 'Using your saved copy',
  fetched: 'Checking downloaded data…',
  'validating-source': 'Checking downloaded data…',
  normalizing: 'Checking downloaded data…',
  'validating-catalog': 'Checking downloaded data…',
  'validating-bundle': 'Checking downloaded data…',
  applying: 'Checking downloaded data…',
  validating: 'Checking downloaded data…',
  complete: 'Catalog up to date',
  'complete-with-warnings': 'Updated — some items need review',
  warning: 'Updated — some items need review',
  failed: 'Update failed — kept your last saved catalog',
  error: 'Update failed — kept your last saved catalog',
  offline: 'Offline — using your saved copy',
  'rate-limited': 'Source busy — retrying…',
  retrying: 'Source busy — retrying…',
  blocked: 'Catalog updates are off in this build',
  'production-disabled': 'Catalog updates are off in this build',
  cancelled: 'Update cancelled',
  development: 'Local preview ready',
  test: 'Local preview ready',
  'local-preview': 'Local preview ready',
}

const progressStateDescriptions: Record<CatalogProgressDisplayState, string> = {
  preview: 'Local preview is waiting. No network sync is running.',
  checking: 'Checking local preview state only. No live fetch is running.',
  // Revise these temporary descriptions when live fetch wiring lands so they describe real download/validation state.
  fetching: 'This label is reserved for a future real fetch. No download runs in this checkpoint.',
  'using-cache': 'The app keeps working from the last saved or bundled catalog.',
  validating: 'Future validation will check downloaded or cached data before using it.',
  complete: 'Preview data is prepared for the current local snapshot.',
  warning: 'Some catalog items may need review; the app keeps using safe local catalog data.',
  failed: 'The app keeps working from the last saved or bundled catalog.',
  cancelled: 'The update was cancelled. The app keeps using the last saved or bundled catalog.',
  blocked: 'Catalog updates are disabled for this build. The bundled catalog remains available.',
  disabled: 'Catalog updates are disabled for this build. The bundled catalog remains available.',
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function normalizeProgressState(status?: string): CatalogProgressDisplayState {
  if (status === 'blocked') return 'blocked'
  if (status === 'production-disabled' || status === 'disabled') return 'disabled'
  if (status === 'planned' || status === 'queued' || status === 'checking') return 'checking'
  if (status === 'fetching' || status === 'downloading' || status === 'running') return 'fetching'
  if (status === 'using-cache' || status === 'offline') return 'using-cache'
  if (
    status === 'fetched' ||
    status === 'validating-source' ||
    status === 'normalizing' ||
    status === 'validating-catalog' ||
    status === 'validating-bundle' ||
    status === 'applying'
  ) {
    return 'validating'
  }
  if (status === 'complete') return 'complete'
  if (status === 'rate-limited' || status === 'retrying') return 'checking'
  if (status === 'complete-with-warnings' || status === 'warning') {
    return 'warning'
  }
  if (status === 'cancelled') return 'cancelled'
  if (status === 'failed' || status === 'error') return 'failed'
  return 'preview'
}

function getProgressStatusLabel(status?: string) {
  return progressStatusLabels[(status ?? 'idle') as CatalogProgressRawStatus] ?? progressStatusLabels.idle
}

function getCategoryProgressState(
  categoryStatus: CatalogUpdateCategoryStatus,
  progressStatus: string | undefined,
): CatalogProgressDisplayState {
  if (categoryStatus === 'needsReview') return 'warning'
  if (categoryStatus === 'stale' && !progressStatus) return 'warning'
  return normalizeProgressState(progressStatus)
}

function getCategoryProgressStatus(categoryStatus: CatalogUpdateCategoryStatus, progressStatus: string | undefined) {
  if (categoryStatus === 'needsReview') return 'complete-with-warnings'
  if (categoryStatus === 'stale' && !progressStatus) return 'complete-with-warnings'
  return progressStatus ?? 'idle'
}

export function CatalogUpdatePanel({
  open = true,
  snapshot = fakeCatalogUpdateSnapshot,
  runtimeCategoryProgress,
  runtimeMessage,
  runtimeStatus,
  onClose,
}: CatalogUpdatePanelProps) {
  const [draftSnapshot, setDraftSnapshot] = useState<CatalogUpdateSnapshot>(snapshot)
  const [helpOpen, setHelpOpen] = useState(false)
  const panelStatus = runtimeStatus ?? draftSnapshot.progress.status
  const panelProgressState = normalizeProgressState(panelStatus)
  const panelProgressLabel = getProgressStatusLabel(panelStatus)
  const averageProgress = Math.round(
    draftSnapshot.progress.categories.reduce((total, category) => {
      const runtimeProgress = runtimeCategoryProgress?.[category.id]?.progressPercent
      return total + (runtimeProgress ?? category.progressPercent)
    }, 0) /
      draftSnapshot.progress.categories.length,
  )
  const completedCategories = draftSnapshot.progress.categories.filter(
    (category) => normalizeProgressState(runtimeCategoryProgress?.[category.id]?.status ?? category.status) === 'complete',
  ).length
  const panelMessage = runtimeMessage ?? draftSnapshot.progress.message ?? progressStateDescriptions[panelProgressState]

  const handleCheck = () => {
    setDraftSnapshot((current) => ({
      ...current,
      lastCheckedAt: new Date().toISOString(),
      progress: {
        ...current.progress,
        status: current.progress.status === 'checking' ? 'idle' : 'checking',
        activeSourceIds:
          current.progress.status === 'checking' ? [] : current.sources.map((source) => source.sourceId),
        message:
          current.progress.status === 'checking'
            ? 'Local preview is idle. No network sync is running.'
            : 'Checking local preview state only. No download, live fetch, or network sync is running.',
      },
    }))
  }

  return (
    <aside
      className={`bl-catalog-panel side-panel ${open ? 'is-open' : ''}`}
      aria-labelledby="catalog-update-title"
      aria-hidden={!open}
    >
      <div className="bl-settings-shell">
        <header className="bl-settings-header">
          <div>
            <span className="eyebrow">Catalog Update</span>
            <h2 id="catalog-update-title">Catalog update progress</h2>
            <p>Local preview for future Pokemon, move, ability, item, type, nature, and picker data updates.</p>
          </div>
          <div className="bl-catalog-header-actions">
            <button
              className={`bl-catalog-help-button ${helpOpen ? 'is-open' : ''}`}
              type="button"
              aria-label="About catalog updates"
              aria-describedby="catalog-update-help"
              aria-expanded={helpOpen}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHelpOpen(false)
                }
              }}
              onClick={() => setHelpOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setHelpOpen(false)
                  event.currentTarget.blur()
                }
              }}
            >
              ?
              <span className="bl-catalog-help-popover" id="catalog-update-help" role="tooltip">
                Catalog data fills names, picker options, descriptions, and visual metadata. Pokemon Showdown
                remains the future source of truth for battle legality and simulation. Checking is a local preview
                for now — no data is downloaded yet.
              </span>
            </button>
            <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="bl-settings-body">
          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Catalog areas</h3>
              <span>No live fetch</span>
            </div>

            <div className="bl-catalog-progress-overview" aria-label="Catalog update progress summary">
              <div>
                <span>Current state</span>
                <strong className={`bl-catalog-progress-state is-${panelProgressState}`}>
                  {panelProgressLabel}
                </strong>
                <p>{panelMessage}</p>
              </div>
              <div>
                <span>Prepared</span>
                <strong>{averageProgress}%</strong>
                <p>
                  {completedCategories} of {draftSnapshot.categories.length} areas marked complete in the local preview.
                </p>
              </div>
            </div>

            <div className="bl-catalog-category-list">
              {draftSnapshot.categories.map((category) => {
                const progress = draftSnapshot.progress.categories.find((item) => item.id === category.id)
                const runtimeProgress = runtimeCategoryProgress?.[category.id]
                const progressPercent = runtimeProgress?.progressPercent ?? progress?.progressPercent ?? 0
                const progressStatus = getCategoryProgressStatus(category.status, runtimeProgress?.status ?? progress?.status)
                const progressState = getCategoryProgressState(category.status, progressStatus)
                const progressLabel = getProgressStatusLabel(progressStatus)

                return (
                  <article className="bl-catalog-category" key={category.id}>
                    <div className="bl-catalog-category-topline">
                      <div>
                        <strong>{category.label}</strong>
                        <p>{category.description}</p>
                      </div>
                      <span
                        className={`bl-catalog-status is-${category.status} is-progress-${progressState}`}
                        title={categoryStatusLabels[category.status]}
                      >
                        {progressLabel}
                      </span>
                    </div>
                    <div
                      className={`bl-catalog-meter is-${progressState}`}
                      aria-label={`${category.label} progress`}
                    >
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="bl-catalog-meta">
                      <span>{formatCount(category.recordCount)} records</span>
                      <span>
                        {progressPercent}% prepared · {progressLabel}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <footer className="bl-settings-footer">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action" type="button" onClick={handleCheck}>
            Check preview status
          </button>
        </footer>
      </div>
    </aside>
  )
}

function CloseIcon() {
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

export default CatalogUpdatePanel
