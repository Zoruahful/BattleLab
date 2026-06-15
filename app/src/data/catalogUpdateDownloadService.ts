import {
  hasCatalogUpdateSectionPayload,
  readCatalogUpdateCacheMetadata,
  readCatalogUpdateSectionMetadata,
  writeCatalogUpdateSectionCacheEntry,
  writeCatalogUpdateSectionMetadata,
  type CatalogUpdateDownloadSectionId,
  type CatalogUpdateListResource,
  type CatalogUpdateSectionCacheMetadata,
} from './catalogUpdateCache'

export type CatalogUpdateDownloadStatus =
  | 'idle'
  | 'checking'
  | 'fetching'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export interface CatalogUpdateDownloadSectionDefinition {
  id: CatalogUpdateDownloadSectionId
  label: string
  endpoint: string
  description: string
}

export interface CatalogUpdateDownloadSectionProgress extends CatalogUpdateDownloadSectionDefinition {
  status: CatalogUpdateDownloadStatus
  downloaded: number
  total: number
  progressPercent: number
  lastCheckedAt?: string
  lastUpdatedAt?: string
  message: string
  error?: string
}

export interface CatalogUpdateDownloadState {
  status: Exclude<CatalogUpdateDownloadStatus, 'current'>
  startedAt?: string
  finishedAt?: string
  aggregateProgressPercent: number
  message: string
  sections: CatalogUpdateDownloadSectionProgress[]
}

export interface CatalogUpdateDownloadRunOptions {
  signal?: AbortSignal
  onProgress?: (state: CatalogUpdateDownloadState) => void
}

interface PokeApiListResponse {
  count: number
  next: string | null
  previous: string | null
  results: CatalogUpdateListResource[]
}

interface SectionDownloadIssue {
  resource: CatalogUpdateListResource
  message: string
}

const pokeApiBaseUrl = 'https://pokeapi.co/api/v2'
const catalogPayloadVersion = 1
const detailConcurrency = 8
const standardTypeNames = new Set([
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
])

export const catalogUpdateDownloadSections: CatalogUpdateDownloadSectionDefinition[] = [
  {
    id: 'pokemon',
    label: 'Pokemon',
    endpoint: 'pokemon',
    description: 'Names, base resources, forms, and display metadata candidates.',
  },
  {
    id: 'moves',
    label: 'Moves',
    endpoint: 'move',
    description: 'Move names, descriptions, type, category, and picker metadata candidates.',
  },
  {
    id: 'abilities',
    label: 'Abilities',
    endpoint: 'ability',
    description: 'Ability names, descriptions, and picker metadata candidates.',
  },
  {
    id: 'items',
    label: 'Items',
    endpoint: 'item',
    description: 'Held item names, descriptions, and icon metadata candidates.',
  },
  {
    id: 'types',
    label: 'Types',
    endpoint: 'type',
    description: 'Type names and display metadata candidates.',
  },
  {
    id: 'natures',
    label: 'Natures',
    endpoint: 'nature',
    description: 'Nature names and stat-modifier metadata candidates.',
  },
]

const sectionById = new Map(catalogUpdateDownloadSections.map((section) => [section.id, section]))

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function getCachedRecordCount(
  section: CatalogUpdateDownloadSectionDefinition,
  metadata?: CatalogUpdateSectionCacheMetadata | null,
) {
  const total = metadata?.recordCount ?? metadata?.listCount ?? 0
  if (section.id === 'types' && total > standardTypeNames.size) {
    return standardTypeNames.size
  }

  return total
}

function createSectionProgress(
  section: CatalogUpdateDownloadSectionDefinition,
  metadata?: CatalogUpdateSectionCacheMetadata | null,
): CatalogUpdateDownloadSectionProgress {
  const total = getCachedRecordCount(section, metadata)

  return {
    ...section,
    status: metadata ? 'current' : 'idle',
    downloaded: metadata ? total : 0,
    total,
    progressPercent: metadata && total >= 0 ? 100 : 0,
    lastCheckedAt: metadata?.lastCheckedAt,
    lastUpdatedAt: metadata?.lastUpdatedAt,
    message: metadata
      ? `Saved ${section.label.toLowerCase()} metadata is available locally.`
      : `No saved ${section.label.toLowerCase()} section yet.`,
  }
}

function createState(
  sections: CatalogUpdateDownloadSectionProgress[],
  status: CatalogUpdateDownloadState['status'] = 'idle',
  message = 'Ready to check PokeAPI catalog sections.',
  startedAt?: string,
  finishedAt?: string,
): CatalogUpdateDownloadState {
  const aggregateProgressPercent = Math.round(
    sections.reduce((total, section) => total + section.progressPercent, 0) / sections.length,
  )

  return {
    status,
    startedAt,
    finishedAt,
    aggregateProgressPercent,
    message,
    sections,
  }
}

function getSectionProgressStatus(section: CatalogUpdateDownloadSectionProgress) {
  if (section.status === 'failed') return 'failed'
  if (section.status === 'warning') return 'warning'
  if (section.status === 'fetching') return 'fetching'
  if (section.status === 'checking') return 'checking'
  if (section.status === 'cancelled') return 'cancelled'
  if (section.status === 'complete' || section.status === 'current') return 'complete'
  return 'idle'
}

function getRunStatus(sections: CatalogUpdateDownloadSectionProgress[]): CatalogUpdateDownloadState['status'] {
  const statuses = sections.map(getSectionProgressStatus)
  if (statuses.includes('fetching')) return 'fetching'
  if (statuses.includes('checking')) return 'checking'
  if (statuses.includes('failed')) return 'failed'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('cancelled')) return 'cancelled'
  if (statuses.every((status) => status === 'complete')) return 'complete'
  return 'idle'
}

function getRunMessage(status: CatalogUpdateDownloadState['status']) {
  if (status === 'checking') return 'Checking local cache and PokeAPI section lists.'
  if (status === 'fetching') return 'Downloading stale or missing catalog sections from PokeAPI.'
  if (status === 'complete') return 'Catalog update complete. Current sections were skipped safely.'
  if (status === 'warning') return 'Catalog update completed with warnings. Existing cached data was preserved where needed.'
  if (status === 'failed') return 'Some sections failed. Existing cached data was not erased.'
  if (status === 'cancelled') return 'Catalog update cancelled. Existing cached data was not erased.'
  return 'Ready to check PokeAPI catalog sections.'
}

function updateSection(
  sections: CatalogUpdateDownloadSectionProgress[],
  sectionId: CatalogUpdateDownloadSectionId,
  updates: Partial<CatalogUpdateDownloadSectionProgress>,
) {
  return sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section))
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Catalog update cancelled.', 'AbortError')
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown catalog update error.'
}

function createListUrl(endpoint: string, limit: number) {
  return `${pokeApiBaseUrl}/${endpoint}?limit=${limit}&offset=0`
}

function getSectionListResources(
  section: CatalogUpdateDownloadSectionDefinition,
  results: CatalogUpdateListResource[],
) {
  if (section.id !== 'types') return results
  return results.filter((resource) => standardTypeNames.has(resource.name))
}

function createListSignature(results: CatalogUpdateListResource[], count: number) {
  const input = `${count}|${results.map((resource) => `${resource.name}:${resource.url}`).join('|')}`
  let hash = 2_166_136_261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return `fnv1a-${(hash >>> 0).toString(16)}`
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  assertNotAborted(signal)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`PokeAPI request failed (${response.status}) for ${url}`)
  }

  return response.json() as Promise<T>
}

async function fetchPokeApiList(endpoint: string, limit: number, signal?: AbortSignal) {
  return fetchJson<PokeApiListResponse>(createListUrl(endpoint, limit), signal)
}

async function fetchSectionDetails(
  resources: CatalogUpdateListResource[],
  signal: AbortSignal | undefined,
  onRecord: (downloaded: number) => void,
) {
  const records = new Array<unknown>(resources.length)
  const issues: SectionDownloadIssue[] = []
  let cursor = 0
  let downloaded = 0

  const worker = async () => {
    while (cursor < resources.length) {
      assertNotAborted(signal)
      const index = cursor
      cursor += 1
      const resource = resources[index]

      try {
        records[index] = await fetchJson<unknown>(resource.url, signal)
      } catch (error) {
        issues.push({
          resource,
          message: getErrorMessage(error),
        })
      } finally {
        downloaded += 1
        onRecord(downloaded)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(detailConcurrency, resources.length) }, () => worker()))

  return {
    records: records.filter((record) => record !== undefined),
    issues,
  }
}

export async function loadCatalogUpdateDownloadStateFromCache(): Promise<CatalogUpdateDownloadState> {
  try {
    const metadata = await readCatalogUpdateCacheMetadata()
    const metadataBySection = new Map(metadata.map((entry) => [entry.section, entry]))
    const sections = catalogUpdateDownloadSections.map((section) =>
      createSectionProgress(section, metadataBySection.get(section.id)),
    )

    return createState(sections)
  } catch (error) {
    const sections = catalogUpdateDownloadSections.map((section) => ({
      ...createSectionProgress(section),
      status: 'warning' as const,
      message: `Could not read local cache metadata: ${getErrorMessage(error)}`,
    }))

    return createState(sections, 'warning', 'Local catalog cache metadata could not be read.')
  }
}

export function createInitialCatalogUpdateDownloadState(): CatalogUpdateDownloadState {
  return createState(catalogUpdateDownloadSections.map((section) => createSectionProgress(section)))
}

export async function runCatalogUpdateDownload({
  signal,
  onProgress,
}: CatalogUpdateDownloadRunOptions = {}): Promise<CatalogUpdateDownloadState> {
  const startedAt = new Date().toISOString()
  let state = createState(
    catalogUpdateDownloadSections.map((section) => createSectionProgress(section)),
    'checking',
    getRunMessage('checking'),
    startedAt,
  )

  const emit = (sections: CatalogUpdateDownloadSectionProgress[], message?: string) => {
    const status = getRunStatus(sections)
    state = createState(sections, status, message ?? getRunMessage(status), startedAt)
    onProgress?.(state)
  }

  onProgress?.(state)

  for (const section of catalogUpdateDownloadSections) {
    try {
      assertNotAborted(signal)
      const checkedAt = new Date().toISOString()
      let sections = updateSection(state.sections, section.id, {
        status: 'checking',
        downloaded: 0,
        progressPercent: 0,
        lastCheckedAt: checkedAt,
        message: 'Checking local cache and PokeAPI section list.',
      })
      emit(sections)

      const cachedMetadata = await readCatalogUpdateSectionMetadata(section.id)
      const hasPayload = cachedMetadata ? await hasCatalogUpdateSectionPayload(section.id) : false
      const listHead = await fetchPokeApiList(section.endpoint, 1, signal)
      const sourceList = listHead.count > 0 ? await fetchPokeApiList(section.endpoint, listHead.count, signal) : listHead
      const listResults = getSectionListResources(section, sourceList.results)
      const listCount = listResults.length
      const listSignature = createListSignature(listResults, listCount)
      const listUrl = createListUrl(section.endpoint, sourceList.count)
      const isCurrent =
        Boolean(cachedMetadata) &&
        hasPayload &&
        cachedMetadata?.listSignature === listSignature &&
        cachedMetadata.recordCount === listCount

      if (isCurrent && cachedMetadata) {
        const metadata: CatalogUpdateSectionCacheMetadata = {
          ...cachedMetadata,
          listUrl,
          listCount,
          lastCheckedAt: checkedAt,
          status: 'current',
          message: 'Saved section is current; detail download skipped.',
        }
        await writeCatalogUpdateSectionMetadata(metadata)

        sections = updateSection(state.sections, section.id, {
          status: 'current',
          downloaded: listCount,
          total: listCount,
          progressPercent: 100,
          lastCheckedAt: checkedAt,
          lastUpdatedAt: cachedMetadata.lastUpdatedAt,
          message: 'Current. Detail download skipped.',
        })
        emit(sections, `${section.label} is current; skipped detail download.`)
        continue
      }

      sections = updateSection(state.sections, section.id, {
        status: 'fetching',
        downloaded: 0,
        total: listCount,
        progressPercent: 0,
        lastCheckedAt: checkedAt,
        message: cachedMetadata ? 'Saved section is stale; downloading updates.' : 'Missing locally; downloading section.',
      })
      emit(sections)

      const { records, issues } = await fetchSectionDetails(listResults, signal, (downloaded) => {
        emit(
          updateSection(state.sections, section.id, {
            status: 'fetching',
            downloaded,
            total: listCount,
            progressPercent: listCount > 0 ? Math.round((downloaded / listCount) * 100) : 100,
            message: `Downloaded ${formatCount(downloaded)} of ${formatCount(listCount)} records.`,
          }),
        )
      })

      const fetchedAt = new Date().toISOString()

      if (issues.length > 0) {
        const nextStatus = cachedMetadata ? 'warning' : 'failed'
        const message = cachedMetadata
          ? `${formatCount(issues.length)} records failed. Kept previous saved section.`
          : `${formatCount(issues.length)} records failed. No saved section was overwritten.`

        await writeCatalogUpdateSectionMetadata({
          section: section.id,
          endpoint: section.endpoint,
          source: 'pokeapi',
          sourceBaseUrl: pokeApiBaseUrl,
          listUrl,
          listCount,
          listSignature,
          recordCount: cachedMetadata?.recordCount ?? records.length,
          payloadVersion: catalogPayloadVersion,
          lastCheckedAt: checkedAt,
          lastUpdatedAt: cachedMetadata?.lastUpdatedAt,
          status: nextStatus,
          message,
        })

        sections = updateSection(state.sections, section.id, {
          status: nextStatus,
          downloaded: records.length,
          total: listCount,
          progressPercent: listCount > 0 ? Math.round((records.length / listCount) * 100) : 0,
          lastCheckedAt: checkedAt,
          lastUpdatedAt: cachedMetadata?.lastUpdatedAt,
          message,
          error: issues[0]?.message,
        })
        emit(sections)
        continue
      }

      await writeCatalogUpdateSectionCacheEntry(
        {
          section: section.id,
          endpoint: section.endpoint,
          source: 'pokeapi',
          sourceBaseUrl: pokeApiBaseUrl,
          listUrl,
          listCount,
          listSignature,
          recordCount: records.length,
          payloadVersion: catalogPayloadVersion,
          lastCheckedAt: checkedAt,
          lastUpdatedAt: fetchedAt,
          status: 'current',
          message: 'Downloaded and cached successfully.',
        },
        {
          section: section.id,
          endpoint: section.endpoint,
          source: 'pokeapi',
          sourceBaseUrl: pokeApiBaseUrl,
          listSignature,
          listResults,
          records,
          fetchedAt,
          payloadVersion: catalogPayloadVersion,
        },
      )

      sections = updateSection(state.sections, section.id, {
        status: 'complete',
        downloaded: records.length,
        total: listCount,
        progressPercent: 100,
        lastCheckedAt: checkedAt,
        lastUpdatedAt: fetchedAt,
        message: `Downloaded ${formatCount(records.length)} records.`,
      })
      emit(sections)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const sections = state.sections.map((currentSection) =>
          currentSection.status === 'checking' || currentSection.status === 'fetching'
            ? {
                ...currentSection,
                status: 'cancelled' as const,
                message: 'Update cancelled. Existing cached data was not erased.',
              }
            : currentSection,
        )
        state = createState(sections, 'cancelled', getRunMessage('cancelled'), startedAt, new Date().toISOString())
        onProgress?.(state)
        return state
      }

      const message = getErrorMessage(error)
      const cachedMetadata = await readCatalogUpdateSectionMetadata(section.id).catch(() => null)
      const sections = updateSection(state.sections, section.id, {
        status: 'failed',
        downloaded: cachedMetadata?.recordCount ?? 0,
        total: cachedMetadata?.recordCount ?? 0,
        progressPercent: cachedMetadata ? 100 : 0,
        lastUpdatedAt: cachedMetadata?.lastUpdatedAt,
        message: cachedMetadata
          ? 'Update failed. Kept the previous saved section.'
          : 'Update failed. No saved section was erased.',
        error: message,
      })
      emit(sections)
    }
  }

  const finishedAt = new Date().toISOString()
  const finalStatus = getRunStatus(state.sections)
  state = createState(state.sections, finalStatus, getRunMessage(finalStatus), startedAt, finishedAt)
  onProgress?.(state)

  return state
}

export function getCatalogUpdateSectionDefinition(sectionId: CatalogUpdateDownloadSectionId) {
  return sectionById.get(sectionId)
}
