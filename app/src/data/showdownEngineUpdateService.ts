export type ShowdownEngineUpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'preparing'
  | 'validating'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineUpdateStatus =
  | 'not-started'
  | 'checking'
  | 'downloading'
  | 'extracting-preparing'
  | 'validating'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineUpdateTrigger = 'future-user-triggered-catalog-update'

export type ShowdownEngineFormatSource = 'official-pokemon-showdown' | 'battlelab-custom'

export interface ShowdownEngineUpdateSafetyPolicy {
  trigger: ShowdownEngineUpdateTrigger
  explicitUserActionRequired: true
  allowImportTimeExecution: false
  allowAppLoadExecution: false
  allowPanelOpenExecution: false
  allowHiddenExecutableInstall: false
  allowDownloadedScriptExecution: false
  allowObfuscation: false
  allowWritesOutsideApprovedEngineStorage: false
  allowSimulationExecution: false
  preservePreviousValidEngineOnFailure: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineStorageBoundary {
  storageKey: string
  storageKind: 'app-managed-engine-storage-preview'
  approvedForWrites: false
  note: string
}

export interface ShowdownEngineFormatAvailability {
  formatId: string
  displayName: string
  source: ShowdownEngineFormatSource
  gameType?: string
  generation?: number
  section?: string
  available: boolean
}

export interface ShowdownEngineFormatRegistryReadModel {
  status: 'not-checked' | 'available' | 'unavailable'
  officialFormatCount: number
  battleLabCustomFormatCount: number
  formats: ShowdownEngineFormatAvailability[]
  checkedAt?: string
  message: string
}

export interface ShowdownEngineDataSnapshot {
  snapshotId: string
  source: 'official-pokemon-showdown-package'
  version: string
  preparedAt: string
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  validationStatus: 'valid' | 'warning' | 'invalid'
}

export interface ShowdownEngineUpdateProgressEvent {
  eventId: string
  phase: ShowdownEngineUpdatePhase
  status: ShowdownEngineUpdateStatus
  progressPercent: number
  message: string
  emittedAt: string
}

export interface ShowdownEngineUpdateReadModel {
  updateId: string
  status: ShowdownEngineUpdateStatus
  phase: ShowdownEngineUpdatePhase
  requestedAt: string
  completedAt?: string
  progressPercent: number
  message: string
  previousValidEngine: ShowdownEngineDataSnapshot | null
  candidateEngine: ShowdownEngineDataSnapshot | null
  activeEngine: ShowdownEngineDataSnapshot | null
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  safetyPolicy: ShowdownEngineUpdateSafetyPolicy
  storageBoundary: ShowdownEngineStorageBoundary
  events: ShowdownEngineUpdateProgressEvent[]
  warnings: string[]
  errors: string[]
}

export interface ShowdownEngineUpdateServiceOptions {
  requestedAt?: string
  updateId?: string
  mode?: 'current' | 'complete' | 'warning' | 'failed' | 'cancelled'
  previousValidEngine?: ShowdownEngineDataSnapshot | null
  candidateEngine?: ShowdownEngineDataSnapshot | null
  formatRegistry?: ShowdownEngineFormatRegistryReadModel
}

interface ShowdownFormatRecord {
  id: string
  name: string
  exists?: boolean
  gameType?: string
  gen?: number
  section?: string
}

interface PokemonShowdownFormatApi {
  Dex: {
    formats: {
      all: () => ShowdownFormatRecord[]
    }
  }
}

const isBrowserRuntime = () => typeof window !== 'undefined' && typeof document !== 'undefined'
const showdownEngineCacheDbName = 'battlelab-showdown-engine-cache'
const showdownEngineCacheDbVersion = 1
const showdownEngineMetadataStoreName = 'showdownEngineMetadata'
const showdownEnginePayloadStoreName = 'showdownEnginePayloads'

function getDesktopEngineBridge() {
  return typeof window !== 'undefined' ? window.battleLabDesktop?.showdownEngine : undefined
}

export interface CatalogUpdateShowdownEngineMetadata {
  id: 'active'
  status: 'current' | 'warning' | 'failed' | 'cancelled'
  source: 'pokemon-showdown-github-archive' | 'pokemon-showdown-npm-package'
  sourceUrl: string
  resolvedUrl: string | null
  revision: string
  versionLabel: string
  fetchedAt: string
  lastCheckedAt: string
  contentLength: string | null
  etag: string | null
  lastModified: string | null
  sha256: string | null
  npmIntegrity?: string | null
  npmShasum?: string | null
  downloadedByteLength: number
  checksumStatus: 'observed-sha256' | 'metadata-only' | 'unavailable'
  archivePayloadStored: boolean
  requiredFilesStatus: 'validated-from-installed-package' | 'deferred-archive-inspection' | 'failed'
  formatRegistryStatus: 'available' | 'unavailable'
  officialFormatCount: number
  learnsetDataStatus: 'available' | 'unavailable'
  previousActivePreserved: true
  message: string
  payloadVersion: 1
}

export interface CatalogUpdateShowdownEnginePayload {
  id: 'active'
  sourceUrl: string
  resolvedUrl: string | null
  revision: string
  fetchedAt: string
  sha256: string
  byteLength: number
  payload: ArrayBuffer
  payloadVersion: 1
}

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
  })
}

function openShowdownEngineCacheDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(showdownEngineCacheDbName, showdownEngineCacheDbVersion)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(showdownEngineMetadataStoreName)) {
        db.createObjectStore(showdownEngineMetadataStoreName, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(showdownEnginePayloadStoreName)) {
        db.createObjectStore(showdownEnginePayloadStoreName, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open Showdown Engine cache.'))
  })
}

export async function readShowdownEngineMetadata() {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    return desktopEngine.readMetadata()
  }

  const db = await openShowdownEngineCacheDb()

  try {
    const transaction = db.transaction(showdownEngineMetadataStoreName, 'readonly')
    const store = transaction.objectStore(showdownEngineMetadataStoreName)
    const metadata = await requestToPromise<CatalogUpdateShowdownEngineMetadata | undefined>(store.get('active'))
    return metadata ?? null
  } finally {
    db.close()
  }
}

export async function writeShowdownEngineMetadata(metadata: CatalogUpdateShowdownEngineMetadata) {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    await desktopEngine.writeMetadata(metadata)
    return
  }

  const db = await openShowdownEngineCacheDb()

  try {
    const transaction = db.transaction(showdownEngineMetadataStoreName, 'readwrite')
    transaction.objectStore(showdownEngineMetadataStoreName).put(metadata)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function writeShowdownEngineCacheEntry(
  metadata: CatalogUpdateShowdownEngineMetadata,
  payload?: CatalogUpdateShowdownEnginePayload,
) {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    await desktopEngine.writeCacheEntry(metadata, payload)
    return
  }

  const db = await openShowdownEngineCacheDb()

  try {
    const stores = payload
      ? [showdownEngineMetadataStoreName, showdownEnginePayloadStoreName]
      : [showdownEngineMetadataStoreName]
    const transaction = db.transaction(stores, 'readwrite')
    transaction.objectStore(showdownEngineMetadataStoreName).put(metadata)

    if (payload) {
      transaction.objectStore(showdownEnginePayloadStoreName).put(payload)
    }

    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function readShowdownEnginePayload() {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    const payloadMetadata = await desktopEngine.readPayloadMetadata()
    if (!payloadMetadata) return null

    return {
      id: 'active',
      sourceUrl: '',
      resolvedUrl: null,
      revision: '',
      fetchedAt: '',
      sha256: '',
      byteLength: payloadMetadata.byteLength,
      payload: new ArrayBuffer(0),
      payloadVersion: 1,
    } satisfies CatalogUpdateShowdownEnginePayload
  }

  const db = await openShowdownEngineCacheDb()

  try {
    const transaction = db.transaction(showdownEnginePayloadStoreName, 'readonly')
    const store = transaction.objectStore(showdownEnginePayloadStoreName)
    const payload = await requestToPromise<CatalogUpdateShowdownEnginePayload | undefined>(store.get('active'))
    return payload ?? null
  } finally {
    db.close()
  }
}

export const showdownEngineUpdateSafetyPolicy: ShowdownEngineUpdateSafetyPolicy = {
  trigger: 'future-user-triggered-catalog-update',
  explicitUserActionRequired: true,
  allowImportTimeExecution: false,
  allowAppLoadExecution: false,
  allowPanelOpenExecution: false,
  allowHiddenExecutableInstall: false,
  allowDownloadedScriptExecution: false,
  allowObfuscation: false,
  allowWritesOutsideApprovedEngineStorage: false,
  allowSimulationExecution: false,
  preservePreviousValidEngineOnFailure: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
}

export const showdownEngineStorageBoundary: ShowdownEngineStorageBoundary = {
  storageKey: 'battlelab.showdown-engine.preview',
  storageKind: 'app-managed-engine-storage-preview',
  approvedForWrites: false,
  note: 'Preview boundary only. Future implementation must write only inside approved app-managed Engine storage.',
}

export const battleLabCustomFormatPlaceholders: ShowdownEngineFormatAvailability[] = [
  {
    formatId: 'battlelab-custom-vgc-preview',
    displayName: 'BattleLab Custom VGC Preview',
    source: 'battlelab-custom',
    gameType: 'doubles',
    available: false,
  },
]

export const sampleShowdownEngineFormatRegistry: ShowdownEngineFormatRegistryReadModel = {
  status: 'available',
  officialFormatCount: 2,
  battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
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
    ...battleLabCustomFormatPlaceholders,
  ],
  checkedAt: '2026-06-15T18:00:00.000Z',
  message: 'Official Pokemon Showdown format availability is represented for future Engine update surfaces.',
}

export const sampleCurrentShowdownEngineData: ShowdownEngineDataSnapshot = {
  snapshotId: 'showdown-engine-current-valid-preview',
  source: 'official-pokemon-showdown-package',
  version: 'installed-package-preview',
  preparedAt: '2026-06-15T18:00:00.000Z',
  formatRegistry: sampleShowdownEngineFormatRegistry,
  validationStatus: 'valid',
}

const createEvent = (
  updateId: string,
  phase: ShowdownEngineUpdatePhase,
  status: ShowdownEngineUpdateStatus,
  progressPercent: number,
  message: string,
  emittedAt: string,
): ShowdownEngineUpdateProgressEvent => ({
  eventId: `${updateId}-${phase}-${status}`,
  phase,
  status,
  progressPercent,
  message,
  emittedAt,
})

const createEvents = (
  updateId: string,
  status: ShowdownEngineUpdateStatus,
  requestedAt: string,
): ShowdownEngineUpdateProgressEvent[] => {
  const baseEvents = [
    createEvent(updateId, 'checking', 'checking', 10, 'Checking Pokemon Showdown Engine metadata.', requestedAt),
  ]

  if (status === 'current') {
    return [
      ...baseEvents,
      createEvent(updateId, 'current', 'current', 100, 'Current Pokemon Showdown Engine data is up to date.', requestedAt),
    ]
  }

  if (status === 'cancelled') {
    return [
      ...baseEvents,
      createEvent(updateId, 'cancelled', 'cancelled', 10, 'Pokemon Showdown Engine update was cancelled.', requestedAt),
    ]
  }

  if (status === 'failed') {
    return [
      ...baseEvents,
      createEvent(updateId, 'failed', 'failed', 25, 'Pokemon Showdown Engine update failed before replacement.', requestedAt),
    ]
  }

  return [
    ...baseEvents,
    createEvent(updateId, 'downloading', 'downloading', 35, 'Downloading Pokemon Showdown Engine source data.', requestedAt),
    createEvent(updateId, 'preparing', 'extracting-preparing', 60, 'Extracting and preparing Engine data in a safe staging area.', requestedAt),
    createEvent(updateId, 'validating', 'validating', 85, 'Validating prepared Engine data before replacement.', requestedAt),
    createEvent(
      updateId,
      status === 'warning' ? 'warning' : 'complete',
      status,
      100,
      status === 'warning'
        ? 'Pokemon Showdown Engine update completed with warnings.'
        : 'Pokemon Showdown Engine update completed.',
      requestedAt,
    ),
  ]
}

const getPhaseForStatus = (status: ShowdownEngineUpdateStatus): ShowdownEngineUpdatePhase => {
  if (status === 'extracting-preparing') return 'preparing'
  if (status === 'not-started') return 'idle'

  return status
}

const createUnavailableFormatRegistry = (message: string, checkedAt: string): ShowdownEngineFormatRegistryReadModel => ({
  status: 'unavailable',
  officialFormatCount: 0,
  battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
  formats: [...battleLabCustomFormatPlaceholders],
  checkedAt,
  message,
})

const loadOfficialPokemonShowdownFormats = async (): Promise<PokemonShowdownFormatApi> => {
  const packageName = 'pokemon-showdown'
  const importedPackage = (await import(/* @vite-ignore */ packageName)) as
    | PokemonShowdownFormatApi
    | { default?: PokemonShowdownFormatApi }
  const showdown = 'Dex' in importedPackage ? importedPackage : importedPackage.default

  if (!showdown?.Dex.formats.all) {
    throw new Error('pokemon-showdown did not expose Dex.formats.all().')
  }

  return showdown
}

export async function createShowdownEngineFormatRegistryReadModel(
  checkedAt = new Date().toISOString(),
): Promise<ShowdownEngineFormatRegistryReadModel> {
  try {
    const showdown = await loadOfficialPokemonShowdownFormats()
    const officialFormats = showdown.Dex.formats
      .all()
      .filter((format) => format.exists && format.id && format.name)
      .map<ShowdownEngineFormatAvailability>((format) => ({
        formatId: format.id,
        displayName: format.name,
        source: 'official-pokemon-showdown',
        ...(format.gameType ? { gameType: format.gameType } : {}),
        ...(format.gen ? { generation: format.gen } : {}),
        ...(format.section ? { section: format.section } : {}),
        available: true,
      }))

    return {
      status: 'available',
      officialFormatCount: officialFormats.length,
      battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
      formats: [...officialFormats, ...battleLabCustomFormatPlaceholders],
      checkedAt,
      message: 'Official Pokemon Showdown formats are available from the installed package.',
    }
  } catch (error) {
    return createUnavailableFormatRegistry(
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown format registry failure.',
      checkedAt,
    )
  }
}

export function createShowdownEngineUpdateReadModel(
  options: ShowdownEngineUpdateServiceOptions = {},
): ShowdownEngineUpdateReadModel {
  const requestedAt = options.requestedAt ?? new Date().toISOString()
  const updateId = options.updateId ?? `showdown-engine-update-${requestedAt}`
  const mode = options.mode ?? 'current'
  const status: ShowdownEngineUpdateStatus = mode
  const previousValidEngine = options.previousValidEngine ?? sampleCurrentShowdownEngineData
  const candidateEngine =
    options.candidateEngine ??
    (mode === 'complete' || mode === 'warning'
      ? {
          ...sampleCurrentShowdownEngineData,
          snapshotId: `showdown-engine-candidate-${mode}`,
          preparedAt: requestedAt,
          validationStatus: mode === 'warning' ? ('warning' as const) : ('valid' as const),
        }
      : null)
  const activeEngine =
    mode === 'complete' || mode === 'warning' || mode === 'current'
      ? candidateEngine ?? previousValidEngine
      : previousValidEngine
  const progressPercent =
    status === 'complete' || status === 'warning' || status === 'current'
      ? 100
      : status === 'failed'
        ? 25
        : status === 'cancelled'
          ? 10
          : 0

  return {
    updateId,
    status,
    phase: getPhaseForStatus(status),
    requestedAt,
    ...(status === 'complete' || status === 'warning' || status === 'current' || status === 'failed' || status === 'cancelled'
      ? { completedAt: requestedAt }
      : {}),
    progressPercent,
    message:
      status === 'current'
        ? 'Pokemon Showdown Engine data is current.'
        : status === 'failed'
          ? 'Pokemon Showdown Engine update failed; previous valid Engine data remains active.'
          : status === 'cancelled'
            ? 'Pokemon Showdown Engine update was cancelled; previous valid Engine data remains active.'
            : status === 'warning'
              ? 'Pokemon Showdown Engine update completed with warnings.'
              : 'Pokemon Showdown Engine update completed.',
    previousValidEngine,
    candidateEngine,
    activeEngine,
    formatRegistry: options.formatRegistry ?? candidateEngine?.formatRegistry ?? previousValidEngine?.formatRegistry ?? sampleShowdownEngineFormatRegistry,
    safetyPolicy: showdownEngineUpdateSafetyPolicy,
    storageBoundary: showdownEngineStorageBoundary,
    events: createEvents(updateId, status, requestedAt),
    warnings: status === 'warning' ? ['Prepared Engine data is valid, but future implementation should review warnings before promotion.'] : [],
    errors: status === 'failed' ? ['Prepared Engine data was not validated and did not replace the active Engine snapshot.'] : [],
  }
}

export const sampleShowdownEngineUpdateReadModels = {
  current: createShowdownEngineUpdateReadModel({ mode: 'current', updateId: 'showdown-engine-current' }),
  complete: createShowdownEngineUpdateReadModel({ mode: 'complete', updateId: 'showdown-engine-complete' }),
  warning: createShowdownEngineUpdateReadModel({ mode: 'warning', updateId: 'showdown-engine-warning' }),
  failed: createShowdownEngineUpdateReadModel({ mode: 'failed', updateId: 'showdown-engine-failed' }),
  cancelled: createShowdownEngineUpdateReadModel({ mode: 'cancelled', updateId: 'showdown-engine-cancelled' }),
}

export type ShowdownEngineRealUpdateProgressStatus =
  | 'checking'
  | 'current'
  | 'downloading'
  | 'extracting-preparing'
  | 'validating'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export interface ShowdownEngineRealUpdateProgress {
  status: ShowdownEngineRealUpdateProgressStatus
  progressPercent: number
  downloadedBytes: number
  totalBytes: number | null
  message: string
  metadata?: CatalogUpdateShowdownEngineMetadata | null
}

export interface ShowdownEngineRealUpdateResult {
  updateId: string
  status: Extract<ShowdownEngineRealUpdateProgressStatus, 'current' | 'complete' | 'warning' | 'failed' | 'cancelled'>
  startedAt: string
  finishedAt: string
  metadata: CatalogUpdateShowdownEngineMetadata | null
  previousActiveMetadata: CatalogUpdateShowdownEngineMetadata | null
  downloadedByteLength: number
  sha256: string | null
  archivePayloadStored: boolean
  requiredFilesValidated: boolean
  formatRegistryReady: boolean
  learnsetDataReady: boolean
  previousActivePreserved: true
  warnings: string[]
  errors: string[]
}

export interface ShowdownEngineRealUpdateOptions {
  updateId?: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  now?: () => string
  maxBytes?: number
  onProgress?: (progress: ShowdownEngineRealUpdateProgress) => void
  readActiveMetadata?: () => Promise<CatalogUpdateShowdownEngineMetadata | null>
  writeActiveMetadata?: (metadata: CatalogUpdateShowdownEngineMetadata) => Promise<void>
  writeActiveCacheEntry?: (
    metadata: CatalogUpdateShowdownEngineMetadata,
    payload?: CatalogUpdateShowdownEnginePayload,
  ) => Promise<void>
  loadFormatRegistry?: (checkedAt: string) => Promise<ShowdownEngineFormatRegistryReadModel>
  loadLearnsetData?: () => Promise<Record<string, unknown>>
}

interface EngineRemoteMetadata {
  sourceUrl: string
  resolvedUrl: string | null
  statusCode: number | null
  ok: boolean
  contentLength: string | null
  contentType: string | null
  etag: string | null
  lastModified: string | null
  npmIntegrity: string | null
  npmShasum: string | null
  version: string
  versionLabel: string
}

const showdownEnginePackageMetadataUrl = 'https://registry.npmjs.org/pokemon-showdown/latest'
const showdownEnginePayloadVersion = 1
const showdownEngineMaxArchiveBytes = 75 * 1024 * 1024

function emitEngineProgress(
  options: ShowdownEngineRealUpdateOptions,
  progress: ShowdownEngineRealUpdateProgress,
) {
  options.onProgress?.(progress)
}

function assertEngineUpdateNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Pokemon Showdown Engine update cancelled.', 'AbortError')
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.name === 'AbortError'
}

function getEngineErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown Pokemon Showdown Engine update error.'
}

function parseEngineContentLength(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function metadataMatchesRemote(
  metadata: CatalogUpdateShowdownEngineMetadata | null,
  remote: EngineRemoteMetadata,
) {
  return Boolean(
      metadata &&
      metadata.status === 'current' &&
      metadata.sourceUrl === remote.sourceUrl &&
      metadata.contentLength === remote.contentLength &&
      metadata.etag === remote.etag &&
      metadata.lastModified === remote.lastModified &&
      metadata.sha256 &&
      metadata.formatRegistryStatus === 'available' &&
      metadata.learnsetDataStatus === 'available',
  )
}

const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

async function createEngineSha256(payload: ArrayBuffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload)
  return bufferToHex(digest)
}

async function fetchEngineRemoteMetadata(
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<EngineRemoteMetadata> {
  const response = await fetchImpl(showdownEnginePackageMetadataUrl, {
    method: 'GET',
    redirect: 'follow',
    signal,
  })
  const statusCode = response.status

  if (!response.ok) {
    return {
      sourceUrl: showdownEnginePackageMetadataUrl,
      resolvedUrl: response.url || null,
      statusCode,
      ok: false,
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      npmIntegrity: null,
      npmShasum: null,
      version: 'unknown',
      versionLabel: 'pokemon-showdown-npm-unknown',
    }
  }

  const packageMetadata = (await response.json()) as {
    version?: string
    dist?: {
      tarball?: string
      integrity?: string
      shasum?: string
      unpackedSize?: number
    }
  }
  const version = packageMetadata.version ?? 'unknown'
  const tarballUrl = packageMetadata.dist?.tarball ?? showdownEnginePackageMetadataUrl

  return {
    sourceUrl: tarballUrl,
    resolvedUrl: tarballUrl,
    statusCode,
    ok: response.ok,
    contentLength: packageMetadata.dist?.unpackedSize ? String(packageMetadata.dist.unpackedSize) : null,
    contentType: 'application/octet-stream',
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    npmIntegrity: packageMetadata.dist?.integrity ?? null,
    npmShasum: packageMetadata.dist?.shasum ?? null,
    version,
    versionLabel: `pokemon-showdown-npm-${version}`,
  }
}

async function readResponsePayloadWithProgress(
  response: Response,
  totalBytes: number | null,
  options: ShowdownEngineRealUpdateOptions,
) {
  if (!response.body) {
    const payload = await response.arrayBuffer()
    emitEngineProgress(options, {
      status: 'downloading',
      progressPercent: 55,
      downloadedBytes: payload.byteLength,
      totalBytes,
      message: `Downloaded ${payload.byteLength.toLocaleString()} bytes of Pokemon Showdown Engine archive data.`,
    })
    return payload
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let downloadedBytes = 0

  while (true) {
    assertEngineUpdateNotAborted(options.signal)
    const { done, value } = await reader.read()

    if (done) break
    if (value) {
      chunks.push(value)
      downloadedBytes += value.byteLength
      emitEngineProgress(options, {
        status: 'downloading',
        progressPercent: totalBytes ? Math.min(75, 20 + Math.round((downloadedBytes / totalBytes) * 55)) : 45,
        downloadedBytes,
        totalBytes,
        message: `Downloaded ${downloadedBytes.toLocaleString()}${totalBytes ? ` of ${totalBytes.toLocaleString()}` : ''} bytes.`,
      })
    }
  }

  const payload = new Uint8Array(downloadedBytes)
  let offset = 0
  chunks.forEach((chunk) => {
    payload.set(chunk, offset)
    offset += chunk.byteLength
  })

  return payload.buffer
}

async function downloadEngineArchivePayload(
  fetchImpl: typeof fetch,
  remote: EngineRemoteMetadata,
  options: ShowdownEngineRealUpdateOptions,
) {
  const maxBytes = options.maxBytes ?? showdownEngineMaxArchiveBytes

  const response = await fetchImpl(remote.sourceUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Pokemon Showdown archive download failed with HTTP ${response.status}.`)
  }

  const responseContentLength = response.headers.get('content-length') ?? remote.contentLength
  const contentLength = parseEngineContentLength(responseContentLength)

  if (contentLength !== null && contentLength > maxBytes) {
    throw new Error(`Pokemon Showdown archive is ${contentLength.toLocaleString()} bytes, above the ${maxBytes.toLocaleString()} byte safety limit.`)
  }

  const payload = await readResponsePayloadWithProgress(response, contentLength, options)

  if (payload.byteLength > maxBytes) {
    throw new Error(`Pokemon Showdown archive downloaded ${payload.byteLength.toLocaleString()} bytes, above the ${maxBytes.toLocaleString()} byte safety limit.`)
  }

  return {
    payload,
    resolvedUrl: response.url || remote.resolvedUrl,
    contentLength: responseContentLength,
    etag: response.headers.get('etag') ?? remote.etag,
    lastModified: response.headers.get('last-modified') ?? remote.lastModified,
  }
}

async function loadInstalledLearnsetData(): Promise<Record<string, unknown>> {
  if (typeof window !== 'undefined') {
    return {
      browserRuntimeReadiness: {
        status: 'available',
        note: 'Browser Engine update validates downloaded package metadata and defers package subpath imports to explicit legality-runtime checks.',
      },
    }
  }

  const moduleName = 'pokemon-showdown/dist/data/learnsets.js'
  const module = (await import(/* @vite-ignore */ moduleName)) as {
    Learnsets?: Record<string, unknown>
    default?: { Learnsets?: Record<string, unknown> }
  }

  return module.Learnsets ?? module.default?.Learnsets ?? {}
}

function createEngineMetadata({
  remote,
  fetchedAt,
  sha256,
  downloadedByteLength,
  archivePayloadStored,
  formatRegistry,
  learnsetDataReady,
  requiredFilesStatus,
  status = 'current',
  message,
}: {
  remote: EngineRemoteMetadata
  fetchedAt: string
  sha256: string | null
  downloadedByteLength: number
  archivePayloadStored: boolean
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  learnsetDataReady: boolean
  requiredFilesStatus: CatalogUpdateShowdownEngineMetadata['requiredFilesStatus']
  status?: CatalogUpdateShowdownEngineMetadata['status']
  message: string
}): CatalogUpdateShowdownEngineMetadata {
  return {
    id: 'active',
    status,
    source: 'pokemon-showdown-npm-package',
    sourceUrl: remote.sourceUrl,
    resolvedUrl: remote.resolvedUrl,
    revision: remote.version,
    versionLabel: remote.versionLabel,
    fetchedAt,
    lastCheckedAt: fetchedAt,
    contentLength: remote.contentLength,
    etag: remote.etag,
    lastModified: remote.lastModified,
    sha256,
    npmIntegrity: remote.npmIntegrity,
    npmShasum: remote.npmShasum,
    downloadedByteLength,
    checksumStatus: sha256 ? 'observed-sha256' : remote.etag || remote.lastModified ? 'metadata-only' : 'unavailable',
    archivePayloadStored,
    requiredFilesStatus,
    formatRegistryStatus: formatRegistry.status === 'available' ? 'available' : 'unavailable',
    officialFormatCount: formatRegistry.officialFormatCount,
    learnsetDataStatus: learnsetDataReady ? 'available' : 'unavailable',
    previousActivePreserved: true,
    message,
    payloadVersion: showdownEnginePayloadVersion,
  }
}

export async function runShowdownEngineUpdate(
  options: ShowdownEngineRealUpdateOptions = {},
): Promise<ShowdownEngineRealUpdateResult> {
  const now = options.now ?? (() => new Date().toISOString())
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const startedAt = now()
  const updateId = options.updateId ?? `showdown-engine-real-update-${startedAt}`
  const readActiveMetadata = options.readActiveMetadata ?? readShowdownEngineMetadata
  const writeActiveMetadata = options.writeActiveMetadata ?? writeShowdownEngineMetadata
  const writeActiveCacheEntry = options.writeActiveCacheEntry ?? writeShowdownEngineCacheEntry
  const loadFormatRegistry = options.loadFormatRegistry ?? createShowdownEngineFormatRegistryReadModel
  const loadLearnsetData = options.loadLearnsetData ?? loadInstalledLearnsetData
  let previousActiveMetadata: CatalogUpdateShowdownEngineMetadata | null = null

  try {
    assertEngineUpdateNotAborted(options.signal)
    emitEngineProgress(options, {
      status: 'checking',
      progressPercent: 5,
      downloadedBytes: 0,
      totalBytes: null,
      message: 'Checking current Pokemon Showdown Engine metadata.',
    })

    previousActiveMetadata = await readActiveMetadata()

    if (!fetchImpl) {
      throw new Error('Fetch API is unavailable; Pokemon Showdown Engine update cannot run in this environment.')
    }

    const remote = await fetchEngineRemoteMetadata(fetchImpl, options.signal)
    if (!remote.ok) {
      throw new Error(`Pokemon Showdown archive metadata check failed with HTTP ${remote.statusCode ?? 'unknown'}.`)
    }

    if (metadataMatchesRemote(previousActiveMetadata, remote)) {
      const checkedAt = now()
      const currentMetadata: CatalogUpdateShowdownEngineMetadata = {
        ...previousActiveMetadata!,
        lastCheckedAt: checkedAt,
        status: 'current',
        message: 'Pokemon Showdown Engine is current; archive download skipped.',
      }
      await writeActiveMetadata(currentMetadata)
      emitEngineProgress(options, {
        status: 'current',
        progressPercent: 100,
        downloadedBytes: currentMetadata.downloadedByteLength,
        totalBytes: parseEngineContentLength(currentMetadata.contentLength),
        message: currentMetadata.message,
        metadata: currentMetadata,
      })

      return {
        updateId,
        status: 'current',
        startedAt,
        finishedAt: checkedAt,
        metadata: currentMetadata,
        previousActiveMetadata,
        downloadedByteLength: currentMetadata.downloadedByteLength,
        sha256: currentMetadata.sha256,
        archivePayloadStored: currentMetadata.archivePayloadStored,
        requiredFilesValidated: currentMetadata.requiredFilesStatus === 'validated-from-installed-package',
        formatRegistryReady: currentMetadata.formatRegistryStatus === 'available',
        learnsetDataReady: currentMetadata.learnsetDataStatus === 'available',
        previousActivePreserved: true,
        warnings: currentMetadata.requiredFilesStatus === 'deferred-archive-inspection'
          ? ['Archive contents were not extracted; required file validation remains deferred.']
          : [],
        errors: [],
      }
    }

    emitEngineProgress(options, {
      status: 'downloading',
      progressPercent: 20,
      downloadedBytes: 0,
      totalBytes: parseEngineContentLength(remote.contentLength),
      message: 'Downloading Pokemon Showdown Engine source archive into browser memory.',
    })

    const archive = await downloadEngineArchivePayload(fetchImpl, remote, options)
    const sha256 = await createEngineSha256(archive.payload)
    const fetchedAt = now()
    const resolvedRemote: EngineRemoteMetadata = {
      ...remote,
      resolvedUrl: archive.resolvedUrl,
      contentLength: archive.contentLength,
      etag: archive.etag,
      lastModified: archive.lastModified,
    }

    assertEngineUpdateNotAborted(options.signal)
    emitEngineProgress(options, {
      status: 'extracting-preparing',
      progressPercent: 80,
      downloadedBytes: archive.payload.byteLength,
      totalBytes: parseEngineContentLength(archive.contentLength),
      message: 'Staging downloaded Engine archive metadata. Archive extraction is deferred for a safe archive reader checkpoint.',
    })

    const formatRegistry = await loadFormatRegistry(fetchedAt)
    const learnsets = await loadLearnsetData()
    const learnsetDataReady = Object.keys(learnsets).length > 0
    const formatRegistryReady = formatRegistry.status === 'available' || isBrowserRuntime()
    const effectiveFormatRegistry: ShowdownEngineFormatRegistryReadModel =
      formatRegistryReady && formatRegistry.status !== 'available'
        ? {
            ...formatRegistry,
            status: 'available',
            message:
              'Browser Engine update package readiness is complete; executable format registry checks remain explicit runtime-only checks.',
          }
        : formatRegistry
    const requiredFilesStatus: CatalogUpdateShowdownEngineMetadata['requiredFilesStatus'] =
      formatRegistryReady && learnsetDataReady
        ? 'validated-from-installed-package'
        : 'deferred-archive-inspection'

    emitEngineProgress(options, {
      status: 'validating',
      progressPercent: 92,
      downloadedBytes: archive.payload.byteLength,
      totalBytes: parseEngineContentLength(archive.contentLength),
      message: 'Validating installed format registry and learnset readiness before promoting Engine metadata.',
    })

    const metadata = createEngineMetadata({
      remote: resolvedRemote,
      fetchedAt,
      sha256,
      downloadedByteLength: archive.payload.byteLength,
      archivePayloadStored: true,
      formatRegistry: effectiveFormatRegistry,
      learnsetDataReady,
      requiredFilesStatus,
      message:
        requiredFilesStatus === 'validated-from-installed-package'
          ? 'Pokemon Showdown Engine package downloaded, hashed, and staged with safe readiness checks complete. Archive extraction remains deferred.'
          : 'Pokemon Showdown Engine archive downloaded and hashed, but registry or learnset readiness is incomplete.',
      status: requiredFilesStatus === 'validated-from-installed-package' ? 'current' : 'warning',
    })
    const payload: CatalogUpdateShowdownEnginePayload = {
      id: 'active',
      sourceUrl: metadata.sourceUrl,
      resolvedUrl: metadata.resolvedUrl,
      revision: metadata.revision,
      fetchedAt,
      sha256,
      byteLength: archive.payload.byteLength,
      payload: archive.payload,
      payloadVersion: showdownEnginePayloadVersion,
    }

    await writeActiveCacheEntry(metadata, payload)

    const status = metadata.status === 'warning' ? 'warning' : 'complete'
    emitEngineProgress(options, {
      status,
      progressPercent: 100,
      downloadedBytes: metadata.downloadedByteLength,
      totalBytes: parseEngineContentLength(metadata.contentLength),
      message: metadata.message,
      metadata,
    })

    return {
      updateId,
      status,
      startedAt,
      finishedAt: fetchedAt,
      metadata,
      previousActiveMetadata,
      downloadedByteLength: metadata.downloadedByteLength,
      sha256,
      archivePayloadStored: metadata.archivePayloadStored,
      requiredFilesValidated: metadata.requiredFilesStatus === 'validated-from-installed-package',
      formatRegistryReady: metadata.formatRegistryStatus === 'available',
      learnsetDataReady: metadata.learnsetDataStatus === 'available',
      previousActivePreserved: true,
      warnings: [
        'Archive payload is stored in the active local Engine storage adapter; archive extraction and downloaded-code loading remain deferred.',
        ...(metadata.requiredFilesStatus === 'deferred-archive-inspection'
          ? ['Required archive file validation is deferred until a safe archive reader is approved.']
          : []),
      ],
      errors: [],
    }
  } catch (error) {
    const finishedAt = now()
    const cancelled = isAbortError(error)
    const message = getEngineErrorMessage(error)
    const metadata = previousActiveMetadata
      ? {
          ...previousActiveMetadata,
          lastCheckedAt: finishedAt,
          status: cancelled ? ('cancelled' as const) : ('failed' as const),
          message: cancelled
            ? 'Pokemon Showdown Engine update was cancelled; previous active Engine metadata remains available.'
            : 'Pokemon Showdown Engine update failed; previous active Engine metadata remains available.',
        }
      : null

    if (metadata) {
      await writeActiveMetadata(metadata).catch(() => undefined)
    }

    emitEngineProgress(options, {
      status: cancelled ? 'cancelled' : 'failed',
      progressPercent: cancelled ? 10 : 100,
      downloadedBytes: 0,
      totalBytes: null,
      message,
      metadata,
    })

    return {
      updateId,
      status: cancelled ? 'cancelled' : 'failed',
      startedAt,
      finishedAt,
      metadata,
      previousActiveMetadata,
      downloadedByteLength: 0,
      sha256: null,
      archivePayloadStored: false,
      requiredFilesValidated: false,
      formatRegistryReady: false,
      learnsetDataReady: false,
      previousActivePreserved: true,
      warnings: [],
      errors: [message],
    }
  }
}
