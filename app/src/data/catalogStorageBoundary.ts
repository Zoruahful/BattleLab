import type { CatalogSourceMetadata } from '../types/catalog'
import type { BattleLabCatalogBundleSectionName } from '../types/catalogBundle'
import type {
  CatalogStorageAdapterDescriptor,
  CatalogStorageBoundaryIssue,
  CatalogStorageBoundaryReadModel,
  CatalogStorageBoundarySectionState,
  CatalogStorageCacheHealthReport,
  CatalogStorageContractVersion,
  CatalogStorageMigrationPlan,
  CatalogStorageSafeFallback,
  CatalogStorageSchemaVersion,
  CatalogStorageSectionManifest,
  CatalogStorageSourceSignature,
} from '../types/catalogStorage'
import {
  readCatalogUpdateCacheMetadata,
  readCatalogUpdateGeneratedCatalogCache,
  readCatalogUpdateSectionPayload,
  type CatalogUpdateDownloadSectionId,
  type CatalogUpdateGeneratedCatalogCache,
  type CatalogUpdateSectionCacheMetadata,
} from './catalogUpdateCache'

export const catalogStorageBoundaryContractVersion: CatalogStorageContractVersion = 'phase3-catalog-storage-v1'
export const catalogStorageBoundarySchemaVersion: CatalogStorageSchemaVersion = 'battlelab-catalog-storage-schema-v1'

export const catalogStorageBoundarySections: CatalogUpdateDownloadSectionId[] = [
  'pokemon',
  'moves',
  'abilities',
  'items',
  'types',
  'natures',
]

const catalogStorageBoundaryGeneratedSections: BattleLabCatalogBundleSectionName[] = ['assets', 'searchIndex']

const currentIndexedDbCapabilities: CatalogStorageAdapterDescriptor['capabilities'] = [
  'read-generated-catalog',
  'write-generated-catalog-after-validation',
  'read-source-snapshots',
  'write-source-snapshots-after-validation',
  'read-section-metadata',
  'write-section-metadata',
  'read-list-signatures',
  'bundle-handoff-metadata',
]

const disallowedRuntimeCapabilities: CatalogStorageAdapterDescriptor['disallowedCapabilities'] = [
  'electron',
  'sqlite',
  'filesystem-writes',
  'bundle-writing',
  'loader-execution',
  'user-team-storage',
  'simulation-output-storage',
]

export const currentIndexedDbCatalogStorageAdapter: CatalogStorageAdapterDescriptor = {
  id: 'catalog-storage-browser-indexeddb-current',
  kind: 'browser-indexeddb-current',
  schemaVersion: catalogStorageBoundarySchemaVersion,
  label: 'Browser IndexedDB catalog cache',
  current: true,
  implemented: true,
  storageMedium: 'browser-indexeddb',
  capabilities: currentIndexedDbCapabilities,
  disallowedCapabilities: disallowedRuntimeCapabilities,
  notes: [
    'This is the current Catalog Update storage adapter.',
    'Writes remain browser IndexedDB writes and only occur after source/generated catalog validation.',
    'Failed, cancelled, or malformed replacement data must not erase the current generated catalog cache.',
  ],
}

export const futurePackagedCatalogStorageAdapter: CatalogStorageAdapterDescriptor = {
  id: 'catalog-storage-packaged-local-future',
  kind: 'future-packaged-app-local-store',
  schemaVersion: catalogStorageBoundarySchemaVersion,
  label: 'Future packaged app-local catalog store',
  current: false,
  implemented: false,
  storageMedium: 'future-packaged-local',
  capabilities: currentIndexedDbCapabilities,
  disallowedCapabilities: disallowedRuntimeCapabilities,
  notes: [
    'Future packaged-app storage must implement this boundary without changing catalog ingestion callers.',
    'No Electron, SQLite, filesystem write, or durable app-local storage implementation is included yet.',
  ],
}

export const readonlyBundleCatalogStorageAdapter: CatalogStorageAdapterDescriptor = {
  id: 'catalog-storage-readonly-bundle-future',
  kind: 'future-readonly-bundle-store',
  schemaVersion: catalogStorageBoundarySchemaVersion,
  label: 'Future read-only .bl bundle catalog handoff',
  current: false,
  implemented: false,
  storageMedium: 'future-readonly-bundle',
  capabilities: ['read-generated-catalog', 'read-section-metadata', 'read-list-signatures', 'bundle-handoff-metadata'],
  disallowedCapabilities: disallowedRuntimeCapabilities,
  notes: [
    '.bl bundle handoff remains read-only catalog enrichment metadata.',
    'User teams, settings, reports, saves, runtime output, and simulation results stay outside catalog storage.',
  ],
}

const pokeApiSourceMetadata: CatalogSourceMetadata = {
  sourceId: 'pokeapi-live-bulk-ingestion',
  kind: 'pokeapi',
  name: 'PokeAPI live enrichment data',
  baseUrl: 'https://pokeapi.co/api/v2',
  documentationUrl: 'https://pokeapi.co/docs/v2',
  version: 'live-list-signature',
  fetchedAt: undefined,
  requiresAttribution: true,
}

function createSourceSignature(metadata: CatalogUpdateSectionCacheMetadata): CatalogStorageSourceSignature {
  return {
    sourceId: `pokeapi-${metadata.section}`,
    sourceKind: 'pokeapi',
    sourceVersion: metadata.payloadVersion.toString(),
    sourceBaseUrl: metadata.sourceBaseUrl,
    fetchedAt: metadata.lastUpdatedAt,
    listSignature: metadata.listSignature,
    section: metadata.section,
    expectedRecordCount: metadata.listCount,
  }
}

function createIssue(
  code: string,
  severity: CatalogStorageBoundaryIssue['severity'],
  message: string,
  path: string,
  section?: BattleLabCatalogBundleSectionName,
): CatalogStorageBoundaryIssue {
  return { code, severity, message, path, section }
}

function getSectionStatus(
  metadata: CatalogUpdateSectionCacheMetadata | undefined,
  hasPayload: boolean,
  hasGeneratedCatalog: boolean,
) {
  if (!metadata) return 'unavailable'
  if (metadata.status === 'failed') return 'malformed'
  if (metadata.status === 'warning') return 'stale'
  if (!metadata.listSignature || metadata.recordCount <= 0) return 'malformed'
  if (!hasPayload) return 'stale'
  if (!hasGeneratedCatalog) return 'stale'
  return 'healthy'
}

export function createCatalogStorageSectionManifest(
  metadata: CatalogUpdateSectionCacheMetadata,
): CatalogStorageSectionManifest {
  return {
    section: metadata.section,
    recordKind: 'section-metadata',
    schemaVersion: catalogStorageBoundarySchemaVersion,
    sourceSignature: createSourceSignature(metadata),
    recordCount: metadata.recordCount,
    fetchedAt: metadata.lastUpdatedAt,
    generatedAt: metadata.lastUpdatedAt,
    hash: metadata.listSignature,
    notes: [
      'Section metadata is owned by the current browser IndexedDB adapter.',
      'List signatures are used to skip current sections before detail downloads.',
    ],
  }
}

function createBoundarySections(
  metadata: CatalogUpdateSectionCacheMetadata[],
  payloadSections: Set<CatalogUpdateDownloadSectionId>,
  generatedCatalog: CatalogUpdateGeneratedCatalogCache | null,
) {
  const metadataBySection = new Map(metadata.map((entry) => [entry.section, entry]))
  const hasGeneratedCatalog = Boolean(generatedCatalog)

  const sourceSections: CatalogStorageBoundarySectionState[] = catalogStorageBoundarySections.map((section) => {
    const sectionMetadata = metadataBySection.get(section)
    const hasPayload = payloadSections.has(section)
    const status = getSectionStatus(sectionMetadata, hasPayload, hasGeneratedCatalog)

    return {
      section,
      status,
      schemaVersion: catalogStorageBoundarySchemaVersion,
      sourceSignature: sectionMetadata ? createSourceSignature(sectionMetadata) : undefined,
      recordCount: sectionMetadata?.recordCount ?? 0,
      fetchedAt: sectionMetadata?.lastUpdatedAt,
      generatedAt: generatedCatalog?.fetchedAt,
      lastCheckedAt: sectionMetadata?.lastCheckedAt,
      lastUpdatedAt: sectionMetadata?.lastUpdatedAt,
      hasListSignature: Boolean(sectionMetadata?.listSignature),
      hasCachedPayload: hasPayload,
      hasGeneratedCatalogCoverage: hasGeneratedCatalog,
      safeToReuse: status === 'healthy',
      messages: sectionMetadata
        ? [sectionMetadata.message ?? 'Section metadata is present.']
        : ['No section metadata is present; use bundled seed or future read-only bundle fallback.'],
    }
  })

  const generatedSections: CatalogStorageBoundarySectionState[] = catalogStorageBoundaryGeneratedSections.map((section) => ({
    section,
    status: hasGeneratedCatalog ? 'healthy' : 'unavailable',
    schemaVersion: catalogStorageBoundarySchemaVersion,
    recordCount:
      section === 'assets'
        ? generatedCatalog?.catalog.assets.length ?? 0
        : generatedCatalog?.catalog.searchIndex?.length ?? 0,
    fetchedAt: generatedCatalog?.fetchedAt,
    generatedAt: generatedCatalog?.fetchedAt,
    hasListSignature: false,
    hasCachedPayload: hasGeneratedCatalog,
    hasGeneratedCatalogCoverage: hasGeneratedCatalog,
    safeToReuse: hasGeneratedCatalog,
    messages: [hasGeneratedCatalog ? 'Generated catalog coverage is present.' : 'Generated catalog coverage is not cached.'],
  }))

  return [...sourceSections, ...generatedSections]
}

function createHealthReport(
  sections: CatalogStorageBoundarySectionState[],
  generatedCatalog: CatalogUpdateGeneratedCatalogCache | null,
  checkedAt: string,
  caughtError?: unknown,
): CatalogStorageCacheHealthReport {
  const malformedEntries = sections
    .filter((section) => section.status === 'malformed')
    .map((section) => ({
      recordKind: 'section-metadata' as const,
      id: section.section,
      message: section.messages[0] ?? 'Malformed catalog section metadata.',
    }))

  const hasSourceSections = sections
    .filter((section) => catalogStorageBoundarySections.includes(section.section as CatalogUpdateDownloadSectionId))
    .some((section) => section.recordCount > 0)
  const allSourceSectionsHealthy = catalogStorageBoundarySections.every((section) => {
    const state = sections.find((candidate) => candidate.section === section)
    return state?.status === 'healthy'
  })
  const staleSections = sections.filter((section) => section.status === 'stale')
  const unavailableSections = sections.filter((section) => section.status === 'unavailable')

  let status: CatalogStorageCacheHealthReport['status'] = 'healthy'
  if (caughtError) status = 'unavailable'
  else if (malformedEntries.length > 0) status = 'malformed'
  else if (staleSections.length > 0) status = 'stale'
  else if (unavailableSections.length > 0 || !generatedCatalog) status = 'unavailable'

  return {
    status,
    checkedAt,
    adapterKind: 'browser-indexeddb-current',
    schemaVersion: catalogStorageBoundarySchemaVersion,
    generatedCatalogPresent: Boolean(generatedCatalog),
    sourceSnapshotsPresent: hasSourceSections,
    sectionMetadataPresent: hasSourceSections,
    sectionSignaturesCurrent: allSourceSectionsHealthy,
    generatedCatalogVersion: generatedCatalog?.sourceVersion,
    sourceVersions: sections.flatMap((section) => (section.sourceSignature ? [section.sourceSignature] : [])),
    malformedEntries,
    warnings: [
      ...staleSections.map((section) => `${section.section} cache is stale or missing payload coverage.`),
      ...unavailableSections.map((section) => `${section.section} cache is unavailable.`),
    ],
    errors: caughtError ? [caughtError instanceof Error ? caughtError.message : 'Catalog storage health read failed.'] : [],
  }
}

function createSafeFallback(health: CatalogStorageCacheHealthReport): CatalogStorageSafeFallback {
  const fallbackStatus: CatalogStorageSafeFallback['status'] =
    health.status === 'healthy'
      ? 'use-current-cache'
      : health.generatedCatalogPresent
        ? 'block-and-keep-current'
        : 'use-bundled-seed'

  return {
    status: fallbackStatus,
    reason:
      fallbackStatus === 'use-current-cache'
        ? 'Current generated catalog cache is healthy.'
        : fallbackStatus === 'block-and-keep-current'
          ? 'New or malformed catalog data must not replace the current generated catalog until validation succeeds.'
          : 'No valid generated catalog cache is available; use bundled fallback seed data.',
    preserveCurrentGeneratedCatalog: true,
    preserveUserTeams: true,
    preserveSettings: true,
    preserveReports: true,
    preserveSaves: true,
    allowBundledSeedFallback: true,
    allowReadonlyBundleFallback: true,
    message:
      fallbackStatus === 'use-current-cache'
        ? 'Use current IndexedDB generated catalog cache.'
        : 'Keep catalog storage isolated and fall back safely without touching user data.',
  }
}

function createMigrationPlan(): CatalogStorageMigrationPlan {
  return {
    id: 'catalog-storage-packaged-adapter-migration-plan',
    fromSchemaVersion: catalogStorageBoundarySchemaVersion,
    toSchemaVersion: catalogStorageBoundarySchemaVersion,
    status: 'planned',
    destructive: false,
    preserveCurrentCatalogUntilSuccess: true,
    malformedCacheBehavior: 'block-and-keep-current',
    steps: [
      {
        id: 'validate-current-indexeddb-cache',
        label: 'Validate current IndexedDB metadata, payloads, and generated catalog before handoff.',
        recordKinds: ['section-metadata', 'section-payload', 'generated-catalog'],
        required: true,
      },
      {
        id: 'prepare-packaged-local-adapter',
        label: 'Prepare packaged app-local adapter behind the same read/write boundary.',
        recordKinds: ['generated-catalog', 'source-snapshot', 'section-metadata', 'section-payload'],
        required: true,
      },
      {
        id: 'preserve-current-until-replacement-validates',
        label: 'Keep current generated catalog available until replacement validation completes.',
        recordKinds: ['generated-catalog'],
        required: true,
      },
    ],
    notes: [
      'Migration is contract-only in this checkpoint.',
      'Malformed or stale cache must fall back safely and must not delete user-created data.',
    ],
  }
}

function createBundleHandoff(): CatalogStorageBoundaryReadModel['bundleHandoff'] {
  return {
    direction: 'import-readonly',
    readOnlyRequired: true,
    catalogOnlyRequired: true,
    excludesUserTeams: true,
    excludesSettings: true,
    excludesReports: true,
    excludesSaves: true,
    excludesRuntimeOutput: true,
    bundleWritingImplemented: false,
    notes: [
      '.bl bundle handoff remains future read-only catalog enrichment.',
      'No .bl import/export, loader execution, or bundle writing is implemented here.',
    ],
  }
}

export interface CatalogStorageBoundaryInput {
  checkedAt?: string
  metadata: CatalogUpdateSectionCacheMetadata[]
  generatedCatalog: CatalogUpdateGeneratedCatalogCache | null
  payloadSections: CatalogUpdateDownloadSectionId[]
  caughtError?: unknown
}

export function createCatalogStorageBoundaryReadModel({
  checkedAt = new Date().toISOString(),
  metadata,
  generatedCatalog,
  payloadSections,
  caughtError,
}: CatalogStorageBoundaryInput): CatalogStorageBoundaryReadModel {
  const payloadSectionSet = new Set(payloadSections)
  const sections = createBoundarySections(metadata, payloadSectionSet, generatedCatalog)
  const health = createHealthReport(sections, generatedCatalog, checkedAt, caughtError)
  const safeFallback = createSafeFallback(health)
  const migrationPlan = createMigrationPlan()
  const issues: CatalogStorageBoundaryIssue[] = [
    ...health.warnings.map((warning, index) =>
      createIssue('cache-health-warning', 'warning', warning, `health.warnings.${index}`),
    ),
    ...health.errors.map((error, index) => createIssue('cache-health-error', 'error', error, `health.errors.${index}`)),
  ]

  return {
    id: 'catalog-storage-boundary-read-model',
    contractVersion: catalogStorageBoundaryContractVersion,
    schemaVersion: catalogStorageBoundarySchemaVersion,
    checkedAt,
    currentAdapter: currentIndexedDbCatalogStorageAdapter,
    futurePackagedAdapter: futurePackagedCatalogStorageAdapter,
    readonlyBundleAdapter: readonlyBundleCatalogStorageAdapter,
    health,
    safeFallback,
    migrationPlan,
    bundleHandoff: createBundleHandoff(),
    sections,
    generatedCatalog: {
      present: Boolean(generatedCatalog),
      catalogVersion: generatedCatalog?.sourceVersion,
      fetchedAt: generatedCatalog?.fetchedAt,
      schemaVersion: catalogStorageBoundarySchemaVersion,
      preserveUntilReplacementValidates: true,
    },
    safety: {
      indexedDbCurrentAdapterPreserved: true,
      packagedLocalAdapterImplemented: false,
      sqliteImplemented: false,
      electronImplemented: false,
      filesystemWritesImplemented: false,
      bundleWritingImplemented: false,
      loaderExecutionImplemented: false,
      storesUserTeams: false,
      storesSettings: false,
      storesReports: false,
      storesRuntimeOutput: false,
      pokeApiEnrichmentOnly: true,
      showdownLegalityAuthority: true,
    },
    issues,
    notes: [
      'Current storage remains browser IndexedDB-first.',
      'The packaged-app adapter is a future boundary only.',
      'Generated catalog replacement is safe only after source and generated catalog validation pass.',
      'PokeAPI/catalog data remains enrichment-only.',
      'Pokemon Showdown remains legality and simulation source of truth.',
    ],
  }
}

export async function readCatalogStorageBoundaryReadModel(): Promise<CatalogStorageBoundaryReadModel> {
  const checkedAt = new Date().toISOString()

  try {
    const [metadata, generatedCatalog] = await Promise.all([
      readCatalogUpdateCacheMetadata(),
      readCatalogUpdateGeneratedCatalogCache().catch(() => null),
    ])
    const payloadSectionResults = await Promise.all(
      catalogStorageBoundarySections.map(async (section) => {
        const payload = await readCatalogUpdateSectionPayload(section).catch(() => null)
        return payload ? section : null
      }),
    )

    return createCatalogStorageBoundaryReadModel({
      checkedAt,
      metadata,
      generatedCatalog,
      payloadSections: payloadSectionResults.filter((section): section is CatalogUpdateDownloadSectionId => Boolean(section)),
    })
  } catch (error) {
    return createCatalogStorageBoundaryReadModel({
      checkedAt,
      metadata: [],
      generatedCatalog: null,
      payloadSections: [],
      caughtError: error,
    })
  }
}

export const sampleCatalogStorageBoundaryReadModel = createCatalogStorageBoundaryReadModel({
  checkedAt: '2026-06-15T00:00:00.000Z',
  metadata: [],
  generatedCatalog: null,
  payloadSections: [],
})

export const catalogStorageBoundarySourceMetadata = pokeApiSourceMetadata
