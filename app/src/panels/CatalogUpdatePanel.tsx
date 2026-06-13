import { useState } from 'react'
import { fakeCatalogUpdateSnapshot } from '../data'
import type {
  CatalogStableStatus,
  CatalogUpdateCategoryStatus,
  CatalogUpdateProgressStatus,
  CatalogUpdateSnapshot,
} from '../types'
import '../styles/settings-catalog-panels.css'

export type CatalogUpdatePanelProps = {
  open?: boolean
  snapshot?: CatalogUpdateSnapshot
  onClose?: () => void
}

const statusLabels: Record<CatalogStableStatus, string> = {
  ready: 'Ready',
  updateAvailable: 'Update available',
  upToDate: 'Up to date',
  error: 'Needs attention',
}

const categoryStatusLabels: Record<CatalogUpdateCategoryStatus, string> = {
  current: 'Current',
  stale: 'Stale',
  needsReview: 'Review required',
}

const progressStatusLabels: Record<CatalogUpdateProgressStatus, string> = {
  idle: 'Idle',
  checking: 'Checking',
  downloading: 'Downloading',
  applying: 'Applying',
  complete: 'Complete',
  error: 'Needs attention',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

export function CatalogUpdatePanel({
  open = true,
  snapshot = fakeCatalogUpdateSnapshot,
  onClose,
}: CatalogUpdatePanelProps) {
  const [draftSnapshot, setDraftSnapshot] = useState<CatalogUpdateSnapshot>(snapshot)
  const totalRecords = draftSnapshot.categories.reduce((total, category) => total + category.recordCount, 0)
  const sourceCandidate = draftSnapshot.sources[0]
  const averageProgress = Math.round(
    draftSnapshot.progress.categories.reduce((total, category) => total + category.progressPercent, 0) /
      draftSnapshot.progress.categories.length,
  )

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
            ? 'Catalog update progress is idle.'
            : 'Checking local catalog source metadata. No network sync is running.',
      },
    }))
  }

  const handleUseFakeUpdate = () => {
    setDraftSnapshot((current) => ({
      ...current,
      status: 'upToDate',
      lastUpdatedAt: new Date().toISOString(),
      categories: current.categories.map((category) => ({
        ...category,
        status: category.status === 'needsReview' ? 'needsReview' : 'current',
      })),
      progress: {
        ...current.progress,
        status: 'complete',
        activeSourceIds: [],
        message: 'Fake local catalog update completed. Asset licensing review remains separate.',
        categories: current.progress.categories.map((category) => ({
          ...category,
          status: category.id === 'assets' ? 'blocked' : 'complete',
          progressPercent: category.id === 'assets' ? category.progressPercent : 100,
        })),
      },
    }))
  }

  return (
    <aside
      className={`bl-catalog-panel side-panel wide ${open ? 'is-open open' : ''}`}
      aria-labelledby="catalog-update-title"
      aria-hidden={!open}
      data-open={open}
    >
      <div className="bl-settings-shell">
        <header className="bl-settings-header ph">
          <div>
            <span className="eyebrow">Catalog Update</span>
            <h2 id="catalog-update-title">Local catalog status</h2>
            <p>Pokemon, move, ability, item, type, nature, and picker data readiness.</p>
          </div>
          <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="bl-settings-body pb">
          <section className="bl-catalog-hero" aria-label="Catalog update summary">
            <div>
              <span>Status</span>
              <strong>{statusLabels[draftSnapshot.status]}</strong>
            </div>
            <div>
              <span>Records</span>
              <strong>{formatCount(totalRecords)}</strong>
            </div>
            <div>
              <span>Avg. progress</span>
              <strong>{averageProgress}%</strong>
            </div>
            <div>
              <span>Update</span>
              <strong>{progressStatusLabels[draftSnapshot.progress.status]}</strong>
            </div>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Source candidate</h3>
              <span>{sourceCandidate?.kind ?? 'local'}</span>
            </div>

            <div className="bl-catalog-source-card">
              <strong>{sourceCandidate?.name ?? 'Local catalog source metadata'}</strong>
              <p>
                Catalog data enriches Pokemon names, move descriptions, and dropdown pickers. After an
                update, the app reads from a local cached copy — no live internet required during normal use.
              </p>
              <dl>
                <div>
                  <dt>Sources</dt>
                  <dd>{draftSnapshot.sources.map((source) => source.name).join(', ')}</dd>
                </div>
                <div>
                  <dt>Schema</dt>
                  <dd>{draftSnapshot.schemaVersion}</dd>
                </div>
                <div>
                  <dt>Last checked</dt>
                  <dd>{formatDate(draftSnapshot.lastCheckedAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDate(draftSnapshot.lastUpdatedAt)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="bl-catalog-authority-line" aria-label="Catalog authority boundary">
            Battle legality and simulation results come from Pokemon Showdown, not from catalog data.
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Catalog areas</h3>
              <span>Fake progress</span>
            </div>

            <div className="bl-catalog-category-list">
              {draftSnapshot.categories.map((category) => {
                const progress = draftSnapshot.progress.categories.find((item) => item.id === category.id)
                const progressPercent = progress?.progressPercent ?? 0

                return (
                <article className="bl-catalog-category" key={category.id}>
                  <div className="bl-catalog-category-topline">
                    <div>
                      <strong>{category.label}</strong>
                      <p>{category.description}</p>
                    </div>
                    <span className={`bl-catalog-status is-${category.status}`}>
                      {categoryStatusLabels[category.status]}
                    </span>
                  </div>
                  <div className="bl-catalog-meter" aria-label={`${category.label} progress`}>
                    <span style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="bl-catalog-meta">
                    <span>{formatCount(category.recordCount)} records</span>
                    <span>
                      {progressPercent}% prepared
                      {progress ? ` - ${progress.status}` : ''}
                    </span>
                  </div>
                </article>
                )
              })}
            </div>
          </section>

          <section className="bl-settings-note">
            <strong>Works offline</strong>
            <p>
              This panel does not fetch live data. Future catalog updates should write a validated local
              cache, keep the previous good cache, and let team editing work offline.
            </p>
          </section>

          <section className="bl-catalog-warning-list" aria-label="Catalog update warnings">
            {draftSnapshot.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </section>
        </div>

        <footer className="bl-settings-footer pf">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action" type="button" onClick={handleCheck}>
            Check status
          </button>
          <button className="primary-action" type="button" onClick={handleUseFakeUpdate}>
            Update catalog
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
