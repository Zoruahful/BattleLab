import { useEffect, useState } from 'react'
import {
  createSampleBattleLabCatalogBundleWithHashes,
  fakeCatalogUpdateSnapshot,
  validateBattleLabCatalogBundleHashes,
} from '../data'
import type {
  CatalogBundleFixtureStatus,
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
  ready: 'Local seed ready',
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
  idle: 'Preview idle',
  checking: 'Checking local seed',
  downloading: 'Downloading',
  applying: 'Applying',
  complete: 'Preview complete',
  error: 'Needs attention',
}

const bundleStatusLabels: Record<CatalogBundleFixtureStatus['status'], string> = {
  checking: 'Checking',
  loaded: 'Loaded',
  invalid: 'Needs review',
  unavailable: 'Unavailable',
}

const bundleStatusClassNames: Record<CatalogBundleFixtureStatus['status'], string> = {
  checking: 'is-stale',
  loaded: 'is-current',
  invalid: 'is-needsReview',
  unavailable: 'is-needsReview',
}

const initialBundleFixtureStatus: CatalogBundleFixtureStatus = {
  status: 'checking',
  isValid: false,
  fileExtension: 'unknown',
  readOnly: false,
  signatureStatus: 'unknown',
  hashAlgorithm: 'unknown',
  canonicalization: 'pending',
  errorCount: 0,
  warningCount: 0,
  issues: [],
  message: 'Checking bundled .bl catalog fixture hashes. No file import or live sync is running.',
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
  const [bundleFixtureStatus, setBundleFixtureStatus] =
    useState<CatalogBundleFixtureStatus>(initialBundleFixtureStatus)
  const totalRecords = draftSnapshot.categories.reduce((total, category) => total + category.recordCount, 0)
  const sourceCandidate = draftSnapshot.sources[0]
  const integrityLabel = draftSnapshot.seedIntegrity.isValid ? 'Valid' : 'Needs review'
  const bundleLabel = bundleStatusLabels[bundleFixtureStatus.status]
  const averageProgress = Math.round(
    draftSnapshot.progress.categories.reduce((total, category) => total + category.progressPercent, 0) /
      draftSnapshot.progress.categories.length,
  )

  useEffect(() => {
    if (!open) return undefined

    let isMounted = true

    const checkBundledFixture = async () => {
      try {
        const bundle = await createSampleBattleLabCatalogBundleWithHashes()
        const result = await validateBattleLabCatalogBundleHashes(bundle)
        const errorCount = result.issues.filter((issue) => issue.severity === 'error').length
        const warningCount = result.issues.filter((issue) => issue.severity === 'warning').length

        if (!isMounted) return

        setBundleFixtureStatus({
          status: result.isValid ? 'loaded' : 'invalid',
          isValid: result.isValid,
          fileExtension: bundle.fileExtension,
          readOnly: bundle.readOnly,
          signatureStatus: bundle.manifest.signature.status,
          hashAlgorithm: bundle.manifest.bundleHash.algorithm,
          canonicalization: bundle.manifest.bundleHash.canonicalization ?? 'unknown',
          errorCount,
          warningCount,
          issues: result.issues,
          message: result.isValid
            ? 'Bundled read-only .bl catalog fixture validated with deterministic local hashes.'
            : 'Bundled .bl catalog fixture validation found issues. No live sync or loader ran.',
        })
      } catch (error) {
        if (!isMounted) return

        setBundleFixtureStatus({
          status: 'unavailable',
          isValid: false,
          fileExtension: 'unknown',
          readOnly: false,
          signatureStatus: 'unknown',
          hashAlgorithm: 'unknown',
          canonicalization: 'unavailable',
          errorCount: 1,
          warningCount: 0,
          issues: [],
          message:
            error instanceof Error
              ? error.message
              : 'Bundled .bl catalog fixture hash validation is unavailable in this environment.',
        })
      }
    }

    void checkBundledFixture()

    return () => {
      isMounted = false
    }
  }, [open])

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

  const handlePreviewPrepared = () => {
    setDraftSnapshot((current) => ({
      ...current,
      status: current.seedIntegrity.isValid ? 'ready' : 'error',
      lastUpdatedAt: new Date().toISOString(),
      categories: current.categories.map((category) => ({
        ...category,
        status: category.status === 'needsReview' ? 'needsReview' : 'current',
      })),
      progress: {
        ...current.progress,
        status: 'complete',
        activeSourceIds: [],
        message: 'Local preview marked prepared. Asset licensing review remains separate.',
        categories: current.progress.categories.map((category) => ({
          ...category,
          status: category.id === 'picker-assets' || category.id === 'visual-assets' ? 'blocked' : 'complete',
          progressPercent:
            category.id === 'picker-assets' || category.id === 'visual-assets' ? category.progressPercent : 100,
        })),
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
            <h2 id="catalog-update-title">Local catalog status</h2>
            <p>Pokemon, move, ability, item, type, nature, and picker data readiness.</p>
          </div>
          <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="bl-settings-body">
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
              <span>Seed check</span>
              <strong>{integrityLabel}</strong>
            </div>
            <div>
              <span>.bl fixture</span>
              <strong>{bundleLabel}</strong>
            </div>
            <div>
              <span>Preview</span>
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
                Catalog data enriches Pokemon names, move descriptions, and dropdown pickers. This view reads
                bundled seed metadata only; no live internet or runtime sync is running.
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
              <h3>Local seed integrity</h3>
              <span>{integrityLabel}</span>
            </div>

            <div className="bl-catalog-source-card">
              <strong>
                {draftSnapshot.seedIntegrity.isValid
                  ? 'Seed validator passed'
                  : 'Seed validator found issues'}
              </strong>
              <p>
                validateLocalCatalogSeedIntegrity checks record counts, catalog keys, source references,
                asset references, search index links, and minimum local coverage.
              </p>
              <dl>
                <div>
                  <dt>Errors</dt>
                  <dd>{formatCount(draftSnapshot.seedIntegrity.errorCount)}</dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd>{formatCount(draftSnapshot.seedIntegrity.warningCount)}</dd>
                </div>
                <div>
                  <dt>Issues</dt>
                  <dd>{formatCount(draftSnapshot.seedIntegrity.issues.length)}</dd>
                </div>
              </dl>
              {draftSnapshot.seedIntegrity.issues.length > 0 ? (
                <div className="bl-catalog-warning-list" aria-label="Local seed integrity issues">
                  {draftSnapshot.seedIntegrity.issues.map((issue) => (
                    <p key={`${issue.code}-${issue.path}`}>
                      <span>{issue.severity}</span> {issue.path}: {issue.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Bundled .bl fixture</h3>
              <span className={`bl-catalog-status ${bundleStatusClassNames[bundleFixtureStatus.status]}`}>
                {bundleLabel}
              </span>
            </div>

            <div className="bl-catalog-source-card">
              <strong>
                {bundleFixtureStatus.isValid
                  ? 'Read-only catalog bundle hashes passed'
                  : 'Read-only catalog bundle hash check'}
              </strong>
              <p>
                This is bundled local fixture validation only. It does not load a file, fetch data,
                run catalog sync, or change the Pokemon Showdown legality and simulation boundary.
              </p>
              <dl>
                <div>
                  <dt>Extension</dt>
                  <dd>{bundleFixtureStatus.fileExtension}</dd>
                </div>
                <div>
                  <dt>Read only</dt>
                  <dd>{bundleFixtureStatus.readOnly ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Signature</dt>
                  <dd>{bundleFixtureStatus.signatureStatus}</dd>
                </div>
                <div>
                  <dt>Hash</dt>
                  <dd>{bundleFixtureStatus.hashAlgorithm}</dd>
                </div>
                <div>
                  <dt>Canonicalization</dt>
                  <dd>{bundleFixtureStatus.canonicalization}</dd>
                </div>
                <div>
                  <dt>Issues</dt>
                  <dd>{formatCount(bundleFixtureStatus.issues.length)}</dd>
                </div>
              </dl>
              <p>{bundleFixtureStatus.message}</p>
              <dl>
                <div>
                  <dt>Errors</dt>
                  <dd>{formatCount(bundleFixtureStatus.errorCount)}</dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd>{formatCount(bundleFixtureStatus.warningCount)}</dd>
                </div>
              </dl>
              {bundleFixtureStatus.issues.length > 0 ? (
                <div className="bl-catalog-warning-list" aria-label="Bundled .bl fixture issues">
                  {bundleFixtureStatus.issues.map((issue) => (
                    <p key={`${issue.code}-${issue.path}-${issue.section ?? 'bundle'}`}>
                      <span>{issue.severity}</span> {issue.path}: {issue.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

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

        <footer className="bl-settings-footer">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action" type="button" onClick={handleCheck}>
            Check status
          </button>
          <button className="primary-action" type="button" onClick={handlePreviewPrepared}>
            Preview prepared
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
