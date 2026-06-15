import {
  createFailedShowdownEngineArchiveMetadataFetchProof,
  fetchShowdownEngineArchiveMetadataProof,
  type ShowdownEngineArchiveMetadataFetchHeaders,
  type ShowdownEngineArchiveMetadataFetchProofOptions,
  type ShowdownEngineArchiveMetadataFetchResult,
  type ShowdownEngineArchiveMetadataFetchStatus,
} from './showdownEngineArchiveMetadataFetchProof'
import type { ShowdownEngineArchiveDownloadReadModel } from './showdownEngineArchiveDownloadReadModel'

export type ShowdownEngineArchiveMetadataReadModelStatus = ShowdownEngineArchiveMetadataFetchStatus

export interface ShowdownEngineArchiveMetadataSourceSummary {
  repositoryOwner: string
  repositoryName: string
  archiveUrl: string
  revision: string
  versionLabel: string
  downloadStrategy: 'https-archive-download'
}

export interface ShowdownEngineArchiveMetadataHeadersSummary {
  statusCode: number | null
  ok: boolean
  finalUrl: string | null
  redirected: boolean
  contentType: string | null
  contentLength: string | null
  etag: string | null
  lastModified: string | null
  location: string | null
}

export interface ShowdownEngineArchiveMetadataFetchSummary {
  requestId: string
  mode: 'metadata-head-only'
  method: 'HEAD'
  trigger: 'direct-validation-helper-call'
  status: ShowdownEngineArchiveMetadataReadModelStatus
  fetchedAt: string
  errorMessage: string | null
  explicitCallOnly: true
  noImportTimeFetch: true
  noAppLoadFetch: true
  noPanelOpenFetch: true
}

export interface ShowdownEngineArchiveMetadataPreservationSummary {
  previousActivePreserved: true
  previousActiveRevisionId: string
  resultingActiveRevisionId: string
  promotedRevisionId: string | null
  rejectedRevisionId: string | null
}

export interface ShowdownEngineArchiveMetadataSafetySummary {
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

export interface ShowdownEngineArchiveMetadataReadModel {
  readModelId: string
  status: ShowdownEngineArchiveMetadataReadModelStatus
  message: string
  source: ShowdownEngineArchiveMetadataSourceSummary
  fetch: ShowdownEngineArchiveMetadataFetchSummary
  headers: ShowdownEngineArchiveMetadataHeadersSummary
  preservation: ShowdownEngineArchiveMetadataPreservationSummary
  downloadReadModelHandoff: ShowdownEngineArchiveDownloadReadModel
  safety: ShowdownEngineArchiveMetadataSafetySummary
  boundaryNotes: string[]
}

const createHeadersSummary = (
  headers: ShowdownEngineArchiveMetadataFetchHeaders | null,
): ShowdownEngineArchiveMetadataHeadersSummary => ({
  statusCode: headers?.statusCode ?? null,
  ok: headers?.ok ?? false,
  finalUrl: headers?.finalUrl ?? null,
  redirected: headers?.redirected ?? false,
  contentType: headers?.contentType ?? null,
  contentLength: headers?.contentLength ?? null,
  etag: headers?.etag ?? null,
  lastModified: headers?.lastModified ?? null,
  location: headers?.location ?? null,
})

const createMessage = (result: ShowdownEngineArchiveMetadataFetchResult): string => {
  if (result.status === 'failed') {
    return 'Showdown Engine archive metadata fetch failed; previous active Engine remains preserved.'
  }

  return 'Showdown Engine archive metadata is available for a future validated archive update handoff.'
}

export function createShowdownEngineArchiveMetadataReadModel(
  result: ShowdownEngineArchiveMetadataFetchResult,
): ShowdownEngineArchiveMetadataReadModel {
  return {
    readModelId: `${result.request.requestId}-read-model`,
    status: result.status,
    message: createMessage(result),
    source: {
      repositoryOwner: result.request.sourceArchive.repositoryOwner,
      repositoryName: result.request.sourceArchive.repositoryName,
      archiveUrl: result.request.sourceArchive.archiveUrl,
      revision: result.request.sourceArchive.revision,
      versionLabel: result.request.sourceArchive.versionLabel,
      downloadStrategy: result.request.sourceArchive.downloadStrategy,
    },
    fetch: {
      requestId: result.request.requestId,
      mode: result.request.mode,
      method: result.request.method,
      trigger: result.request.trigger,
      status: result.status,
      fetchedAt: result.fetchedAt,
      errorMessage: result.errorMessage,
      explicitCallOnly: result.request.explicitCallOnly,
      noImportTimeFetch: result.request.noImportTimeFetch,
      noAppLoadFetch: result.request.noAppLoadFetch,
      noPanelOpenFetch: result.request.noPanelOpenFetch,
    },
    headers: createHeadersSummary(result.headers),
    preservation: {
      previousActivePreserved: result.previousActivePreserved,
      previousActiveRevisionId: result.readModel.decision.previousActiveRevisionId,
      resultingActiveRevisionId: result.readModel.decision.resultingActiveRevisionId,
      promotedRevisionId: result.readModel.decision.promotedRevisionId,
      rejectedRevisionId: result.readModel.decision.rejectedRevisionId,
    },
    downloadReadModelHandoff: result.readModel,
    safety: {
      noArchiveBodyDownload: result.safety.noArchiveBodyDownload,
      noArchiveExtraction: result.safety.noArchiveExtraction,
      noFileIo: result.safety.noFileIo,
      noDynamicImports: result.safety.noDynamicImports,
      noLoaderExecution: result.safety.noLoaderExecution,
      noSimulationExecution: result.safety.noSimulationExecution,
      customFormatsOverlayOnly: result.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: result.safety.pokemonShowdownAuthority,
      catalogRole: result.safety.catalogRole,
    },
    boundaryNotes: [
      ...result.boundaryNotes,
      'Archive metadata read-model projection is serializable UI-safe data only and does not trigger fetches or Engine execution.',
    ],
  }
}

export function createFailedShowdownEngineArchiveMetadataReadModel(): ShowdownEngineArchiveMetadataReadModel {
  return createShowdownEngineArchiveMetadataReadModel(createFailedShowdownEngineArchiveMetadataFetchProof())
}

export async function fetchShowdownEngineArchiveMetadataReadModel(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataReadModel> {
  return createShowdownEngineArchiveMetadataReadModel(await fetchShowdownEngineArchiveMetadataProof(options))
}

