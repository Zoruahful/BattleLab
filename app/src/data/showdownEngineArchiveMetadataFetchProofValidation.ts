import type { ShowdownEngineArchiveMetadataFetchResult } from './showdownEngineArchiveMetadataFetchProof'
import {
  createFailedShowdownEngineArchiveMetadataFetchProof,
  fetchShowdownEngineArchiveMetadataProof,
  type ShowdownEngineArchiveMetadataFetchProofOptions,
} from './showdownEngineArchiveMetadataFetchProof'

export type ShowdownEngineArchiveMetadataFetchProofValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveMetadataFetchProofValidationCode =
  | 'explicit-call-invalid'
  | 'source-invalid'
  | 'metadata-fetch-invalid'
  | 'read-model-boundary-invalid'
  | 'failed-preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'custom-overlay-invalid'

export interface ShowdownEngineArchiveMetadataFetchProofValidationIssue {
  code: ShowdownEngineArchiveMetadataFetchProofValidationCode
  severity: ShowdownEngineArchiveMetadataFetchProofValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveMetadataFetchProofValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveMetadataFetchProofValidationIssue[]
  liveFetchStatus: ShowdownEngineArchiveMetadataFetchResult['status']
  liveFetchStatusCode: number | null
  checkedResultCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveMetadataFetchProofValidationCode,
  severity: ShowdownEngineArchiveMetadataFetchProofValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveMetadataFetchProofValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateResult = (
  result: ShowdownEngineArchiveMetadataFetchResult,
  issues: ShowdownEngineArchiveMetadataFetchProofValidationIssue[],
  path: string,
) => {
  if (
    result.request.trigger !== 'direct-validation-helper-call' ||
    result.request.method !== 'HEAD' ||
    !result.request.explicitCallOnly ||
    !result.request.noImportTimeFetch ||
    !result.request.noAppLoadFetch ||
    !result.request.noPanelOpenFetch
  ) {
    issues.push(
      createIssue(
        'explicit-call-invalid',
        'error',
        `${path}.request`,
        'Metadata fetch proof must remain explicit-call only and use HEAD requests.',
      ),
    )
  }

  if (
    result.request.sourceArchive.repositoryOwner !== 'smogon' ||
    result.request.sourceArchive.repositoryName !== 'pokemon-showdown' ||
    !result.request.sourceArchive.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/') ||
    result.request.sourceArchive.downloadStrategy !== 'https-archive-download'
  ) {
    issues.push(
      createIssue(
        'source-invalid',
        'error',
        `${path}.request.sourceArchive`,
        'Metadata fetch proof must target the Pokemon Showdown GitHub source archive metadata.',
      ),
    )
  }

  if (result.status === 'complete' && (!result.headers?.ok || result.headers.statusCode < 200 || result.headers.statusCode >= 400)) {
    issues.push(
      createIssue(
        'metadata-fetch-invalid',
        'error',
        `${path}.headers`,
        'Successful metadata fetch must report an OK or redirect metadata response without downloading the archive body.',
      ),
    )
  }

  if (!result.readModel.readModelId || result.readModel.safety.noRealNetworkRequest !== true) {
    issues.push(
      createIssue(
        'read-model-boundary-invalid',
        'error',
        `${path}.readModel`,
        'Metadata fetch result must map into the existing archive download read-model boundary.',
      ),
    )
  }

  if (result.status === 'failed' && (
    !result.previousActivePreserved ||
    result.adapterResult.decision.promotedRevision ||
    result.readModel.decision.promotedRevisionId
  )) {
    issues.push(
      createIssue(
        'failed-preservation-invalid',
        'error',
        `${path}.previousActivePreserved`,
        'Failed metadata fetch must preserve previous active Engine metadata and avoid promotion.',
      ),
    )
  }

  if (
    !result.request.noArchiveBodyDownload ||
    !result.request.noArchiveExtraction ||
    !result.request.noFileIo ||
    !result.request.noDynamicImports ||
    !result.request.noLoaderExecution ||
    !result.request.noSimulationExecution ||
    !result.safety.noArchiveBodyDownload ||
    !result.safety.noArchiveExtraction ||
    !result.safety.noFileIo ||
    !result.safety.noDynamicImports ||
    !result.safety.noLoaderExecution ||
    !result.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Metadata fetch proof safety flags must remain closed for archive body download, extraction, file IO, loader execution, and simulation.',
      ),
    )
  }

  if (
    result.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    result.safety.catalogRole !== 'enrichment-only'
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

  if (!result.safety.customFormatsOverlayOnly) {
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

export async function validateShowdownEngineArchiveMetadataFetchProof(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataFetchProofValidationResult> {
  const issues: ShowdownEngineArchiveMetadataFetchProofValidationIssue[] = []
  const liveResult = await fetchShowdownEngineArchiveMetadataProof(options)
  const failedResult = createFailedShowdownEngineArchiveMetadataFetchProof()
  const results = [liveResult, failedResult]

  results.forEach((result, index) => validateResult(result, issues, `results.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    liveFetchStatus: liveResult.status,
    liveFetchStatusCode: liveResult.headers?.statusCode ?? null,
    checkedResultCount: results.length,
  }
}
