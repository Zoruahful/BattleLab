import { useEffect, useRef, useState } from 'react'
import {
  createInitialCatalogUpdateDownloadState,
  loadCatalogUpdateDownloadStateFromCache,
  runCatalogUpdateDownload,
  type CatalogUpdateDownloadSectionProgress,
  type CatalogUpdateDownloadState,
  type CatalogUpdateDownloadStatus,
} from '../data/catalogUpdateDownloadService'
import '../styles/settings-catalog-panels.css'

export type CatalogUpdatePanelProps = {
  open?: boolean
  onClose?: () => void
}

type CatalogProgressDisplayState =
  | 'disabled'
  | 'preview'
  | 'checking'
  | 'fetching'
  | 'using-cache'
  | 'rate-limited'
  | 'validating'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'
  | 'blocked'

const runStatusLabels: Record<CatalogUpdateDownloadState['status'], string> = {
  idle: 'Ready to update',
  checking: 'Checking catalog sections…',
  fetching: 'Downloading catalog data…',
  complete: 'Catalog up to date',
  warning: 'Updated with warnings',
  failed: 'Update failed safely',
  cancelled: 'Update cancelled',
}

const sectionStatusLabels: Record<CatalogUpdateDownloadStatus, string> = {
  idle: 'Not checked',
  checking: 'Checking',
  fetching: 'Downloading',
  current: 'Current',
  complete: 'Updated',
  warning: 'Warning',
  failed: 'Failed safely',
  cancelled: 'Cancelled',
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatTimestamp(value?: string) {
  if (!value) return 'Not yet'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getProgressState(status: CatalogUpdateDownloadStatus | CatalogUpdateDownloadState['status']): CatalogProgressDisplayState {
  if (status === 'checking') return 'checking'
  if (status === 'fetching') return 'fetching'
  if (status === 'current' || status === 'complete') return 'complete'
  if (status === 'warning') return 'warning'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'preview'
}

function getSectionRecordCopy(section: CatalogUpdateDownloadSectionProgress) {
  if (section.total <= 0) return 'No records checked'
  return `${formatCount(section.downloaded)} / ${formatCount(section.total)} records`
}

function isRunning(status: CatalogUpdateDownloadState['status']) {
  return status === 'checking' || status === 'fetching'
}

export function CatalogUpdatePanel({ open = true, onClose }: CatalogUpdatePanelProps) {
  const [downloadState, setDownloadState] = useState<CatalogUpdateDownloadState>(() =>
    createInitialCatalogUpdateDownloadState(),
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const cacheHydratedRef = useRef(false)
  const running = isRunning(downloadState.status)
  const panelProgressState = getProgressState(downloadState.status)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      cacheHydratedRef.current = false
      return
    }

    if (running || cacheHydratedRef.current || downloadState.startedAt) return
    let cancelled = false

    loadCatalogUpdateDownloadStateFromCache()
      .then((state) => {
        if (!cancelled && mountedRef.current && !abortRef.current) {
          cacheHydratedRef.current = true
          setDownloadState(state)
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current && !abortRef.current) {
          cacheHydratedRef.current = true
          setDownloadState(createInitialCatalogUpdateDownloadState())
        }
      })

    return () => {
      cancelled = true
    }
  }, [downloadState.startedAt, open, running])

  const handleUpdate = async () => {
    if (abortRef.current || running) return

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await runCatalogUpdateDownload({
        signal: controller.signal,
        onProgress: (state) => {
          if (mountedRef.current) {
            setDownloadState(state)
          }
        },
      })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  return (
    <aside
      className={`bl-catalog-panel side-panel ${open ? 'is-open' : ''}`}
      aria-label="Catalog Update"
      aria-hidden={!open}
    >
      <div className="bl-settings-shell">
        <header className="bl-settings-header">
          <div>
            <span className="eyebrow">Catalog Update</span>
            <p>Download enrichment data for names, descriptions, picker options, and visual metadata candidates.</p>
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
                remains the source of truth for battle legality and simulation. Downloads start only when you click
                Update.
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
              <h3>Catalog sections</h3>
              <span>Browser cache</span>
            </div>

            <div className="bl-catalog-progress-overview" aria-label="Catalog update progress summary">
              <div>
                <span>Current state</span>
                <strong className={`bl-catalog-progress-state is-${panelProgressState}`}>
                  {runStatusLabels[downloadState.status]}
                </strong>
                <p>{downloadState.message}</p>
              </div>
              <div>
                <span>Overall progress</span>
                <strong>{downloadState.aggregateProgressPercent}%</strong>
                <p>
                  {downloadState.finishedAt
                    ? `Last run finished ${formatTimestamp(downloadState.finishedAt)}.`
                    : 'No automatic downloads run on app load.'}
                </p>
              </div>
            </div>

            <div className="bl-catalog-category-list">
              {downloadState.sections.map((section) => {
                const progressState = getProgressState(section.status)

                return (
                  <article className="bl-catalog-category" key={section.id}>
                    <div className="bl-catalog-category-topline">
                      <div>
                        <strong>{section.label}</strong>
                        <p>{section.description}</p>
                      </div>
                      <span className={`bl-catalog-status is-progress-${progressState}`}>
                        {sectionStatusLabels[section.status]}
                      </span>
                    </div>
                    <div
                      className={`bl-catalog-meter is-${progressState}`}
                      aria-label={`${section.label} progress`}
                    >
                      <span style={{ width: `${section.progressPercent}%` }} />
                    </div>
                    <div className="bl-catalog-meta">
                      <span>{getSectionRecordCopy(section)}</span>
                      <span>{section.message}</span>
                    </div>
                    <dl className="bl-catalog-section-times">
                      <div>
                        <dt>Last checked</dt>
                        <dd>{formatTimestamp(section.lastCheckedAt)}</dd>
                      </div>
                      <div>
                        <dt>Last updated</dt>
                        <dd>{formatTimestamp(section.lastUpdatedAt)}</dd>
                      </div>
                    </dl>
                    {section.error ? <p className="bl-catalog-error-copy">{section.error}</p> : null}
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <footer className="bl-settings-footer">
          <span className="bl-catalog-footer-copy">
            Frontend-only PokeAPI download. Existing cached sections are kept if an update fails.
          </span>
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          {running ? (
            <button className="secondary-action" type="button" onClick={handleCancel}>
              Cancel
            </button>
          ) : null}
          <button className="primary-action" type="button" onClick={handleUpdate} disabled={running}>
            {running ? 'Updating…' : 'Update'}
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
