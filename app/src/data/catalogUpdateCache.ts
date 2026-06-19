import type { BattleLabCatalog } from '../types/catalog'
import type { PokeApiCatalogSourceSnapshot } from '../types/pokeApiSource'

export type CatalogUpdateDownloadSectionId =
  | 'pokemon'
  | 'moves'
  | 'abilities'
  | 'items'
  | 'types'
  | 'natures'

export interface CatalogUpdateListResource {
  name: string
  url: string
}

export interface CatalogUpdateSectionCacheMetadata {
  section: CatalogUpdateDownloadSectionId
  endpoint: string
  source: 'pokeapi'
  sourceBaseUrl: string
  listUrl: string
  listCount: number
  listSignature: string
  recordCount: number
  payloadVersion: 1
  lastCheckedAt: string
  lastUpdatedAt?: string
  status: 'current' | 'warning' | 'failed'
  message?: string
}

export interface CatalogUpdateSectionPayload {
  section: CatalogUpdateDownloadSectionId
  endpoint: string
  source: 'pokeapi'
  sourceBaseUrl: string
  listSignature: string
  listResults: CatalogUpdateListResource[]
  records: unknown[]
  fetchedAt: string
  payloadVersion: 1
}

export interface CatalogUpdateGeneratedCatalogCache {
  id: 'latest'
  catalog: BattleLabCatalog
  pokemonMoveIdsByShowdownId: Record<string, string[]>
  fetchedAt: string
  sourceVersion: string
  payloadVersion: 1
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

const catalogUpdateCacheDbName = 'battlelab-catalog-update-cache'
const catalogUpdateCacheDbVersion = 3
const metadataStoreName = 'sectionMetadata'
const payloadStoreName = 'sectionPayloads'
const generatedCatalogStoreName = 'generatedCatalogs'
const showdownEngineMetadataStoreName = 'showdownEngineMetadata'
const showdownEnginePayloadStoreName = 'showdownEnginePayloads'

function getDesktopBridge() {
  return typeof window !== 'undefined' ? window.battleLabDesktop : undefined
}

function getDesktopCatalogBridge() {
  const desktop = getDesktopBridge()
  if (desktop && !desktop.catalog) {
    throw new Error('BattleLab desktop catalog storage API is unavailable; refusing to fall back to IndexedDB in desktop mode.')
  }

  return desktop?.catalog
}

function getDesktopEngineBridge() {
  const desktop = getDesktopBridge()
  if (desktop && !desktop.showdownEngine) {
    throw new Error('BattleLab desktop Engine storage API is unavailable; refusing to fall back to IndexedDB in desktop mode.')
  }

  return desktop?.showdownEngine
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

function openCatalogUpdateCacheDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(catalogUpdateCacheDbName, catalogUpdateCacheDbVersion)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(metadataStoreName)) {
        db.createObjectStore(metadataStoreName, { keyPath: 'section' })
      }

      if (!db.objectStoreNames.contains(payloadStoreName)) {
        db.createObjectStore(payloadStoreName, { keyPath: 'section' })
      }

      if (!db.objectStoreNames.contains(generatedCatalogStoreName)) {
        db.createObjectStore(generatedCatalogStoreName, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(showdownEngineMetadataStoreName)) {
        db.createObjectStore(showdownEngineMetadataStoreName, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(showdownEnginePayloadStoreName)) {
        db.createObjectStore(showdownEnginePayloadStoreName, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open catalog update cache.'))
  })
}

export async function readCatalogUpdateCacheMetadata() {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    return desktopCatalog.readAllMetadata()
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(metadataStoreName, 'readonly')
    const store = transaction.objectStore(metadataStoreName)
    return await requestToPromise<CatalogUpdateSectionCacheMetadata[]>(store.getAll())
  } finally {
    db.close()
  }
}

export async function readCatalogUpdateSectionMetadata(section: CatalogUpdateDownloadSectionId) {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    return desktopCatalog.readSectionMetadata(section)
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(metadataStoreName, 'readonly')
    const store = transaction.objectStore(metadataStoreName)
    const metadata = await requestToPromise<CatalogUpdateSectionCacheMetadata | undefined>(store.get(section))
    return metadata ?? null
  } finally {
    db.close()
  }
}

export async function hasCatalogUpdateSectionPayload(section: CatalogUpdateDownloadSectionId) {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    return desktopCatalog.hasSectionPayload(section)
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(payloadStoreName, 'readonly')
    const store = transaction.objectStore(payloadStoreName)
    const payload = await requestToPromise<CatalogUpdateSectionPayload | undefined>(store.get(section))
    return Boolean(payload)
  } finally {
    db.close()
  }
}

export async function readCatalogUpdateSectionPayload(section: CatalogUpdateDownloadSectionId) {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    return desktopCatalog.readSectionPayload(section)
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(payloadStoreName, 'readonly')
    const store = transaction.objectStore(payloadStoreName)
    const payload = await requestToPromise<CatalogUpdateSectionPayload | undefined>(store.get(section))
    return payload ?? null
  } finally {
    db.close()
  }
}

export async function writeCatalogUpdateSectionMetadata(metadata: CatalogUpdateSectionCacheMetadata) {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    await desktopCatalog.writeSectionMetadata(metadata)
    return
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(metadataStoreName, 'readwrite')
    transaction.objectStore(metadataStoreName).put(metadata)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function writeCatalogUpdateSectionCacheEntry(
  metadata: CatalogUpdateSectionCacheMetadata,
  payload: CatalogUpdateSectionPayload,
) {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    await desktopCatalog.writeSectionCacheEntry(metadata, payload)
    return
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction([metadataStoreName, payloadStoreName], 'readwrite')
    transaction.objectStore(metadataStoreName).put(metadata)
    transaction.objectStore(payloadStoreName).put(payload)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

const toShowdownId = (value: string) => value.replace(/[^a-z0-9]/g, '')

function createPokemonMoveIdsByShowdownId(snapshot: PokeApiCatalogSourceSnapshot) {
  return Object.fromEntries(
    snapshot.pokemon.map((pokemon) => {
      const moveIds = Array.from(
        new Set((pokemon.moves ?? []).map((entry) => toShowdownId(entry.move.name)).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right))

      return [toShowdownId(pokemon.name), moveIds]
    }),
  )
}

function createGeneratedCatalogCacheEntry(
  catalog: BattleLabCatalog,
  snapshot: PokeApiCatalogSourceSnapshot,
) {
  return {
    id: 'latest',
    catalog,
    pokemonMoveIdsByShowdownId: createPokemonMoveIdsByShowdownId(snapshot),
    fetchedAt: snapshot.fetchedAt,
    sourceVersion: snapshot.sourceVersion,
    payloadVersion: 1,
  } satisfies CatalogUpdateGeneratedCatalogCache
}

export async function writeCatalogUpdateGeneratedCatalogCache(
  catalog: BattleLabCatalog,
  snapshot: PokeApiCatalogSourceSnapshot,
) {
  const cacheEntry = createGeneratedCatalogCacheEntry(catalog, snapshot)
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    await desktopCatalog.writeGeneratedCatalogCache(cacheEntry)
    return
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(generatedCatalogStoreName, 'readwrite')
    transaction.objectStore(generatedCatalogStoreName).put(cacheEntry)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function readCatalogUpdateGeneratedCatalogCache() {
  const desktopCatalog = getDesktopCatalogBridge()
  if (desktopCatalog) {
    return desktopCatalog.readGeneratedCatalogCache()
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(generatedCatalogStoreName, 'readonly')
    const store = transaction.objectStore(generatedCatalogStoreName)
    const cacheEntry = await requestToPromise<CatalogUpdateGeneratedCatalogCache | undefined>(store.get('latest'))
    return cacheEntry ?? null
  } finally {
    db.close()
  }
}

export async function readCatalogUpdateShowdownEngineMetadata() {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    return desktopEngine.readMetadata()
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(showdownEngineMetadataStoreName, 'readonly')
    const store = transaction.objectStore(showdownEngineMetadataStoreName)
    const metadata = await requestToPromise<CatalogUpdateShowdownEngineMetadata | undefined>(store.get('active'))
    return metadata ?? null
  } finally {
    db.close()
  }
}

export async function writeCatalogUpdateShowdownEngineMetadata(metadata: CatalogUpdateShowdownEngineMetadata) {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    await desktopEngine.writeMetadata(metadata)
    return
  }

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(showdownEngineMetadataStoreName, 'readwrite')
    transaction.objectStore(showdownEngineMetadataStoreName).put(metadata)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function writeCatalogUpdateShowdownEngineCacheEntry(
  metadata: CatalogUpdateShowdownEngineMetadata,
  payload?: CatalogUpdateShowdownEnginePayload,
) {
  const desktopEngine = getDesktopEngineBridge()
  if (desktopEngine) {
    await desktopEngine.writeCacheEntry(metadata, payload)
    return
  }

  const db = await openCatalogUpdateCacheDb()

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

export async function readCatalogUpdateShowdownEnginePayload() {
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

  const db = await openCatalogUpdateCacheDb()

  try {
    const transaction = db.transaction(showdownEnginePayloadStoreName, 'readonly')
    const store = transaction.objectStore(showdownEnginePayloadStoreName)
    const payload = await requestToPromise<CatalogUpdateShowdownEnginePayload | undefined>(store.get('active'))
    return payload ?? null
  } finally {
    db.close()
  }
}
