import {
  createFailedShowdownEngineArchiveMetadataReadModel,
  fetchShowdownEngineArchiveMetadataReadModel,
  type ShowdownEngineArchiveMetadataReadModel,
} from './showdownEngineArchiveMetadataReadModel'
import type { ShowdownEngineArchiveMetadataFetchProofOptions } from './showdownEngineArchiveMetadataFetchProof'

export type ShowdownEngineArchiveMetadataReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveMetadataReadModelValidationCode =
  | 'source-invalid'
  | 'fetch-boundary-invalid'
  | 'headers-invalid'
  | 'failed-state-invalid'
  | 'download-handoff-invalid'
  | 'preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'custom-overlay-invalid'

export interface ShowdownEngineArchiveMetadataReadModelValidationIssue {
  code: ShowdownEngineArchiveMetadataReadModelValidationCode
  severity: ShowdownEngineArchiveMetadataReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveMetadataReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveMetadataReadModelValidationIssue[]
  liveFetchStatus: ShowdownEngineArchiveMetadataReadModel['status']
  liveFetchStatusCode: number | null
  checkedReadModelCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveMetadataReadModelValidationCode,
  severity: ShowdownEngineArchiveMetadataReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveMetadataReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateReadModel = (
  readModel: ShowdownEngineArchiveMetadataReadModel,
  issues: ShowdownEngineArchiveMetadataReadModelValidationIssue[],
  path: string,
) => {
  if (
    readModel.source.repositoryOwner !== 'smogon' ||
    readModel.source.repositoryName !== 'pokemon-showdown' ||
    !readModel.source.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/') ||
    readModel.source.downloadStrategy !== 'https-archive-download'
  ) {
    issues.push(
      createIssue(
        'source-invalid',
        'error',
        `${path}.source`,
        'Archive metadata read-model must describe the Pokemon Showdown GitHub source archive.'),
    )
  }

  if (
    readModel.fetch.trigger !== 'direct-validation-helper-call' ||
    readModel.fetch.method !== 'HEAD' ||
    !readModel.fetch.explicitCallOnly ||
    !readModel.fetch.noImportTimeFetch ||
    !readModel.fetch.noAppLoadFetch ||
    !readModel.fetch.noPanelOpenFetch
  ) {
    issues.push(
      createIssue(
        'fetch-boundary-invalid',
        'error',
        `${path}.fetch`,
        'Archive metadata read-model must preserve explicit-call-only HEAD fetch boundaries.',
      ),
    )
  }

  if (
    readModel.status === 'complete' &&
    (!readModel.headers.ok || readModel.headers.statusCode === null || readModel.headers.statusCode < 200 || readModel.headers.statusCode >= 400)
  ) {
    issues.push(
      createIssue(
        'headers-invalid',
        'error',
        `${path}.headers`,
        'Complete archive metadata read-model must include an OK or redirect HEAD status without archive body download.',
      ),
    )
  }

  if (readModel.status === 'failed' && !readModel.fetch.errorMessage) {
    issues.push(
      createIssue(
        'failed-state-invalid',
        'error',
        `${path}.fetch.errorMessage`,
        'Failed archive metadata read-model must expose the metadata fetch error message.',
      ),
    )
  }

  if (
    !readModel.downloadReadModelHandoff.readModelId ||
    readModel.downloadReadModelHandoff.safety.noArchiveExtraction !== true ||
    readModel.downloadReadModelHandoff.safety.noFileIo !== true ||
    readModel.downloadReadModelHandoff.safety.noLoaderExecution !== true ||
    readModel.downloadReadModelHandoff.safety.noSimulationExecution !== true
  ) {
    issues.push(
      createIssue(
        'download-handoff-invalid',
        'error',
        `${path}.downloadReadModelHandoff`,
        'Archive metadata read-model must carry a dry-run archive download read-model handoff with closed execution safety flags.',
      ),
    )
  }

  if (
    !readModel.preservation.previousActivePreserved ||
    (readModel.status === 'failed' && readModel.preservation.promotedRevisionId !== null)
  ) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.preservation`,
        'Failed archive metadata read-model must preserve the previous active Engine and avoid promotion.',
      ),
    )
  }

  if (
    !readModel.safety.noArchiveBodyDownload ||
    !readModel.safety.noArchiveExtraction ||
    !readModel.safety.noFileIo ||
    !readModel.safety.noDynamicImports ||
    !readModel.safety.noLoaderExecution ||
    !readModel.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Archive metadata read-model safety flags must remain closed for archive body download, extraction, file IO, loader execution, and simulation.',
      ),
    )
  }

  if (
    readModel.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readModel.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }

  if (!readModel.safety.customFormatsOverlayOnly) {
    issues.push(
      createIssue(
        'custom-overlay-invalid',
        'error',
        `${path}.safety.customFormatsOverlayOnly`,
        'BattleLab custom formats must remain overlays and must not mutate upstream Pokemon Showdown source.',
      ),
    )
  }
}

export async function validateShowdownEngineArchiveMetadataReadModel(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataReadModelValidationResult> {
  const issues: ShowdownEngineArchiveMetadataReadModelValidationIssue[] = []
  const liveReadModel = await fetchShowdownEngineArchiveMetadataReadModel(options)
  const failedReadModel = createFailedShowdownEngineArchiveMetadataReadModel()
  const readModels = [liveReadModel, failedReadModel]

  readModels.forEach((readModel, index) => validateReadModel(readModel, issues, `readModels.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    liveFetchStatus: liveReadModel.status,
    liveFetchStatusCode: liveReadModel.headers.statusCode,
    checkedReadModelCount: readModels.length,
  }
}

