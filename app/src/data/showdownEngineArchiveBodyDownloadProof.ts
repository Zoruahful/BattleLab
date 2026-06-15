import {
  fetchShowdownEngineArchiveMetadataReadiness,
  type ShowdownEngineArchiveMetadataReadiness,
} from './showdownEngineArchiveMetadataReadiness'
import type { ShowdownEngineArchiveMetadataFetchProofOptions } from './showdownEngineArchiveMetadataFetchProof'

export type ShowdownEngineArchiveBodyDownloadProofStatus = 'complete' | 'failed' | 'cancelled'

export interface ShowdownEngineArchiveBodyDownloadProofOptions extends ShowdownEngineArchiveMetadataFetchProofOptions {
  maxBytes?: number
  metadataReadiness?: ShowdownEngineArchiveMetadataReadiness
}

export interface ShowdownEngineArchiveBodyDownloadProofRequest {
  requestId: string
  trigger: 'direct-validation-helper-call'
  method: 'GET'
  sourceArchiveUrl: string
  maxBytes: number
  explicitCallOnly: true
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
}

export interface ShowdownEngineArchiveBodyDownloadProofMetadataComparison {
  headStatusCode: number | null
  headFinalUrl: string | null
  bodyStatusCode: number | null
  bodyFinalUrl: string | null
  bodyRedirected: boolean
  contentTypeHint: string | null
  bodyContentType: string | null
  contentLengthHint: string | null
  bodyContentLength: string | null
  etagHint: string | null
  bodyEtag: string | null
  lastModifiedHint: string | null
  bodyLastModified: string | null
  contentLengthMatchesDownloadedBytes: boolean | null
  metadataHintsAreIntegrityProof: false
}

export interface ShowdownEngineArchiveBodyDownloadProofSafety {
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveBodyDownloadProofResult {
  proofId: string
  status: ShowdownEngineArchiveBodyDownloadProofStatus
  request: ShowdownEngineArchiveBodyDownloadProofRequest
  metadataReadiness: ShowdownEngineArchiveMetadataReadiness
  downloadedAt: string
  bodyStatusCode: number | null
  bodyFinalUrl: string | null
  bodyRedirected: boolean
  bodyContentType: string | null
  bodyContentLength: string | null
  downloadedByteLength: number
  sha256: string | null
  metadataComparison: ShowdownEngineArchiveBodyDownloadProofMetadataComparison
  errorMessage: string | null
  previousActivePreserved: true
  previousActiveRevisionId: string
  safety: ShowdownEngineArchiveBodyDownloadProofSafety
  boundaryNotes: string[]
}

export const showdownEngineArchiveBodyDownloadProofMaxBytes = 75 * 1024 * 1024

const createRequest = (
  readiness: ShowdownEngineArchiveMetadataReadiness,
  maxBytes: number,
): ShowdownEngineArchiveBodyDownloadProofRequest => ({
  requestId: 'showdown-engine-archive-body-download-proof',
  trigger: 'direct-validation-helper-call',
  method: 'GET',
  sourceArchiveUrl: readiness.source.archiveUrl,
  maxBytes,
  explicitCallOnly: true,
  noImportTimeDownload: true,
  noAppLoadDownload: true,
  noPanelOpenDownload: true,
})

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const createSha256 = async (payload: ArrayBuffer): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload)
  return toHex(digest)
}

const parseContentLength = (value: string | null): number | null => {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const createMetadataComparison = (
  readiness: ShowdownEngineArchiveMetadataReadiness,
  response: Response | null,
  downloadedByteLength: number,
): ShowdownEngineArchiveBodyDownloadProofMetadataComparison => {
  const bodyContentLength = response?.headers.get('content-length') ?? null
  const parsedBodyContentLength = parseContentLength(bodyContentLength)

  return {
    headStatusCode: readiness.headers.statusCode,
    headFinalUrl: readiness.headers.finalUrl,
    bodyStatusCode: response?.status ?? null,
    bodyFinalUrl: response?.url ?? null,
    bodyRedirected: response?.redirected ?? false,
    contentTypeHint: readiness.headers.contentType,
    bodyContentType: response?.headers.get('content-type') ?? null,
    contentLengthHint: readiness.headers.contentLength,
    bodyContentLength,
    etagHint: readiness.headers.etag,
    bodyEtag: response?.headers.get('etag') ?? null,
    lastModifiedHint: readiness.headers.lastModified,
    bodyLastModified: response?.headers.get('last-modified') ?? null,
    contentLengthMatchesDownloadedBytes: parsedBodyContentLength === null ? null : parsedBodyContentLength === downloadedByteLength,
    metadataHintsAreIntegrityProof: false,
  }
}

const createSafety = (): ShowdownEngineArchiveBodyDownloadProofSafety => ({
  noArchiveExtraction: true,
  noFileIo: true,
  noDynamicImports: true,
  noLoaderExecution: true,
  noCatalogUpdatePanelWiring: true,
  noSimulationExecution: true,
  customFormatsOverlayOnly: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

const createResult = (
  status: ShowdownEngineArchiveBodyDownloadProofStatus,
  request: ShowdownEngineArchiveBodyDownloadProofRequest,
  readiness: ShowdownEngineArchiveMetadataReadiness,
  downloadedAt: string,
  response: Response | null,
  downloadedByteLength: number,
  sha256: string | null,
  errorMessage: string | null,
): ShowdownEngineArchiveBodyDownloadProofResult => ({
  proofId: `${request.requestId}-${status}`,
  status,
  request,
  metadataReadiness: readiness,
  downloadedAt,
  bodyStatusCode: response?.status ?? null,
  bodyFinalUrl: response?.url ?? null,
  bodyRedirected: response?.redirected ?? false,
  bodyContentType: response?.headers.get('content-type') ?? null,
  bodyContentLength: response?.headers.get('content-length') ?? null,
  downloadedByteLength,
  sha256,
  metadataComparison: createMetadataComparison(readiness, response, downloadedByteLength),
  errorMessage,
  previousActivePreserved: true,
  previousActiveRevisionId: readiness.previousActiveRevisionId,
  safety: createSafety(),
  boundaryNotes: [
    ...readiness.boundaryNotes,
    'Archive body download proof is explicit-call only and never runs on import, app load, or panel open.',
    'Archive body is downloaded into memory only for SHA-256 proof and is not extracted, written, imported, loaded, or executed.',
    'Previous active Engine metadata remains preserved on failed or cancelled body download proof runs.',
  ],
})

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.name === 'AbortError'

export async function runShowdownEngineArchiveBodyDownloadProof(
  options: ShowdownEngineArchiveBodyDownloadProofOptions = {},
): Promise<ShowdownEngineArchiveBodyDownloadProofResult> {
  const maxBytes = options.maxBytes ?? showdownEngineArchiveBodyDownloadProofMaxBytes
  const readiness = options.metadataReadiness ?? await fetchShowdownEngineArchiveMetadataReadiness(options)
  const request = createRequest(readiness, maxBytes)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const now = options.now ?? (() => new Date().toISOString())

  if (readiness.status !== 'ready-for-planned-download') {
    return createResult('failed', request, readiness, now(), null, 0, null, `Archive metadata readiness is ${readiness.status}.`)
  }

  if (!fetchImpl) {
    return createResult('failed', request, readiness, now(), null, 0, null, 'Fetch API is unavailable in this environment.')
  }

  try {
    const response = await fetchImpl(readiness.source.archiveUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: options.signal,
    })
    const responseContentLength = parseContentLength(response.headers.get('content-length'))

    if (responseContentLength !== null && responseContentLength > maxBytes) {
      return createResult(
        'failed',
        request,
        readiness,
        now(),
        response,
        0,
        null,
        `Archive body content-length ${responseContentLength} exceeds max byte guard ${maxBytes}.`,
      )
    }

    if (!response.ok) {
      return createResult('failed', request, readiness, now(), response, 0, null, `Archive body GET returned ${response.status}.`)
    }

    const payload = await response.arrayBuffer()
    const downloadedByteLength = payload.byteLength

    if (downloadedByteLength > maxBytes) {
      return createResult(
        'failed',
        request,
        readiness,
        now(),
        response,
        downloadedByteLength,
        null,
        `Archive body byte length ${downloadedByteLength} exceeds max byte guard ${maxBytes}.`,
      )
    }

    return createResult('complete', request, readiness, now(), response, downloadedByteLength, await createSha256(payload), null)
  } catch (error) {
    return createResult(
      isAbortError(error) ? 'cancelled' : 'failed',
      request,
      readiness,
      now(),
      null,
      0,
      null,
      error instanceof Error ? error.message : 'Unknown archive body download proof error.',
    )
  }
}
