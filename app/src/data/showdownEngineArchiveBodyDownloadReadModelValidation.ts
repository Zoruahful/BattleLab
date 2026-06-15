import {
  createShowdownEngineArchiveBodyDownloadReadModel,
  fetchShowdownEngineArchiveBodyDownloadReadModel,
  type ShowdownEngineArchiveBodyDownloadReadModel,
} from './showdownEngineArchiveBodyDownloadReadModel'
import { runShowdownEngineArchiveBodyDownloadProof } from './showdownEngineArchiveBodyDownloadProof'
import { fetchShowdownEngineArchiveMetadataReadiness } from './showdownEngineArchiveMetadataReadiness'

export type ShowdownEngineArchiveBodyDownloadReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveBodyDownloadReadModelValidationCode =
  | 'source-invalid'
  | 'download-invalid'
  | 'hash-policy-invalid'
  | 'metadata-comparison-invalid'
  | 'preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'cancelled-state-invalid'

export interface ShowdownEngineArchiveBodyDownloadReadModelValidationIssue {
  code: ShowdownEngineArchiveBodyDownloadReadModelValidationCode
  severity: ShowdownEngineArchiveBodyDownloadReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveBodyDownloadReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveBodyDownloadReadModelValidationIssue[]
  liveReadModelStatus: ShowdownEngineArchiveBodyDownloadReadModel['status']
  downloadedByteLength: number
  sha256: string | null
  hashPolicyStatus: ShowdownEngineArchiveBodyDownloadReadModel['hash']['status']
  cancelledFixtureStatus: ShowdownEngineArchiveBodyDownloadReadModel['status']
  checkedReadModelCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveBodyDownloadReadModelValidationCode,
  severity: ShowdownEngineArchiveBodyDownloadReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveBodyDownloadReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateReadModel = (
  readModel: ShowdownEngineArchiveBodyDownloadReadModel,
  issues: ShowdownEngineArchiveBodyDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (
    readModel.source.repositoryOwner !== 'smogon' ||
    readModel.source.repositoryName !== 'pokemon-showdown' ||
    !readModel.source.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/')
  ) {
    issues.push(createIssue('source-invalid', 'error', `${path}.source`, 'Archive body read-model must target the Pokemon Showdown GitHub source archive.'))
  }

  if (readModel.status === 'complete' && (
    readModel.download.bodyStatusCode === null ||
    readModel.download.bodyStatusCode < 200 ||
    readModel.download.bodyStatusCode >= 300 ||
    readModel.download.downloadedByteLength <= 0
  )) {
    issues.push(createIssue('download-invalid', 'error', `${path}.download`, 'Complete archive body read-model must include successful status and positive byte count.'))
  }

  if (
    readModel.status === 'complete' &&
    (!readModel.hash.sha256 ||
      readModel.hash.status !== 'downloaded-body-only' ||
      !readModel.hash.downloadedBodyHashOnly ||
      readModel.hash.approvedPinnedEngineChecksum ||
      !readModel.hash.pinnedChecksumPolicyNeeded)
  ) {
    issues.push(
      createIssue(
        'hash-policy-invalid',
        'error',
        `${path}.hash`,
        'Archive body hash must remain downloaded-body-only and require a future pinned checksum policy.',
      ),
    )
  }

  if (readModel.metadataComparison.metadataHintsAreIntegrityProof) {
    issues.push(
      createIssue(
        'metadata-comparison-invalid',
        'error',
        `${path}.metadataComparison`,
        'HEAD/readiness metadata comparison must not be represented as real archive integrity proof.',
      ),
    )
  }

  if (!readModel.preservation.previousActivePreserved || !readModel.preservation.failedOrCancelledKeepsPreviousActive) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.preservation`,
        'Archive body read-model must preserve previous active Engine metadata for failed/cancelled paths.',
      ),
    )
  }

  if (
    !readModel.safety.explicitCallOnly ||
    !readModel.safety.noImportTimeDownload ||
    !readModel.safety.noAppLoadDownload ||
    !readModel.safety.noPanelOpenDownload ||
    !readModel.safety.noArchiveExtraction ||
    !readModel.safety.noFileIo ||
    !readModel.safety.noDynamicImports ||
    !readModel.safety.noLoaderExecution ||
    !readModel.safety.noCatalogUpdatePanelWiring ||
    !readModel.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Archive body read-model safety flags must keep import/app/panel execution, extraction, file IO, loader execution, UI wiring, and simulation closed.',
      ),
    )
  }

  if (
    readModel.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readModel.safety.catalogRole !== 'enrichment-only' ||
    !readModel.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Authority boundaries must preserve Pokemon Showdown source-of-truth, PokeAPI enrichment-only, and custom format overlays.',
      ),
    )
  }

  if (readModel.status === 'cancelled' && readModel.download.errorMessage === null) {
    issues.push(createIssue('cancelled-state-invalid', 'error', `${path}.download.errorMessage`, 'Cancelled archive body read-model must surface cancellation detail.'))
  }
}

const createCancelledReadModel = async (): Promise<ShowdownEngineArchiveBodyDownloadReadModel> => {
  const controller = new AbortController()
  controller.abort()
  const metadataReadiness = await fetchShowdownEngineArchiveMetadataReadiness()
  const cancelledResult = await runShowdownEngineArchiveBodyDownloadProof({
    signal: controller.signal,
    metadataReadiness,
    fetchImpl: async () => {
      throw new DOMException('Archive body read-model fixture cancelled.', 'AbortError')
    },
  })

  return createShowdownEngineArchiveBodyDownloadReadModel(cancelledResult)
}

export async function validateShowdownEngineArchiveBodyDownloadReadModel(): Promise<ShowdownEngineArchiveBodyDownloadReadModelValidationResult> {
  const issues: ShowdownEngineArchiveBodyDownloadReadModelValidationIssue[] = []
  const liveReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const cancelledReadModel = await createCancelledReadModel()
  const readModels = [liveReadModel, cancelledReadModel]

  readModels.forEach((readModel, index) => validateReadModel(readModel, issues, `readModels.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    liveReadModelStatus: liveReadModel.status,
    downloadedByteLength: liveReadModel.download.downloadedByteLength,
    sha256: liveReadModel.hash.sha256,
    hashPolicyStatus: liveReadModel.hash.status,
    cancelledFixtureStatus: cancelledReadModel.status,
    checkedReadModelCount: readModels.length,
  }
}

