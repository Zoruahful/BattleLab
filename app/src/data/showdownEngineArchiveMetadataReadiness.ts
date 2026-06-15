import {
  createFailedShowdownEngineArchiveMetadataReadModel,
  fetchShowdownEngineArchiveMetadataReadModel,
  type ShowdownEngineArchiveMetadataHeadersSummary,
  type ShowdownEngineArchiveMetadataReadModel,
  type ShowdownEngineArchiveMetadataSourceSummary,
} from './showdownEngineArchiveMetadataReadModel'
import type { ShowdownEngineArchiveMetadataFetchProofOptions } from './showdownEngineArchiveMetadataFetchProof'

export type ShowdownEngineArchiveMetadataReadinessStatus =
  | 'ready-for-planned-download'
  | 'metadata-incomplete'
  | 'metadata-fetch-failed'

export type ShowdownEngineArchiveChecksumReadinessStatus =
  | 'metadata-hints-only'
  | 'metadata-unavailable'

export interface ShowdownEngineArchiveMetadataHeaderPresence {
  hasStatusCode: boolean
  hasFinalUrl: boolean
  hasRedirectStatus: boolean
  hasContentType: boolean
  hasContentLength: boolean
  hasEtag: boolean
  hasLastModified: boolean
  hasLocation: boolean
}

export interface ShowdownEngineArchiveMetadataChecksumReadiness {
  status: ShowdownEngineArchiveChecksumReadinessStatus
  metadataHints: {
    etag: string | null
    contentLength: string | null
    lastModified: string | null
  }
  archiveBodyChecksumRequiredLater: true
  metadataHintsAreIntegrityProof: false
  message: string
}

export interface ShowdownEngineArchiveMetadataReadinessSafety {
  noArchiveBodyDownload: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveMetadataReadiness {
  readinessId: string
  status: ShowdownEngineArchiveMetadataReadinessStatus
  message: string
  source: ShowdownEngineArchiveMetadataSourceSummary
  fetchStatus: ShowdownEngineArchiveMetadataReadModel['status']
  fetchErrorMessage: string | null
  headers: ShowdownEngineArchiveMetadataHeadersSummary
  headerPresence: ShowdownEngineArchiveMetadataHeaderPresence
  checksumReadiness: ShowdownEngineArchiveMetadataChecksumReadiness
  previousActivePreserved: true
  previousActiveRevisionId: string
  blockedFromPromotion: boolean
  safety: ShowdownEngineArchiveMetadataReadinessSafety
  boundaryNotes: string[]
}

const createHeaderPresence = (
  headers: ShowdownEngineArchiveMetadataHeadersSummary,
): ShowdownEngineArchiveMetadataHeaderPresence => ({
  hasStatusCode: headers.statusCode !== null,
  hasFinalUrl: Boolean(headers.finalUrl),
  hasRedirectStatus: typeof headers.redirected === 'boolean',
  hasContentType: Boolean(headers.contentType),
  hasContentLength: Boolean(headers.contentLength),
  hasEtag: Boolean(headers.etag),
  hasLastModified: Boolean(headers.lastModified),
  hasLocation: Boolean(headers.location),
})

const createChecksumReadiness = (
  readModel: ShowdownEngineArchiveMetadataReadModel,
): ShowdownEngineArchiveMetadataChecksumReadiness => {
  if (readModel.status === 'failed') {
    return {
      status: 'metadata-unavailable',
      metadataHints: {
        etag: null,
        contentLength: null,
        lastModified: null,
      },
      archiveBodyChecksumRequiredLater: true,
      metadataHintsAreIntegrityProof: false,
      message: 'Archive metadata is unavailable; archive body checksum validation remains required in a future approved download lane.',
    }
  }

  return {
    status: 'metadata-hints-only',
    metadataHints: {
      etag: readModel.headers.etag,
      contentLength: readModel.headers.contentLength,
      lastModified: readModel.headers.lastModified,
    },
    archiveBodyChecksumRequiredLater: true,
    metadataHintsAreIntegrityProof: false,
    message: 'HEAD metadata can help plan a future archive request, but it is not archive integrity proof.',
  }
}

const determineStatus = (
  readModel: ShowdownEngineArchiveMetadataReadModel,
  headerPresence: ShowdownEngineArchiveMetadataHeaderPresence,
): ShowdownEngineArchiveMetadataReadinessStatus => {
  if (readModel.status === 'failed') {
    return 'metadata-fetch-failed'
  }

  if (
    readModel.headers.ok &&
    headerPresence.hasStatusCode &&
    (headerPresence.hasFinalUrl || headerPresence.hasLocation) &&
    headerPresence.hasContentType
  ) {
    return 'ready-for-planned-download'
  }

  return 'metadata-incomplete'
}

const createMessage = (status: ShowdownEngineArchiveMetadataReadinessStatus): string => {
  if (status === 'metadata-fetch-failed') {
    return 'Archive metadata fetch failed; previous active Engine remains preserved.'
  }

  if (status === 'metadata-incomplete') {
    return 'Archive metadata is incomplete; future archive update planning must keep checksum and promotion blocked.'
  }

  return 'Archive metadata is ready for a future planned archive download handoff, with checksum validation still required later.'
}

export function createShowdownEngineArchiveMetadataReadiness(
  readModel: ShowdownEngineArchiveMetadataReadModel,
): ShowdownEngineArchiveMetadataReadiness {
  const headerPresence = createHeaderPresence(readModel.headers)
  const status = determineStatus(readModel, headerPresence)

  return {
    readinessId: `${readModel.readModelId}-readiness`,
    status,
    message: createMessage(status),
    source: readModel.source,
    fetchStatus: readModel.fetch.status,
    fetchErrorMessage: readModel.fetch.errorMessage,
    headers: readModel.headers,
    headerPresence,
    checksumReadiness: createChecksumReadiness(readModel),
    previousActivePreserved: readModel.preservation.previousActivePreserved,
    previousActiveRevisionId: readModel.preservation.previousActiveRevisionId,
    blockedFromPromotion: status !== 'ready-for-planned-download',
    safety: {
      noArchiveBodyDownload: readModel.safety.noArchiveBodyDownload,
      noArchiveExtraction: readModel.safety.noArchiveExtraction,
      noFileIo: readModel.safety.noFileIo,
      noDynamicImports: readModel.safety.noDynamicImports,
      noLoaderExecution: readModel.safety.noLoaderExecution,
      noSimulationExecution: readModel.safety.noSimulationExecution,
      customFormatsOverlayOnly: readModel.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: readModel.safety.pokemonShowdownAuthority,
      catalogRole: readModel.safety.catalogRole,
    },
    boundaryNotes: [
      ...readModel.boundaryNotes,
      'Archive metadata readiness treats HEAD headers as planning metadata only, not archive integrity proof.',
      'Archive body checksum validation remains required in a future approved download lane.',
    ],
  }
}

export function createFailedShowdownEngineArchiveMetadataReadiness(): ShowdownEngineArchiveMetadataReadiness {
  return createShowdownEngineArchiveMetadataReadiness(createFailedShowdownEngineArchiveMetadataReadModel())
}

export async function fetchShowdownEngineArchiveMetadataReadiness(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataReadiness> {
  return createShowdownEngineArchiveMetadataReadiness(await fetchShowdownEngineArchiveMetadataReadModel(options))
}

