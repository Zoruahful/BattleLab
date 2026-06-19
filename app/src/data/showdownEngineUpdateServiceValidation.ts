import type {
  ShowdownEngineUpdateProgressEvent,
  ShowdownEngineUpdateReadModel,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import {
  createShowdownEngineFormatRegistryReadModel,
  runShowdownEngineUpdate,
  sampleShowdownEngineUpdateReadModels,
  showdownEngineUpdateSafetyPolicy,
  type CatalogUpdateShowdownEngineMetadata,
  type ShowdownEngineFormatRegistryReadModel,
} from './showdownEngineUpdateService'

export type ShowdownEngineUpdateValidationSeverity = 'error' | 'warning'

export type ShowdownEngineUpdateValidationCode =
  | 'explicit-call-boundary-invalid'
  | 'safety-policy-open'
  | 'status-coverage-missing'
  | 'failed-replaced-current-engine'
  | 'cancelled-replaced-current-engine'
  | 'format-registry-not-represented'
  | 'real-update-current-skip-invalid'
  | 'real-update-success-invalid'
  | 'real-update-failure-preservation-invalid'
  | 'real-update-cancelled-preservation-invalid'
  | 'downloaded-code-execution-boundary-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineUpdateValidationIssue {
  code: ShowdownEngineUpdateValidationCode
  severity: ShowdownEngineUpdateValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineUpdateValidationResult {
  isValid: boolean
  issues: ShowdownEngineUpdateValidationIssue[]
  checkedReadModelCount: number
  checkedStatuses: ShowdownEngineUpdateStatus[]
  liveFormatRegistryStatus: 'available' | 'unavailable' | 'not-checked'
  liveOfficialFormatCount: number
  realUpdateStatuses: string[]
  realUpdateProgressStatuses: string[]
}

const requiredEventStatuses: ShowdownEngineUpdateStatus[] = [
  'checking',
  'downloading',
  'extracting-preparing',
  'validating',
  'current',
  'complete',
  'warning',
  'failed',
  'cancelled',
]

const createIssue = (
  code: ShowdownEngineUpdateValidationCode,
  severity: ShowdownEngineUpdateValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineUpdateValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateSafetyPolicy = (issues: ShowdownEngineUpdateValidationIssue[]) => {
  if (
    showdownEngineUpdateSafetyPolicy.trigger !== 'future-user-triggered-catalog-update' ||
    !showdownEngineUpdateSafetyPolicy.explicitUserActionRequired ||
    showdownEngineUpdateSafetyPolicy.allowImportTimeExecution ||
    showdownEngineUpdateSafetyPolicy.allowAppLoadExecution ||
    showdownEngineUpdateSafetyPolicy.allowPanelOpenExecution
  ) {
    issues.push(
      createIssue(
        'explicit-call-boundary-invalid',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Engine update must remain explicit future-user-triggered only and must not run at import/app-load/panel-open time.',
      ),
    )
  }

  if (
    showdownEngineUpdateSafetyPolicy.allowHiddenExecutableInstall ||
    showdownEngineUpdateSafetyPolicy.allowDownloadedScriptExecution ||
    showdownEngineUpdateSafetyPolicy.allowObfuscation ||
    showdownEngineUpdateSafetyPolicy.allowWritesOutsideApprovedEngineStorage ||
    showdownEngineUpdateSafetyPolicy.allowSimulationExecution ||
    !showdownEngineUpdateSafetyPolicy.preservePreviousValidEngineOnFailure
  ) {
    issues.push(
      createIssue(
        'safety-policy-open',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Engine update safety flags must stay closed and preserve previous valid Engine data on failure.',
      ),
    )
  }

  if (
    showdownEngineUpdateSafetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    showdownEngineUpdateSafetyPolicy.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data enrichment-only.',
      ),
    )
  }
}

const collectEventStatuses = (models: ShowdownEngineUpdateReadModel[]) =>
  new Set(models.flatMap((model) => model.events.map((event: ShowdownEngineUpdateProgressEvent) => event.status)))

const validateStatusCoverage = (
  issues: ShowdownEngineUpdateValidationIssue[],
  models: ShowdownEngineUpdateReadModel[],
) => {
  const eventStatuses = collectEventStatuses(models)

  requiredEventStatuses.forEach((status) => {
    if (!eventStatuses.has(status)) {
      issues.push(
        createIssue(
          'status-coverage-missing',
          'error',
          `events.${status}`,
          `Engine update read-model fixtures must represent ${status} progress/status.`,
        ),
      )
    }
  })
}

const validatePreservation = (
  issues: ShowdownEngineUpdateValidationIssue[],
  model: ShowdownEngineUpdateReadModel,
  path: string,
) => {
  if (
    model.status === 'failed' &&
    model.previousValidEngine?.snapshotId !== model.activeEngine?.snapshotId
  ) {
    issues.push(
      createIssue(
        'failed-replaced-current-engine',
        'error',
        `${path}.activeEngine`,
        'Failed Engine update must not replace the previous valid Engine snapshot.',
      ),
    )
  }

  if (
    model.status === 'cancelled' &&
    model.previousValidEngine?.snapshotId !== model.activeEngine?.snapshotId
  ) {
    issues.push(
      createIssue(
        'cancelled-replaced-current-engine',
        'error',
        `${path}.activeEngine`,
        'Cancelled Engine update must not replace the previous valid Engine snapshot.',
      ),
    )
  }
}

const validateFormatRegistry = (
  issues: ShowdownEngineUpdateValidationIssue[],
  models: ShowdownEngineUpdateReadModel[],
) => {
  models.forEach((model, index) => {
    if (
      !model.formatRegistry ||
      model.formatRegistry.officialFormatCount < 1 ||
      !model.formatRegistry.formats.some((format) => format.source === 'battlelab-custom')
    ) {
      issues.push(
        createIssue(
          'format-registry-not-represented',
          'error',
          `models.${index}.formatRegistry`,
          'Engine update read-model must represent official Pokemon Showdown format availability and BattleLab custom format space.',
        ),
      )
    }
  })
}

const createMockFormatRegistry = (checkedAt: string): ShowdownEngineFormatRegistryReadModel => ({
  status: 'available',
  officialFormatCount: 2,
  battleLabCustomFormatCount: 1,
  checkedAt,
  message: 'Mock Pokemon Showdown format registry is available.',
  formats: [
    {
      formatId: 'gen9vgc2025regg',
      displayName: '[Gen 9] VGC 2025 Reg G',
      source: 'official-pokemon-showdown',
      gameType: 'doubles',
      generation: 9,
      section: 'S/V Doubles',
      available: true,
    },
    {
      formatId: 'gen9vgc2024regh',
      displayName: '[Gen 9] VGC 2024 Reg H',
      source: 'official-pokemon-showdown',
      gameType: 'doubles',
      generation: 9,
      section: 'S/V Doubles',
      available: true,
    },
    {
      formatId: 'battlelab-custom-vgc-preview',
      displayName: 'BattleLab Custom VGC Preview',
      source: 'battlelab-custom',
      gameType: 'doubles',
      available: false,
    },
  ],
})

const createMockMetadata = (overrides: Partial<CatalogUpdateShowdownEngineMetadata> = {}): CatalogUpdateShowdownEngineMetadata => ({
  id: 'active',
  status: 'current',
  source: 'pokemon-showdown-npm-package',
  sourceUrl: 'https://registry.npmjs.org/pokemon-showdown/-/pokemon-showdown-0.11.10.tgz',
  resolvedUrl: 'https://registry.npmjs.org/pokemon-showdown/-/pokemon-showdown-0.11.10.tgz',
  revision: '0.11.10',
  versionLabel: 'pokemon-showdown-npm-0.11.10',
  fetchedAt: '2026-06-16T03:00:00.000Z',
  lastCheckedAt: '2026-06-16T03:00:00.000Z',
  contentLength: '14',
  etag: '"mock-etag"',
  lastModified: 'Tue, 16 Jun 2026 03:00:00 GMT',
  sha256: 'mock-sha256',
  npmIntegrity: 'sha512-mock-integrity',
  npmShasum: 'mock-shasum',
  downloadedByteLength: 14,
  checksumStatus: 'observed-sha256',
  archivePayloadStored: true,
  requiredFilesStatus: 'validated-from-installed-package',
  formatRegistryStatus: 'available',
  officialFormatCount: 2,
  learnsetDataStatus: 'available',
  previousActivePreserved: true,
  message: 'Mock active Engine metadata.',
  payloadVersion: 1,
  ...overrides,
})

const createMockResponse = (body: BodyInit | null, init: ResponseInit & { url?: string } = {}) => {
  const response = new Response(body, init)
  Object.defineProperty(response, 'url', {
    value: init.url ?? 'https://registry.npmjs.org/pokemon-showdown/-/pokemon-showdown-0.11.10.tgz',
  })
  return response
}

const createMockFetch = (body = 'engine-payload') =>
  (async (_input: RequestInfo | URL) => {
    const headers = {
      'content-length': String(body.length),
      'content-type': 'application/zip',
      etag: '"mock-etag"',
      'last-modified': 'Tue, 16 Jun 2026 03:00:00 GMT',
    }

    if (String(_input).includes('/latest')) {
      return createMockResponse(
        JSON.stringify({
          version: '0.11.10',
          dist: {
            tarball: 'https://registry.npmjs.org/pokemon-showdown/-/pokemon-showdown-0.11.10.tgz',
            integrity: 'sha512-mock-integrity',
            shasum: 'mock-shasum',
            unpackedSize: body.length,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            etag: '"mock-etag"',
            'last-modified': 'Tue, 16 Jun 2026 03:00:00 GMT',
          },
          url: 'https://registry.npmjs.org/pokemon-showdown/latest',
        },
      )
    }

    return createMockResponse(body, {
      status: 200,
      headers,
      url: 'https://registry.npmjs.org/pokemon-showdown/-/pokemon-showdown-0.11.10.tgz',
    })
  }) as typeof fetch

const validateRealUpdatePaths = async (issues: ShowdownEngineUpdateValidationIssue[]) => {
  const progressStatuses: string[] = []
  const writes: CatalogUpdateShowdownEngineMetadata[] = []
  const cacheWrites: CatalogUpdateShowdownEngineMetadata[] = []
  const nowValues = [
    '2026-06-16T03:00:00.000Z',
    '2026-06-16T03:00:01.000Z',
    '2026-06-16T03:00:02.000Z',
    '2026-06-16T03:00:03.000Z',
    '2026-06-16T03:00:04.000Z',
  ]
  const now = () => nowValues.shift() ?? '2026-06-16T03:00:05.000Z'
  const loadFormatRegistry = async (checkedAt: string) => createMockFormatRegistry(checkedAt)
  const loadLearnsetData = async () => ({ tyranitar: { learnset: { rockslide: ['9M'] } } })

  const current = await runShowdownEngineUpdate({
    updateId: 'showdown-engine-validation-current',
    now,
    fetchImpl: createMockFetch(),
    readActiveMetadata: async () => createMockMetadata(),
    writeActiveMetadata: async (metadata) => {
      writes.push(metadata)
    },
    writeActiveCacheEntry: async (metadata) => {
      cacheWrites.push(metadata)
    },
    loadFormatRegistry,
    loadLearnsetData,
    onProgress: (progress) => progressStatuses.push(progress.status),
  })

  if (current.status !== 'current' || current.downloadedByteLength !== 14 || cacheWrites.length !== 0) {
    issues.push(
      createIssue(
        'real-update-current-skip-invalid',
        'error',
        'realUpdate.current',
        'Current/up-to-date Engine path must skip archive body download and avoid payload cache writes.',
      ),
    )
  }

  const complete = await runShowdownEngineUpdate({
    updateId: 'showdown-engine-validation-complete',
    now,
    fetchImpl: createMockFetch(),
    readActiveMetadata: async () => null,
    writeActiveMetadata: async (metadata) => {
      writes.push(metadata)
    },
    writeActiveCacheEntry: async (metadata) => {
      cacheWrites.push(metadata)
    },
    loadFormatRegistry,
    loadLearnsetData,
    onProgress: (progress) => progressStatuses.push(progress.status),
  })

  if (
    complete.status !== 'complete' ||
    !complete.sha256 ||
    !complete.archivePayloadStored ||
    !complete.formatRegistryReady ||
    !complete.learnsetDataReady ||
    !complete.previousActivePreserved
  ) {
    issues.push(
      createIssue(
        'real-update-success-invalid',
        'error',
        'realUpdate.complete',
        'Real Engine update success path must download, hash, store metadata/payload, validate registry/learnsets, and preserve previous-active semantics.',
      ),
    )
  }

  if (!complete.warnings.some((warning) => warning.includes('Archive payload is stored')) || complete.errors.length > 0) {
    issues.push(
      createIssue(
        'downloaded-code-execution-boundary-invalid',
        'error',
        'realUpdate.complete.warnings',
        'Successful update must clearly state downloaded archive payload is stored only and not extracted, loaded, or executed.',
      ),
    )
  }

  const failed = await runShowdownEngineUpdate({
    updateId: 'showdown-engine-validation-failed',
    now,
    fetchImpl: (async () => createMockResponse(null, { status: 500 })) as typeof fetch,
    readActiveMetadata: async () => createMockMetadata({ sha256: 'previous-sha' }),
    writeActiveMetadata: async (metadata) => {
      writes.push(metadata)
    },
    writeActiveCacheEntry: async (metadata) => {
      cacheWrites.push(metadata)
    },
    loadFormatRegistry,
    loadLearnsetData,
    onProgress: (progress) => progressStatuses.push(progress.status),
  })

  if (failed.status !== 'failed' || failed.metadata?.sha256 !== 'previous-sha' || !failed.previousActivePreserved) {
    issues.push(
      createIssue(
        'real-update-failure-preservation-invalid',
        'error',
        'realUpdate.failed',
        'Failed Engine update must preserve previous active metadata and avoid replacing current Engine data.',
      ),
    )
  }

  const cancelled = await runShowdownEngineUpdate({
    updateId: 'showdown-engine-validation-cancelled',
    now,
    fetchImpl: (async () => {
      throw new DOMException('Cancelled by validation fixture.', 'AbortError')
    }) as typeof fetch,
    readActiveMetadata: async () => createMockMetadata({ sha256: 'cancel-previous-sha' }),
    writeActiveMetadata: async (metadata) => {
      writes.push(metadata)
    },
    writeActiveCacheEntry: async (metadata) => {
      cacheWrites.push(metadata)
    },
    loadFormatRegistry,
    loadLearnsetData,
    onProgress: (progress) => progressStatuses.push(progress.status),
  })

  if (cancelled.status !== 'cancelled' || cancelled.metadata?.sha256 !== null && cancelled.metadata?.sha256 !== 'cancel-previous-sha') {
    issues.push(
      createIssue(
        'real-update-cancelled-preservation-invalid',
        'error',
        'realUpdate.cancelled',
        'Cancelled Engine update must preserve previous active metadata and avoid replacement.',
      ),
    )
  }

  return {
    statuses: [current.status, complete.status, failed.status, cancelled.status],
    progressStatuses,
  }
}

export async function validateShowdownEngineUpdateService(): Promise<ShowdownEngineUpdateValidationResult> {
  const issues: ShowdownEngineUpdateValidationIssue[] = []
  const models = Object.values(sampleShowdownEngineUpdateReadModels)
  const liveFormatRegistry = await createShowdownEngineFormatRegistryReadModel('2026-06-15T18:30:00.000Z')
  const realUpdate = await validateRealUpdatePaths(issues)

  validateSafetyPolicy(issues)
  validateStatusCoverage(issues, models)
  validateFormatRegistry(issues, models)
  models.forEach((model, index) => validatePreservation(issues, model, `models.${index}`))

  if (liveFormatRegistry.status !== 'available' || liveFormatRegistry.officialFormatCount < 1) {
    issues.push(
      createIssue(
        'format-registry-not-represented',
        'error',
        'liveFormatRegistry',
        'Explicit format registry readiness check must expose official Pokemon Showdown format availability.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedReadModelCount: models.length,
    checkedStatuses: models.map((model) => model.status),
    liveFormatRegistryStatus: liveFormatRegistry.status,
    liveOfficialFormatCount: liveFormatRegistry.officialFormatCount,
    realUpdateStatuses: realUpdate.statuses,
    realUpdateProgressStatuses: realUpdate.progressStatuses,
  }
}
