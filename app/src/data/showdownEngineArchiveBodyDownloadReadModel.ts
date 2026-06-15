import {
  runShowdownEngineArchiveBodyDownloadProof,
  type ShowdownEngineArchiveBodyDownloadProofMetadataComparison,
  type ShowdownEngineArchiveBodyDownloadProofOptions,
  type ShowdownEngineArchiveBodyDownloadProofResult,
  type ShowdownEngineArchiveBodyDownloadProofStatus,
} from './showdownEngineArchiveBodyDownloadProof'

export type ShowdownEngineArchiveBodyDownloadReadModelStatus = ShowdownEngineArchiveBodyDownloadProofStatus

export type ShowdownEngineArchiveBodyHashPolicyStatus =
  | 'downloaded-body-only'
  | 'pinned-checksum-policy-needed'
  | 'hash-unavailable'

export interface ShowdownEngineArchiveBodyDownloadSourceSummary {
  repositoryOwner: string
  repositoryName: string
  archiveUrl: string
  revision: string
  versionLabel: string
  downloadStrategy: 'https-archive-download'
}

export interface ShowdownEngineArchiveBodyDownloadSummary {
  status: ShowdownEngineArchiveBodyDownloadReadModelStatus
  requestedAt: string
  downloadedAt: string
  maxBytes: number
  downloadedByteLength: number
  bodyStatusCode: number | null
  bodyFinalUrl: string | null
  bodyRedirected: boolean
  bodyContentType: string | null
  bodyContentLength: string | null
  errorMessage: string | null
}

export interface ShowdownEngineArchiveBodyHashSummary {
  sha256: string | null
  status: ShowdownEngineArchiveBodyHashPolicyStatus
  downloadedBodyHashOnly: true
  approvedPinnedEngineChecksum: false
  pinnedChecksumPolicyNeeded: true
  message: string
}

export interface ShowdownEngineArchiveBodyPreservationSummary {
  previousActivePreserved: true
  previousActiveRevisionId: string
  failedOrCancelledKeepsPreviousActive: true
}

export interface ShowdownEngineArchiveBodySafetySummary {
  explicitCallOnly: true
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
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

export interface ShowdownEngineArchiveBodyDownloadReadModel {
  readModelId: string
  status: ShowdownEngineArchiveBodyDownloadReadModelStatus
  message: string
  source: ShowdownEngineArchiveBodyDownloadSourceSummary
  download: ShowdownEngineArchiveBodyDownloadSummary
  hash: ShowdownEngineArchiveBodyHashSummary
  metadataComparison: ShowdownEngineArchiveBodyDownloadProofMetadataComparison
  preservation: ShowdownEngineArchiveBodyPreservationSummary
  safety: ShowdownEngineArchiveBodySafetySummary
  boundaryNotes: string[]
}

const createHashSummary = (
  result: ShowdownEngineArchiveBodyDownloadProofResult,
): ShowdownEngineArchiveBodyHashSummary => {
  if (result.status !== 'complete' || !result.sha256) {
    return {
      sha256: result.sha256,
      status: 'hash-unavailable',
      downloadedBodyHashOnly: true,
      approvedPinnedEngineChecksum: false,
      pinnedChecksumPolicyNeeded: true,
      message: 'Archive body hash is unavailable; a future pinned checksum policy is still required before activation.',
    }
  }

  return {
    sha256: result.sha256,
    status: 'downloaded-body-only',
    downloadedBodyHashOnly: true,
    approvedPinnedEngineChecksum: false,
    pinnedChecksumPolicyNeeded: true,
    message: 'SHA-256 was computed for the in-memory downloaded body only and is not an approved pinned Engine checksum.',
  }
}

const createMessage = (result: ShowdownEngineArchiveBodyDownloadProofResult): string => {
  if (result.status === 'cancelled') {
    return 'Archive body download proof was cancelled; previous active Engine remains preserved.'
  }

  if (result.status === 'failed') {
    return 'Archive body download proof failed; previous active Engine remains preserved.'
  }

  return 'Archive body download proof completed in memory; extraction and activation remain blocked.'
}

export function createShowdownEngineArchiveBodyDownloadReadModel(
  result: ShowdownEngineArchiveBodyDownloadProofResult,
): ShowdownEngineArchiveBodyDownloadReadModel {
  return {
    readModelId: `${result.proofId}-read-model`,
    status: result.status,
    message: createMessage(result),
    source: result.metadataReadiness.source,
    download: {
      status: result.status,
      requestedAt: result.metadataReadiness.headers.finalUrl ?? result.request.sourceArchiveUrl,
      downloadedAt: result.downloadedAt,
      maxBytes: result.request.maxBytes,
      downloadedByteLength: result.downloadedByteLength,
      bodyStatusCode: result.bodyStatusCode,
      bodyFinalUrl: result.bodyFinalUrl,
      bodyRedirected: result.bodyRedirected,
      bodyContentType: result.bodyContentType,
      bodyContentLength: result.bodyContentLength,
      errorMessage: result.errorMessage,
    },
    hash: createHashSummary(result),
    metadataComparison: result.metadataComparison,
    preservation: {
      previousActivePreserved: result.previousActivePreserved,
      previousActiveRevisionId: result.previousActiveRevisionId,
      failedOrCancelledKeepsPreviousActive: true,
    },
    safety: {
      explicitCallOnly: result.request.explicitCallOnly,
      noImportTimeDownload: result.request.noImportTimeDownload,
      noAppLoadDownload: result.request.noAppLoadDownload,
      noPanelOpenDownload: result.request.noPanelOpenDownload,
      noArchiveExtraction: result.safety.noArchiveExtraction,
      noFileIo: result.safety.noFileIo,
      noDynamicImports: result.safety.noDynamicImports,
      noLoaderExecution: result.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: result.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: result.safety.noSimulationExecution,
      customFormatsOverlayOnly: result.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: result.safety.pokemonShowdownAuthority,
      catalogRole: result.safety.catalogRole,
    },
    boundaryNotes: [
      ...result.boundaryNotes,
      'Archive body download read-model is serializable status data only and does not trigger downloads by itself.',
      'Downloaded-body SHA-256 is not an approved pinned Engine checksum until a future source revision policy is approved.',
    ],
  }
}

export async function fetchShowdownEngineArchiveBodyDownloadReadModel(
  options: ShowdownEngineArchiveBodyDownloadProofOptions = {},
): Promise<ShowdownEngineArchiveBodyDownloadReadModel> {
  return createShowdownEngineArchiveBodyDownloadReadModel(await runShowdownEngineArchiveBodyDownloadProof(options))
}

