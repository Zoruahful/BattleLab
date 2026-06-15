import {
  createFailedShowdownEngineArchiveMetadataReadiness,
  createShowdownEngineArchiveMetadataReadiness,
  fetchShowdownEngineArchiveMetadataReadiness,
  type ShowdownEngineArchiveMetadataReadiness,
} from './showdownEngineArchiveMetadataReadiness'
import {
  createShowdownEngineArchiveMetadataReadModel,
  type ShowdownEngineArchiveMetadataReadModel,
} from './showdownEngineArchiveMetadataReadModel'
import { createFailedShowdownEngineArchiveMetadataFetchProof } from './showdownEngineArchiveMetadataFetchProof'
import type { ShowdownEngineArchiveMetadataFetchProofOptions } from './showdownEngineArchiveMetadataFetchProof'

export type ShowdownEngineArchiveMetadataReadinessValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveMetadataReadinessValidationCode =
  | 'source-invalid'
  | 'status-invalid'
  | 'header-presence-invalid'
  | 'checksum-readiness-invalid'
  | 'preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'custom-overlay-invalid'

export interface ShowdownEngineArchiveMetadataReadinessValidationIssue {
  code: ShowdownEngineArchiveMetadataReadinessValidationCode
  severity: ShowdownEngineArchiveMetadataReadinessValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveMetadataReadinessValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveMetadataReadinessValidationIssue[]
  liveReadinessStatus: ShowdownEngineArchiveMetadataReadiness['status']
  liveFetchStatusCode: number | null
  coveredStatuses: ShowdownEngineArchiveMetadataReadiness['status'][]
  checkedReadinessCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveMetadataReadinessValidationCode,
  severity: ShowdownEngineArchiveMetadataReadinessValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveMetadataReadinessValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createIncompleteReadiness = (): ShowdownEngineArchiveMetadataReadiness => {
  const failedResult = createFailedShowdownEngineArchiveMetadataFetchProof()
  const incompleteReadModel: ShowdownEngineArchiveMetadataReadModel = {
    ...createShowdownEngineArchiveMetadataReadModel({
      ...failedResult,
      status: 'complete',
      headers: {
        statusCode: 204,
        ok: true,
        finalUrl: '',
        redirected: false,
        contentType: null,
        contentLength: null,
        etag: null,
        lastModified: null,
        location: null,
      },
      errorMessage: null,
    }),
  }

  return createShowdownEngineArchiveMetadataReadiness(incompleteReadModel)
}

const validateReadiness = (
  readiness: ShowdownEngineArchiveMetadataReadiness,
  issues: ShowdownEngineArchiveMetadataReadinessValidationIssue[],
  path: string,
) => {
  if (
    readiness.source.repositoryOwner !== 'smogon' ||
    readiness.source.repositoryName !== 'pokemon-showdown' ||
    !readiness.source.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/')
  ) {
    issues.push(createIssue('source-invalid', 'error', `${path}.source`, 'Readiness must target the Pokemon Showdown GitHub source archive.'))
  }

  if (
    readiness.status === 'ready-for-planned-download' &&
    (!readiness.headers.ok || !readiness.headerPresence.hasStatusCode || !readiness.headerPresence.hasContentType)
  ) {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.status`,
        'Ready metadata must include a successful HEAD status and minimum header hints for planned download handoff.',
      ),
    )
  }

  if (readiness.status === 'metadata-fetch-failed' && readiness.fetchErrorMessage === null) {
    issues.push(createIssue('status-invalid', 'error', `${path}.fetchErrorMessage`, 'Failed metadata readiness must expose a fetch error message.'))
  }

  if (
    readiness.headerPresence.hasContentLength !== Boolean(readiness.headers.contentLength) ||
    readiness.headerPresence.hasEtag !== Boolean(readiness.headers.etag) ||
    readiness.headerPresence.hasLastModified !== Boolean(readiness.headers.lastModified) ||
    readiness.headerPresence.hasLocation !== Boolean(readiness.headers.location)
  ) {
    issues.push(createIssue('header-presence-invalid', 'error', `${path}.headerPresence`, 'Header presence flags must match nullable header values.'))
  }

  if (
    readiness.checksumReadiness.archiveBodyChecksumRequiredLater !== true ||
    readiness.checksumReadiness.metadataHintsAreIntegrityProof !== false ||
    (readiness.status === 'metadata-fetch-failed' && readiness.checksumReadiness.status !== 'metadata-unavailable')
  ) {
    issues.push(
      createIssue(
        'checksum-readiness-invalid',
        'error',
        `${path}.checksumReadiness`,
        'Checksum readiness must keep metadata hints non-authoritative and require future archive body validation.',
      ),
    )
  }

  if (!readiness.previousActivePreserved || (readiness.status !== 'ready-for-planned-download' && !readiness.blockedFromPromotion)) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.previousActivePreserved`,
        'Incomplete or failed metadata readiness must preserve previous active Engine and block promotion.',
      ),
    )
  }

  if (
    !readiness.safety.noArchiveBodyDownload ||
    !readiness.safety.noArchiveExtraction ||
    !readiness.safety.noFileIo ||
    !readiness.safety.noDynamicImports ||
    !readiness.safety.noLoaderExecution ||
    !readiness.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Readiness safety flags must remain closed for archive body download, extraction, file IO, loader execution, and simulation.',
      ),
    )
  }

  if (
    readiness.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readiness.safety.catalogRole !== 'enrichment-only'
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

  if (!readiness.safety.customFormatsOverlayOnly) {
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

export async function validateShowdownEngineArchiveMetadataReadiness(
  options: ShowdownEngineArchiveMetadataFetchProofOptions = {},
): Promise<ShowdownEngineArchiveMetadataReadinessValidationResult> {
  const issues: ShowdownEngineArchiveMetadataReadinessValidationIssue[] = []
  const liveReadiness = await fetchShowdownEngineArchiveMetadataReadiness(options)
  const failedReadiness = createFailedShowdownEngineArchiveMetadataReadiness()
  const incompleteReadiness = createIncompleteReadiness()
  const readinessResults = [liveReadiness, failedReadiness, incompleteReadiness]

  readinessResults.forEach((readiness, index) => validateReadiness(readiness, issues, `readinessResults.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    liveReadinessStatus: liveReadiness.status,
    liveFetchStatusCode: liveReadiness.headers.statusCode,
    coveredStatuses: Array.from(new Set(readinessResults.map((readiness) => readiness.status))),
    checkedReadinessCount: readinessResults.length,
  }
}

