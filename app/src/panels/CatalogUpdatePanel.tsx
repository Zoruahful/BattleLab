import { useState } from 'react'
import { fakeCatalogUpdateSnapshot } from '../data'
import type { CatalogUpdateCategoryStatus, CatalogUpdateSnapshot, CatalogUpdateStatus } from '../types'
import '../styles/settings-catalog-panels.css'

export type CatalogUpdatePanelProps = {
  open?: boolean
  snapshot?: CatalogUpdateSnapshot
  onClose?: () => void
}

const statusLabels: Record<CatalogUpdateStatus, string> = {
  ready: 'Ready',
  checking: 'Checking',
  updateAvailable: 'Update available',
  upToDate: 'Up to date',
  error: 'Needs attention',
}

const categoryStatusLabels: Record<CatalogUpdateCategoryStatus, string> = {
  current: 'Current',
  stale: 'Stale',
  queued: 'Queued',
  needsReview: 'Needs review',
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
  const averageProgress = Math.round(
    draftSnapshot.categories.reduce((total, category) => total + category.progressPercent, 0) /
      draftSnapshot.categories.length,
  )

  const handleCheck = () => {
    setDraftSnapshot((current) => ({
      ...current,
      status: current.status === 'checking' ? 'updateAvailable' : 'checking',
      lastCheckedAt: new Date().toISOString(),
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
        progressPercent: category.status === 'needsReview' ? category.progressPercent : 100,
      })),
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
            x
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
              <span>Progress</span>
              <strong>{averageProgress}%</strong>
            </div>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Source candidate</h3>
              <span>{draftSnapshot.source.kind}</span>
            </div>

            <div className="bl-catalog-source-card">
              <strong>{draftSnapshot.source.name}</strong>
              <p>
                PokeAPI can enrich display names, descriptions, picker data, and visual metadata
                candidates. The UI should read local catalog artifacts after a future update step.
              </p>
              <dl>
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
              {draftSnapshot.categories.map((category) => (
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
                    <span style={{ width: `${category.progressPercent}%` }} />
                  </div>
                  <div className="bl-catalog-meta">
                    <span>{formatCount(category.recordCount)} records</span>
                    <span>{category.progressPercent}% prepared</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="bl-settings-note">
            <strong>Offline-first boundary</strong>
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

export default CatalogUpdatePanel
