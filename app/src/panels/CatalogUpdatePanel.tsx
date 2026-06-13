import { useState } from 'react'
import { fakeCatalogUpdateSnapshot } from '../data'
import type { CatalogUpdateCategoryStatus, CatalogUpdateSnapshot } from '../types'
import '../styles/settings-catalog-panels.css'

export type CatalogUpdatePanelProps = {
  open?: boolean
  snapshot?: CatalogUpdateSnapshot
  onClose?: () => void
}

const categoryStatusLabels: Record<CatalogUpdateCategoryStatus, string> = {
  current: 'Current',
  stale: 'Stale',
  needsReview: 'Review required',
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
            : 'Checking bundled seed metadata and validator output. No network sync is running.',
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
            <p>Download progress for Pokemon, move, ability, item, type, nature, and picker data.</p>
          </div>
          <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="bl-settings-body">
          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Catalog areas</h3>
              <span>Local preview</span>
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
        </div>

        <footer className="bl-settings-footer">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action" type="button" onClick={handleCheck}>
            Check status
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
