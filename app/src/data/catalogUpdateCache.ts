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

const catalogUpdateCacheDbName = 'battlelab-catalog-update-cache'
const catalogUpdateCacheDbVersion = 1
const metadataStoreName = 'sectionMetadata'
const payloadStoreName = 'sectionPayloads'

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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open catalog update cache.'))
  })
}

export async function readCatalogUpdateCacheMetadata() {
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

export async function writeCatalogUpdateSectionMetadata(metadata: CatalogUpdateSectionCacheMetadata) {
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
