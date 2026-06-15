import type {
  CatalogStorageAdapterDescriptor,
  CatalogStorageBoundaryIssue,
  CatalogStorageBoundaryReadModel,
} from '../types/catalogStorage'
import {
  catalogStorageBoundarySections,
  createCatalogStorageBoundaryReadModel,
  currentIndexedDbCatalogStorageAdapter,
  futurePackagedCatalogStorageAdapter,
  readonlyBundleCatalogStorageAdapter,
  sampleCatalogStorageBoundaryReadModel,
} from './catalogStorageBoundary'
import type { CatalogUpdateGeneratedCatalogCache, CatalogUpdateSectionCacheMetadata } from './catalogUpdateCache'

export type CatalogStorageBoundaryValidationSeverity = 'error' | 'warning'

export type CatalogStorageBoundaryValidationCode =
  | 'adapter-boundary-invalid'
  | 'safety-flag-open'
  | 'fallback-invalid'
  | 'migration-invalid'
  | 'section-state-invalid'
  | 'authority-boundary-invalid'

export interface CatalogStorageBoundaryValidationIssue {
  code: CatalogStorageBoundaryValidationCode
  severity: CatalogStorageBoundaryValidationSeverity
  path: string
  message: string
}

export interface CatalogStorageBoundaryValidationResult {
  isValid: boolean
  checkedModels: number
  issueCount: number
  warningCount: number
  errorCount: number
  issues: CatalogStorageBoundaryValidationIssue[]
}

function createIssue(
  code: CatalogStorageBoundaryValidationCode,
  severity: CatalogStorageBoundaryValidationSeverity,
  path: string,
  message: string,
): CatalogStorageBoundaryValidationIssue {
  return { code, severity, path, message }
}

function validateAdapter(
  adapter: CatalogStorageAdapterDescriptor,
  path: string,
  issues: CatalogStorageBoundaryValidationIssue[],
) {
  if (!adapter.schemaVersion) {
    issues.push(createIssue('adapter-boundary-invalid', 'error', `${path}.schemaVersion`, 'Adapter schema version is required.'))
  }

  if (adapter.disallowedCapabilities.includes('filesystem-writes') === false) {
    issues.push(
      createIssue('adapter-boundary-invalid', 'error', `${path}.disallowedCapabilities`, 'Filesystem writes must remain disallowed.'),
    )
  }

  if (adapter.disallowedCapabilities.includes('sqlite') === false) {
    issues.push(createIssue('adapter-boundary-invalid', 'error', `${path}.disallowedCapabilities`, 'SQLite must remain disallowed.'))
  }

  if (adapter.disallowedCapabilities.includes('electron') === false) {
    issues.push(createIssue('adapter-boundary-invalid', 'error', `${path}.disallowedCapabilities`, 'Electron must remain disallowed.'))
  }
}

function validateSafety(model: CatalogStorageBoundaryReadModel, issues: CatalogStorageBoundaryValidationIssue[]) {
  const expectedClosedFlags: Array<keyof CatalogStorageBoundaryReadModel['safety']> = [
    'packagedLocalAdapterImplemented',
    'sqliteImplemented',
    'electronImplemented',
    'filesystemWritesImplemented',
    'bundleWritingImplemented',
    'loaderExecutionImplemented',
    'storesUserTeams',
    'storesSettings',
    'storesReports',
    'storesRuntimeOutput',
  ]

  expectedClosedFlags.forEach((flag) => {
    if (model.safety[flag] !== false) {
      issues.push(createIssue('safety-flag-open', 'error', `safety.${flag}`, `${flag} must remain false.`))
    }
  })

  if (!model.safety.indexedDbCurrentAdapterPreserved) {
    issues.push(
      createIssue('safety-flag-open', 'error', 'safety.indexedDbCurrentAdapterPreserved', 'Current IndexedDB adapter must be preserved.'),
    )
  }

  if (!model.safety.pokeApiEnrichmentOnly) {
    issues.push(createIssue('authority-boundary-invalid', 'error', 'safety.pokeApiEnrichmentOnly', 'PokeAPI must remain enrichment-only.'))
  }

  if (!model.safety.showdownLegalityAuthority) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'safety.showdownLegalityAuthority',
        'Pokemon Showdown must remain legality and simulation source of truth.',
      ),
    )
  }
}

function validateFallback(model: CatalogStorageBoundaryReadModel, issues: CatalogStorageBoundaryValidationIssue[]) {
  if (!model.safeFallback.preserveCurrentGeneratedCatalog) {
    issues.push(
      createIssue(
        'fallback-invalid',
        'error',
        'safeFallback.preserveCurrentGeneratedCatalog',
        'Fallback must preserve current generated catalog.',
      ),
    )
  }

  if (model.health.status === 'malformed' && model.safeFallback.status !== 'block-and-keep-current') {
    issues.push(
      createIssue(
        'fallback-invalid',
        'error',
        'safeFallback.status',
        'Malformed cache with a generated catalog must block and keep current data.',
      ),
    )
  }

  if (!model.generatedCatalog.preserveUntilReplacementValidates) {
    issues.push(
      createIssue(
        'fallback-invalid',
        'error',
        'generatedCatalog.preserveUntilReplacementValidates',
        'Generated catalog must be preserved until replacement validates.',
      ),
    )
  }
}

function validateMigration(model: CatalogStorageBoundaryReadModel, issues: CatalogStorageBoundaryValidationIssue[]) {
  if (model.migrationPlan.destructive) {
    issues.push(createIssue('migration-invalid', 'error', 'migrationPlan.destructive', 'Migration plan must remain non-destructive.'))
  }

  if (!model.migrationPlan.preserveCurrentCatalogUntilSuccess) {
    issues.push(
      createIssue(
        'migration-invalid',
        'error',
        'migrationPlan.preserveCurrentCatalogUntilSuccess',
        'Migration must preserve current catalog until success.',
      ),
    )
  }

  if (model.bundleHandoff.bundleWritingImplemented) {
    issues.push(
      createIssue('migration-invalid', 'error', 'bundleHandoff.bundleWritingImplemented', '.bl bundle writing must remain unimplemented.'),
    )
  }
}

function validateSections(model: CatalogStorageBoundaryReadModel, issues: CatalogStorageBoundaryValidationIssue[]) {
  catalogStorageBoundarySections.forEach((section) => {
    const state = model.sections.find((candidate) => candidate.section === section)

    if (!state) {
      issues.push(createIssue('section-state-invalid', 'error', `sections.${section}`, 'Boundary section state is required.'))
      return
    }

    if (state.status === 'healthy' && (!state.hasListSignature || !state.hasCachedPayload || !state.hasGeneratedCatalogCoverage)) {
      issues.push(
        createIssue(
          'section-state-invalid',
          'error',
          `sections.${section}`,
          'Healthy sections must include a list signature, cached payload, and generated catalog coverage.',
        ),
      )
    }
  })
}

function validateBoundaryModel(model: CatalogStorageBoundaryReadModel) {
  const issues: CatalogStorageBoundaryValidationIssue[] = []

  validateAdapter(model.currentAdapter, 'currentAdapter', issues)
  validateAdapter(model.futurePackagedAdapter, 'futurePackagedAdapter', issues)
  validateAdapter(model.readonlyBundleAdapter, 'readonlyBundleAdapter', issues)
  validateSafety(model, issues)
  validateFallback(model, issues)
  validateMigration(model, issues)
  validateSections(model, issues)

  return issues
}

const sampleMetadata = (section: CatalogUpdateSectionCacheMetadata['section'], recordCount: number): CatalogUpdateSectionCacheMetadata => ({
  section,
  endpoint:
    section === 'pokemon'
      ? 'pokemon'
      : section === 'moves'
        ? 'move'
        : section === 'abilities'
          ? 'ability'
          : section === 'natures'
            ? 'nature'
            : section.slice(0, -1),
  source: 'pokeapi',
  sourceBaseUrl: 'https://pokeapi.co/api/v2',
  listUrl: `https://pokeapi.co/api/v2/${section}?limit=${recordCount}&offset=0`,
  listCount: recordCount,
  listSignature: `sample-${section}-signature`,
  recordCount,
  payloadVersion: 1,
  lastCheckedAt: '2026-06-15T00:00:00.000Z',
  lastUpdatedAt: '2026-06-15T00:00:00.000Z',
  status: 'current',
  message: 'Sample cached section is current.',
})

const sampleGeneratedCatalog = (): CatalogUpdateGeneratedCatalogCache => ({
  id: 'latest',
  catalog: {
    manifest: {
      schemaVersion: 'sample',
      generatedAt: '2026-06-15T00:00:00.000Z',
      sources: [],
      recordCounts: {
        pokemon: 1,
        moves: 1,
        abilities: 1,
        items: 1,
        types: 1,
        natures: 1,
        assets: 0,
        searchIndexEntries: 0,
      },
      assetPolicy: {
        allowRemoteUrls: false,
        bundledAssetsPreferred: true,
        licenseReviewRequired: true,
      },
      warnings: [],
    },
    pokemon: [],
    moves: [],
    abilities: [],
    items: [],
    types: [],
    natures: [],
    assets: [],
    searchIndex: [],
  },
  pokemonMoveIdsByShowdownId: {},
  fetchedAt: '2026-06-15T00:00:00.000Z',
  sourceVersion: 'sample-source-version',
  payloadVersion: 1,
})

const healthyModel = createCatalogStorageBoundaryReadModel({
  checkedAt: '2026-06-15T00:00:00.000Z',
  metadata: catalogStorageBoundarySections.map((section) => sampleMetadata(section, section === 'types' ? 18 : 25)),
  generatedCatalog: sampleGeneratedCatalog(),
  payloadSections: [...catalogStorageBoundarySections],
})

const malformedModel = createCatalogStorageBoundaryReadModel({
  checkedAt: '2026-06-15T00:00:00.000Z',
  metadata: [
    {
      ...sampleMetadata('pokemon', 0),
      listSignature: '',
      status: 'failed',
      message: 'Malformed sample metadata.',
    },
  ],
  generatedCatalog: sampleGeneratedCatalog(),
  payloadSections: [],
})

const unavailableModel = sampleCatalogStorageBoundaryReadModel

export function validateCatalogStorageBoundary(): CatalogStorageBoundaryValidationResult {
  const modelIssues = [healthyModel, malformedModel, unavailableModel].flatMap(validateBoundaryModel)
  const bridgeIssues: CatalogStorageBoundaryValidationIssue[] = []

  if (!currentIndexedDbCatalogStorageAdapter.current || !currentIndexedDbCatalogStorageAdapter.implemented) {
    bridgeIssues.push(
      createIssue(
        'adapter-boundary-invalid',
        'error',
        'currentIndexedDbCatalogStorageAdapter',
        'The browser IndexedDB adapter must remain the implemented current adapter.',
      ),
    )
  }

  if (futurePackagedCatalogStorageAdapter.implemented || readonlyBundleCatalogStorageAdapter.implemented) {
    bridgeIssues.push(
      createIssue(
        'adapter-boundary-invalid',
        'error',
        'futureAdapters',
        'Future packaged and read-only bundle adapters must remain contract-only.',
      ),
    )
  }

  const allIssues = [...modelIssues, ...bridgeIssues]
  const errorCount = allIssues.filter((issue) => issue.severity === 'error').length
  const warningCount = allIssues.filter((issue) => issue.severity === 'warning').length

  return {
    isValid: errorCount === 0,
    checkedModels: 3,
    issueCount: allIssues.length,
    warningCount,
    errorCount,
    issues: allIssues,
  }
}

export const sampleCatalogStorageBoundaryValidation = validateCatalogStorageBoundary()

export type CatalogStorageBoundaryValidationSourceIssue = CatalogStorageBoundaryIssue
