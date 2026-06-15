import {
  createFailedShowdownEngineArchiveExecutionPlan,
  sampleShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'
import {
  createShowdownEngineArchiveDownloadAdapterDryRunResult,
  type ShowdownEngineArchiveDownloadAdapterResult,
} from './showdownEngineArchiveDownloadAdapter'
import {
  createShowdownEngineArchiveDownloadReadModel,
  type ShowdownEngineArchiveDownloadReadModel,
} from './showdownEngineArchiveDownloadReadModel'
import type { ShowdownEngineSourceArchiveDescriptor } from './showdownEngineUpdateArchitecture'

export type ShowdownEngineArchiveMetadataFetchMode = 'metadata-head-only'

export type ShowdownEngineArchiveMetadataFetchStatus = 'complete' | 'failed'

export interface ShowdownEngineArchiveMetadataFetchRequest {
  requestId: string
  mode: ShowdownEngineArchiveMetadataFetchMode
  trigger: 'direct-validation-helper-call'
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  method: 'HEAD'
  explicitCallOnly: true
  noImportTimeFetch: true
  noAppLoadFetch: true
  noPanelOpenFetch: true
  noArchiveBodyDownload: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noSimulationExecution: true
}

export interface ShowdownEngineArchiveMetadataFetchHeaders {
  statusCode: number
  ok: boolean
  finalUrl: string
  redirected: boolean
  contentType: string | null
  contentLength: string | null
  etag: string | null
  lastModified: string | null
  location: string | null
}

export interface ShowdownEngineArchiveMetadataFetchResult {
  status: ShowdownEngineArchiveMetadataFetchStatus
  request: ShowdownEngineArchiveMetadataFetchRequest
  fetchedAt: string
  headers: ShowdownEngineArchiveMetadataFetchHeaders | null
  errorMessage: string | null
  adapterResult: ShowdownEngineArchiveDownloadAdapterResult
  readModel: ShowdownEngineArchiveDownloadReadModel
  previousActivePreserved: true
  safety: {
    pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
    catalogRole: 'enrichment-only'
    customFormatsOverlayOnly: true
    noArchiveBodyDownload: true
    noArchiveExtraction: true
    noFileIo: true
    noDynamicImports: true
    noLoaderExecution: true
    noSimulationExecution: true
  }
  boundaryNotes: string[]
}

export interface ShowdownEngineArchiveMetadataFetchProofOptions {
  sourceArchive?: ShowdownEngineSourceArchiveDescriptor
  fetchImpl?: typeof fetch
  now?: () => string
  signal?: AbortSignal
}

const createRequest = (
  sourceArchive: ShowdownEngineSourceArchiveDescriptor,
): ShowdownEngineArchiveMetadataFetchRequest => ({
  requestId: 'showdown-engine-archive-metadata-fetch-proof',
  mode: 'metadata-head-only',
  trigger: 'direct-validation-helper-call',
  sourceArchive,
  method: 'HEAD',
  explicitCallOnly: true,
  noImportTimeFetch: true,
  noAppLoadFetch: true,
  noPanelOpenFetch: true,
  noArchiveBodyDownload: true,
  noArchiveExtraction: true,
  noFileIo: true,
  noDynamicImports: true,
  noLoaderExecution: true,
  noSimulationExecution: true,
})

const createHeaders = (response: Response): ShowdownEngineArchiveMetadataFetchHeaders => ({
  statusCode: response.status,
  ok: response.ok || (response.status >= 300 && response.status < 400),
  finalUrl: response.url,
  redirected: response.redirected,
  contentType: response.headers.get('content-type'),
  contentLength: response.headers.get('content-length'),
  etag: response.headers.get('etag'),
  lastModified: response.headers.get('last-modified'),
  location: response.headers.get('location'),
})

const createSafety = (): ShowdownEngineArchiveMetadataFetchResult['safety'] => ({
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
  customFormatsOverlayOnly: true,
  noArchiveBodyDownload: true,
  noArchiveExtraction: true,
  noFileIo: true,
  noDynamicImports: true,
  noLoaderExecution: true,
  noSimulationExecution: true,
})

const createResult = (
  status: ShowdownEngineArchiveMetadataFetchStatus,
  request: ShowdownEngineArchiveMetadataFetchRequest,
  fetchedAt: string,
  headers: ShowdownEngineArchiveMetadataFetchHeaders | null,
  errorMessage: string | null,
): ShowdownEngineArchiveMetadataFetchResult => {
  const adapterResult =
    status === 'complete'
      ? createShowdownEngineArchiveDownloadAdapterDryRunResult(sampleShowdownEngineArchiveExecutionPlan)
      : createShowdownEngineArchiveDownloadAdapterDryRunResult(createFailedShowdownEngineArchiveExecutionPlan())

  return {
    status,
    request,
    fetchedAt,
    headers,
    errorMessage,
    adapterResult,
    readModel: createShowdownEngineArchiveDownloadReadModel(adapterResult),
    previousActivePreserved: adapterResult.previousActivePreserved,
    safety: createSafety(),
    boundaryNotes: [
      'Metadata fetch proof is explicit-call only and does not run on import, app load, or panel open.',
      'Metadata fetch proof uses HEAD and must not download the archive body.',
      'Metadata fetch proof does not extract archives, write files, dynamically import downloaded code, or execute loaders.',
      'Pokemon Showdown remains the legality and simulation source of truth.',
      'PokeAPI/catalog data remains enrichment-only.',
      'BattleLab custom formats remain overlays and must not mutate upstream Pokemon Showdown source.',
    ],
  }
}

export async function fetchShowdownEngineArchiveMetadataProof(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataFetchResult> {
  const sourceArchive = options.sourceArchive ?? sampleShowdownEngineArchiveExecutionPlan.request.sourceArchive
  const request = createRequest(sourceArchive)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const now = options.now ?? (() => new Date().toISOString())

  if (!fetchImpl) {
    return createResult('failed', request, now(), null, 'Fetch API is unavailable in this environment.')
  }

  try {
    const response = await fetchImpl(sourceArchive.archiveUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: options.signal,
    })
    const headers = createHeaders(response)

    return createResult(headers.ok ? 'complete' : 'failed', request, now(), headers, headers.ok ? null : `Archive metadata HEAD returned ${response.status}.`)
  } catch (error) {
    return createResult(
      'failed',
      request,
      now(),
      null,
      error instanceof Error ? error.message : 'Unknown archive metadata fetch error.',
    )
  }
}

export function createFailedShowdownEngineArchiveMetadataFetchProof(): ShowdownEngineArchiveMetadataFetchResult {
  const request = createRequest(sampleShowdownEngineArchiveExecutionPlan.request.sourceArchive)

  return createResult('failed', request, '2026-06-15T00:00:00.000Z', null, 'Static failure fixture for metadata fetch proof.')
}
