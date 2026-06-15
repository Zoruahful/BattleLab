import {
  runShowdownEngineArchiveBodyDownloadProof,
  type ShowdownEngineArchiveBodyDownloadProofResult,
} from './showdownEngineArchiveBodyDownloadProof'
import { fetchShowdownEngineArchiveMetadataReadiness } from './showdownEngineArchiveMetadataReadiness'

export type ShowdownEngineArchiveBodyDownloadProofValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveBodyDownloadProofValidationCode =
  | 'explicit-call-invalid'
  | 'download-invalid'
  | 'hash-invalid'
  | 'metadata-comparison-invalid'
  | 'preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'cancelled-fallback-invalid'

export interface ShowdownEngineArchiveBodyDownloadProofValidationIssue {
  code: ShowdownEngineArchiveBodyDownloadProofValidationCode
  severity: ShowdownEngineArchiveBodyDownloadProofValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveBodyDownloadProofValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveBodyDownloadProofValidationIssue[]
  liveDownloadStatus: ShowdownEngineArchiveBodyDownloadProofResult['status']
  downloadedByteLength: number
  sha256: string | null
  cancelledFixtureStatus: ShowdownEngineArchiveBodyDownloadProofResult['status']
  checkedResultCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveBodyDownloadProofValidationCode,
  severity: ShowdownEngineArchiveBodyDownloadProofValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveBodyDownloadProofValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateResult = (
  result: ShowdownEngineArchiveBodyDownloadProofResult,
  issues: ShowdownEngineArchiveBodyDownloadProofValidationIssue[],
  path: string,
) => {
  if (
    result.request.trigger !== 'direct-validation-helper-call' ||
    result.request.method !== 'GET' ||
    !result.request.explicitCallOnly ||
    !result.request.noImportTimeDownload ||
    !result.request.noAppLoadDownload ||
    !result.request.noPanelOpenDownload
  ) {
    issues.push(createIssue('explicit-call-invalid', 'error', `${path}.request`, 'Archive body proof must remain explicit-call only.'))
  }

  if (result.status === 'complete') {
    if (result.bodyStatusCode === null || result.bodyStatusCode < 200 || result.bodyStatusCode >= 300 || result.downloadedByteLength <= 0) {
      issues.push(createIssue('download-invalid', 'error', `${path}.body`, 'Complete archive body proof must report a successful GET and positive in-memory byte count.'))
    }

    if (!result.sha256 || !/^[a-f0-9]{64}$/.test(result.sha256)) {
      issues.push(createIssue('hash-invalid', 'error', `${path}.sha256`, 'Complete archive body proof must compute a SHA-256 hex digest.'))
    }
  }

  if (
    result.metadataComparison.metadataHintsAreIntegrityProof ||
    (result.metadataComparison.bodyContentLength !== null &&
      result.metadataComparison.contentLengthMatchesDownloadedBytes === null)
  ) {
    issues.push(
      createIssue(
        'metadata-comparison-invalid',
        'error',
        `${path}.metadataComparison`,
        'Metadata comparison must keep HEAD/body hints non-authoritative and explicitly compare body content length when available.',
      ),
    )
  }

  if (!result.previousActivePreserved || (result.status !== 'complete' && result.previousActiveRevisionId.length === 0)) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.previousActivePreserved`,
        'Archive body proof must preserve previous active Engine metadata on failure or cancellation.',
      ),
    )
  }

  if (
    !result.safety.noArchiveExtraction ||
    !result.safety.noFileIo ||
    !result.safety.noDynamicImports ||
    !result.safety.noLoaderExecution ||
    !result.safety.noCatalogUpdatePanelWiring ||
    !result.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Archive body proof must keep extraction, file IO, dynamic imports, loader execution, UI wiring, and simulation disabled.',
      ),
    )
  }

  if (
    result.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    result.safety.catalogRole !== 'enrichment-only' ||
    !result.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Authority boundaries must keep Pokemon Showdown as source of truth, PokeAPI/catalog enrichment-only, and custom formats overlay-only.',
      ),
    )
  }
}

const createCancelledFixture = async (): Promise<ShowdownEngineArchiveBodyDownloadProofResult> => {
  const controller = new AbortController()
  controller.abort()
  const metadataReadiness = await fetchShowdownEngineArchiveMetadataReadiness()

  return runShowdownEngineArchiveBodyDownloadProof({
    signal: controller.signal,
    metadataReadiness,
    fetchImpl: async () => {
      throw new DOMException('Archive body proof fixture cancelled.', 'AbortError')
    },
  })
}

export async function validateShowdownEngineArchiveBodyDownloadProof(): Promise<ShowdownEngineArchiveBodyDownloadProofValidationResult> {
  const issues: ShowdownEngineArchiveBodyDownloadProofValidationIssue[] = []
  const liveResult = await runShowdownEngineArchiveBodyDownloadProof()
  const cancelledResult = await createCancelledFixture()
  const results = [liveResult, cancelledResult]

  results.forEach((result, index) => validateResult(result, issues, `results.${index}`))

  if (cancelledResult.status !== 'cancelled' || !cancelledResult.previousActivePreserved) {
    issues.push(
      createIssue(
        'cancelled-fallback-invalid',
        'error',
        'results.1',
        'Cancelled archive body proof fixture must report cancelled status and preserve previous active Engine metadata.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    liveDownloadStatus: liveResult.status,
    downloadedByteLength: liveResult.downloadedByteLength,
    sha256: liveResult.sha256,
    cancelledFixtureStatus: cancelledResult.status,
    checkedResultCount: results.length,
  }
}
