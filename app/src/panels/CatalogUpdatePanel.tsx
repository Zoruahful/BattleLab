import { useEffect, useRef, useState } from 'react'
import {
  runCatalogBulkIngestion,
  type CatalogBulkIngestionProgress,
  type CatalogBulkIngestionResult,
  type CatalogBulkIngestionSection,
  type CatalogBulkIngestionSectionSummary,
} from '../data/catalogBulkIngestion'
import type { CatalogSourceFetchIssue } from '../types/catalogFetch'
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

type CatalogPanelStatus = 'idle' | 'checking' | 'fetching' | 'validating' | 'complete' | 'warning' | 'failed' | 'cancelled'
type CatalogPanelSectionStatus = 'idle' | 'checking' | 'fetching' | 'complete' | 'warning' | 'failed' | 'cancelled'

interface CatalogPanelSection {
  id: CatalogBulkIngestionSection
  label: string
  description: string
  status: CatalogPanelSectionStatus
  downloaded: number
  total: number
  progressPercent: number
  lastCheckedAt?: string
  lastUpdatedAt?: string
  message: string
  error?: string
}

interface CatalogPanelState {
  status: CatalogPanelStatus
  startedAt?: string
  finishedAt?: string
  aggregateProgressPercent: number
  message: string
  warningCount: number
  errorCount: number
  issues: CatalogSourceFetchIssue[]
  sections: CatalogPanelSection[]
}

const catalogSections: Array<Pick<CatalogPanelSection, 'id' | 'label' | 'description'>> = [
  {
    id: 'pokemon',
    label: 'Pokemon',
    description: 'Names, base resources, forms, and display metadata candidates.',
  },
  {
    id: 'moves',
    label: 'Moves',
    description: 'Move names, descriptions, type, category, and picker metadata candidates.',
  },
  {
    id: 'abilities',
    label: 'Abilities',
    description: 'Ability names, descriptions, and picker metadata candidates.',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Held item names, descriptions, and icon metadata candidates.',
  },
  {
    id: 'types',
    label: 'Types',
    description: 'The 18 standard battle-facing type names and display metadata candidates.',
  },
  {
    id: 'natures',
    label: 'Natures',
    description: 'Nature names and stat-modifier metadata candidates.',
  },
]

const runStatusLabels: Record<CatalogPanelStatus, string> = {
  idle: 'Ready to update',
  checking: 'Checking catalog sections…',
  fetching: 'Downloading catalog data…',
  validating: 'Checking downloaded data…',
  complete: 'Catalog data prepared',
  warning: 'Prepared with warnings',
  failed: 'Update failed safely',
  cancelled: 'Update cancelled',
}

const sectionStatusLabels: Record<CatalogPanelSectionStatus, string> = {
  idle: 'Not checked',
  checking: 'Checking',
  fetching: 'Downloading',
  complete: 'Prepared',
  warning: 'Warning',
  failed: 'Failed safely',
  cancelled: 'Cancelled',
}

function createInitialCatalogPanelState(): CatalogPanelState {
  return {
    status: 'idle',
    aggregateProgressPercent: 0,
    message: 'Ready to check PokeAPI catalog sections. Downloads start only when you click Update.',
    warningCount: 0,
    errorCount: 0,
    issues: [],
    sections: catalogSections.map((section) => ({
      ...section,
      status: 'idle',
      downloaded: 0,
      total: 0,
      progressPercent: 0,
      message: `No ${section.label.toLowerCase()} records checked yet.`,
    })),
  }
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

function getProgressState(status: CatalogPanelStatus | CatalogPanelSectionStatus): CatalogProgressDisplayState {
  if (status === 'checking') return 'checking'
  if (status === 'fetching') return 'fetching'
  if (status === 'complete') return 'complete'
  if (status === 'warning') return 'warning'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'preview'
}

function getSectionRecordCopy(section: CatalogPanelSection) {
  if (section.total <= 0) return 'No records checked'
  return `${formatCount(section.downloaded)} / ${formatCount(section.total)} records`
}

function isRunning(status: CatalogPanelStatus) {
  return status === 'checking' || status === 'fetching' || status === 'validating'
}

function getPanelStatusForProgress(progress: CatalogBulkIngestionProgress): CatalogPanelStatus {
  if (progress.status === 'fetching-lists') return 'checking'
  if (progress.status === 'fetching-details') return 'fetching'
  if (
    progress.status === 'validating-source' ||
    progress.status === 'generating-catalog' ||
    progress.status === 'validating-catalog'
  ) {
    return 'validating'
  }
  if (progress.status === 'complete') return 'complete'
  if (progress.status === 'failed') return 'failed'
  if (progress.status === 'cancelled') return 'cancelled'
  return 'idle'
}

function getValidationStageProgress(progress: CatalogBulkIngestionProgress) {
  if (progress.status === 'validating-source') return 92
  if (progress.status === 'generating-catalog') return 96
  if (progress.status === 'validating-catalog') return 98
  return progress.progressPercent
}

function getProgressMessage(progress: CatalogBulkIngestionProgress) {
  if (progress.status === 'fetching-lists') return 'Checking PokeAPI section resource lists.'
  if (progress.status === 'fetching-details') return 'Downloading selected catalog records from PokeAPI.'
  if (progress.status === 'validating-source') return 'Checking downloaded source data before use.'
  if (progress.status === 'generating-catalog') return 'Preparing BattleLab catalog records from enrichment data.'
  if (progress.status === 'validating-catalog') return 'Checking generated catalog records.'
  if (progress.status === 'complete') return 'Catalog data prepared. No legality or simulation rules were changed.'
  if (progress.status === 'cancelled') return 'Update cancelled. Existing catalog data was not overwritten.'
  if (progress.status === 'failed') return 'Update failed safely. Existing catalog data was not overwritten.'
  return progress.message
}

function applyProgressToSections(
  sections: CatalogPanelSection[],
  progress: CatalogBulkIngestionProgress,
): CatalogPanelSection[] {
  if (progress.status === 'validating-source' || progress.status === 'generating-catalog' || progress.status === 'validating-catalog') {
    return sections.map((section) =>
      section.status === 'fetching' && section.progressPercent >= 100
        ? { ...section, status: 'complete' as const, message: 'Downloaded. Awaiting catalog validation.' }
        : section,
    )
  }

  if (!progress.section) return sections

  return sections.map((section) => {
    if (section.id !== progress.section) return section

    if (progress.status === 'fetching-lists') {
      return {
        ...section,
        status: 'checking' as const,
        lastCheckedAt: new Date().toISOString(),
        message: 'Checking PokeAPI resource list.',
      }
    }

    if (progress.status === 'fetching-details') {
      const total = progress.sectionTotalRequests ?? section.total
      const downloaded = progress.sectionCompletedRequests ?? section.downloaded

      return {
        ...section,
        status: 'fetching' as const,
        downloaded,
        total,
        progressPercent: progress.sectionProgressPercent ?? progress.progressPercent,
        lastCheckedAt: section.lastCheckedAt ?? new Date().toISOString(),
        message: progress.message,
      }
    }

    return section
  })
}

function summarizeIssueCounts(issues: CatalogSourceFetchIssue[]) {
  return {
    warningCount: issues.filter((issue) => issue.severity === 'warning' || issue.severity === 'info').length,
    errorCount: issues.filter((issue) => issue.severity === 'error').length,
  }
}

function getSummaryForSection(result: CatalogBulkIngestionResult, sectionId: CatalogBulkIngestionSection) {
  return result.sectionSummaries.find(
    (summary): summary is CatalogBulkIngestionSectionSummary & { section: CatalogBulkIngestionSection } =>
      summary.section === sectionId,
  )
}

function applyResultToSections(
  sections: CatalogPanelSection[],
  result: CatalogBulkIngestionResult,
  finishedAt: string,
): CatalogPanelSection[] {
  if (result.status === 'cancelled') {
    return sections.map((section) =>
      section.status === 'checking' || section.status === 'fetching'
        ? {
            ...section,
            status: 'cancelled' as const,
            message: 'Cancelled. Existing catalog data was not overwritten.',
          }
        : section,
    )
  }

  if (result.status === 'failed') {
    return sections.map((section) =>
      section.status === 'checking' || section.status === 'fetching'
        ? {
            ...section,
            status: 'failed' as const,
            message: 'Failed safely. Existing catalog data was not overwritten.',
            error: result.issues[0]?.message,
          }
        : section,
    )
  }

  return sections.map((section) => {
    const summary = getSummaryForSection(result, section.id)
    if (!summary) return section

    const hasRecordWarning = summary.generatedCount < summary.selectedCount

    return {
      ...section,
      status: hasRecordWarning ? 'warning' as const : 'complete' as const,
      downloaded: summary.generatedCount,
      total: summary.selectedCount,
      progressPercent: 100,
      lastUpdatedAt: finishedAt,
      message: hasRecordWarning
        ? `${formatCount(summary.generatedCount)} generated from ${formatCount(summary.selectedCount)} fetched records.`
        : `${formatCount(summary.generatedCount)} catalog records prepared.`,
    }
  })
}

function getPanelStatusForResult(result: CatalogBulkIngestionResult, hasWarnings: boolean): CatalogPanelStatus {
  if (result.status === 'complete') return hasWarnings ? 'warning' : 'complete'
  if (result.status === 'cancelled') return 'cancelled'
  return 'failed'
}

function applyProgress(current: CatalogPanelState, progress: CatalogBulkIngestionProgress): CatalogPanelState {
  const nextStatus = getPanelStatusForProgress(progress)

  return {
    ...current,
    status: nextStatus,
    aggregateProgressPercent: getValidationStageProgress(progress),
    message: getProgressMessage(progress),
    sections: applyProgressToSections(current.sections, progress),
  }
}

function applyResult(current: CatalogPanelState, result: CatalogBulkIngestionResult): CatalogPanelState {
  const finishedAt = new Date().toISOString()
  const { warningCount, errorCount } = summarizeIssueCounts(result.issues)
  const hasWarnings = warningCount > 0 || result.sectionSummaries.some((summary) => summary.generatedCount < summary.selectedCount)
  const status = getPanelStatusForResult(result, hasWarnings)

  return {
    ...current,
    status,
    finishedAt,
    aggregateProgressPercent: result.status === 'complete' ? 100 : current.aggregateProgressPercent,
    message:
      result.status === 'complete'
        ? 'Catalog enrichment data prepared. Pokemon Showdown remains the source of truth for legality and simulation.'
        : getProgressMessage(result.progress[result.progress.length - 1]),
    warningCount,
    errorCount,
    issues: result.issues,
    sections: applyResultToSections(current.sections, result, finishedAt),
  }
}

export function CatalogUpdatePanel({ open = true, onClose }: CatalogUpdatePanelProps) {
  const [downloadState, setDownloadState] = useState<CatalogPanelState>(() => createInitialCatalogPanelState())
  const [helpOpen, setHelpOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const running = isRunning(downloadState.status)
  const panelProgressState = getProgressState(downloadState.status)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const handleUpdate = async () => {
    if (abortRef.current || running) return

    const controller = new AbortController()
    const startedAt = new Date().toISOString()
    abortRef.current = controller
    setDownloadState({
      ...createInitialCatalogPanelState(),
      status: 'checking',
      startedAt,
      message: 'Checking PokeAPI catalog sections.',
    })

    try {
      const result = await runCatalogBulkIngestion({
        mode: 'bounded',
        signal: controller.signal,
        onProgress: (progress) => {
          if (mountedRef.current) {
            setDownloadState((current) => applyProgress(current, progress))
          }
        },
      })

      if (mountedRef.current) {
        setDownloadState((current) => applyResult(current, result))
      }
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
                remains the source of truth for battle legality and simulation. Sprite metadata stays
                candidate-review-gated. Downloads start only when you click Update.
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
              <span>Bulk ingestion</span>
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
                        <dd>{formatTimestamp(section.lastCheckedAt ?? downloadState.startedAt)}</dd>
                      </div>
                      <div>
                        <dt>Last completed</dt>
                        <dd>{formatTimestamp(section.lastUpdatedAt)}</dd>
                      </div>
                    </dl>
                    {section.error ? <p className="bl-catalog-error-copy">{section.error}</p> : null}
                  </article>
                )
              })}
            </div>

            {downloadState.issues.length > 0 ? (
              <div className="bl-catalog-warning-list" aria-label="Catalog update warnings and errors">
                <p>
                  <strong>{downloadState.errorCount}</strong> errors · <strong>{downloadState.warningCount}</strong>{' '}
                  warnings
                </p>
                {downloadState.issues.slice(0, 3).map((issue) => (
                  <p key={`${issue.code}-${issue.path ?? issue.resourceId ?? issue.message}`}>
                    <span>{issue.severity}</span> {issue.message}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="bl-settings-footer">
          <span className="bl-catalog-footer-copy">
            Frontend-only PokeAPI ingestion. Data is enrichment-only and failed runs do not overwrite existing catalog data.
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
