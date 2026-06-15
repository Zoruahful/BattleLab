import type {
  ShowdownEngineArchiveDownloadAdapterLifecycleStage,
  ShowdownEngineArchiveDownloadAdapterResult,
} from './showdownEngineArchiveDownloadAdapter'
import {
  sampleShowdownEngineArchiveDownloadAdapterDryRunResults,
} from './showdownEngineArchiveDownloadAdapter'

export type ShowdownEngineArchiveDownloadAdapterValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveDownloadAdapterValidationCode =
  | 'dry-run-fixture-missing'
  | 'explicit-trigger-invalid'
  | 'source-archive-invalid'
  | 'lifecycle-stage-missing'
  | 'validation-handoff-invalid'
  | 'failed-cancelled-preservation-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'custom-overlay-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineArchiveDownloadAdapterValidationIssue {
  code: ShowdownEngineArchiveDownloadAdapterValidationCode
  severity: ShowdownEngineArchiveDownloadAdapterValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveDownloadAdapterValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[]
  checkedResultCount: number
  checkedLifecycleStepCount: number
}

const requiredLifecycleStages: ShowdownEngineArchiveDownloadAdapterLifecycleStage[] = [
  'checking-current-engine',
  'resolving-github-archive',
  'planning-archive-download',
  'validating-checksum-handoff',
  'validating-required-files-handoff',
  'validating-format-registry-handoff',
  'planning-staging',
  'final-decision',
]

const createIssue = (
  code: ShowdownEngineArchiveDownloadAdapterValidationCode,
  severity: ShowdownEngineArchiveDownloadAdapterValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveDownloadAdapterValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateRequiredFixtures = (
  results: Record<string, ShowdownEngineArchiveDownloadAdapterResult>,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
) => {
  ;['complete', 'failed', 'cancelled'].forEach((key) => {
    if (!results[key]) {
      issues.push(
        createIssue(
          'dry-run-fixture-missing',
          'error',
          key,
          `Dry-run archive download adapter must include ${key} fixture.`,
        ),
      )
    }
  })
}

const validateTriggerAndSource = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  if (result.mode !== 'dry-run' || result.storageContract.trigger !== 'catalog-update-user-click-update') {
    issues.push(
      createIssue(
        'explicit-trigger-invalid',
        'error',
        `${path}.mode`,
        'Archive download adapter boundary must remain dry-run and future explicit user-triggered only.',
      ),
    )
  }

  if (
    result.sourceArchive.sourceKind !== 'github-source-archive' ||
    result.sourceArchive.repositoryOwner !== 'smogon' ||
    result.sourceArchive.repositoryName !== 'pokemon-showdown' ||
    result.sourceArchive.downloadStrategy !== 'https-archive-download' ||
    !result.sourceArchive.disallowGitClone ||
    !result.sourceArchive.disallowDynamicNpmInstall
  ) {
    issues.push(
      createIssue(
        'source-archive-invalid',
        'error',
        `${path}.sourceArchive`,
        'Dry-run adapter must preserve Pokemon Showdown GitHub source archive metadata and forbid git clone/dynamic npm install.',
      ),
    )
  }
}

const validateLifecycle = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  requiredLifecycleStages.forEach((stage) => {
    if (!result.lifecycle.some((step) => step.stage === stage)) {
      issues.push(
        createIssue(
          'lifecycle-stage-missing',
          'error',
          `${path}.lifecycle.${stage}`,
          `Dry-run adapter must model ${stage}.`,
        ),
      )
    }
  })

  result.lifecycle.forEach((step, index) => {
    if (!step.metadataOnly || step.progressPercent < 0 || step.progressPercent > 100 || !step.message) {
      issues.push(
        createIssue(
          'lifecycle-stage-missing',
          'error',
          `${path}.lifecycle.${index}`,
          'Lifecycle steps must remain metadata-only and include valid progress/message data.',
        ),
      )
    }
  })
}

const validateHandoff = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  if (
    !result.validationHandoff.checksum.expectedHash ||
    result.validationHandoff.checksum.algorithm !== 'sha256' ||
    result.validationHandoff.requiredFiles.length < 1 ||
    !result.validationHandoff.requiredFiles.some((file) => file.purpose === 'formats-registry') ||
    !result.validationHandoff.requiredFiles.some((file) => file.purpose === 'team-validator') ||
    !result.validationHandoff.formatRegistryStatus
  ) {
    issues.push(
      createIssue(
        'validation-handoff-invalid',
        'error',
        `${path}.validationHandoff`,
        'Dry-run adapter must expose checksum, required-file, and format registry validation handoffs.',
      ),
    )
  }

  if (result.decision.outcome === 'ready-to-promote' && !result.validationHandoff.readyForPromotion) {
    issues.push(
      createIssue(
        'validation-handoff-invalid',
        'error',
        `${path}.validationHandoff.readyForPromotion`,
        'Complete dry-run adapter result must be ready for promotion only after all validation handoffs are valid.',
      ),
    )
  }
}

const validatePreservation = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  if ((result.status === 'failed' || result.status === 'cancelled') && (
    result.resultingActiveRevision.revisionId !== result.previousActiveRevision.revisionId ||
    !result.previousActivePreserved ||
    result.decision.promotedRevision
  )) {
    issues.push(
      createIssue(
        'failed-cancelled-preservation-invalid',
        'error',
        `${path}.resultingActiveRevision`,
        'Failed/cancelled dry-run adapter results must preserve previous active Engine data and avoid promotion.',
      ),
    )
  }
}

const validateSafety = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  if (
    !result.safety.explicitUserActionRequired ||
    !result.safety.noImportTimeExecution ||
    !result.safety.noAppLoadExecution ||
    !result.safety.noPanelOpenExecution ||
    !result.safety.noRealNetworkRequest ||
    !result.safety.noArchiveExtraction ||
    !result.safety.noFileIo ||
    !result.safety.noDynamicImports ||
    !result.safety.noLoaderExecution ||
    !result.safety.noSimulationExecution ||
    !result.safety.noDryRunSideEffects ||
    result.storageContract.safety.realFileIoImplemented ||
    result.storageContract.safety.simulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Dry-run archive download adapter safety flags must remain closed.',
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
        'BattleLab custom formats must remain overlay-only and must not mutate upstream Pokemon Showdown source.',
      ),
    )
  }
}

const validateBoundaryNotes = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  if (
    !result.boundaryNotes.some((note) => note.includes('dry-run')) ||
    !result.boundaryNotes.some((note) => note.includes('no real network request')) ||
    !result.boundaryNotes.some((note) => note.includes('must not extract archives'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Dry-run adapter boundary notes must preserve no-network, no-extraction, and no-loader semantics.',
      ),
    )
  }
}

const validateResult = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
  issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[],
  path: string,
) => {
  validateTriggerAndSource(result, issues, path)
  validateLifecycle(result, issues, path)
  validateHandoff(result, issues, path)
  validatePreservation(result, issues, path)
  validateSafety(result, issues, path)
  validateBoundaryNotes(result, issues, path)
}

export function validateShowdownEngineArchiveDownloadAdapter(
  results: Record<string, ShowdownEngineArchiveDownloadAdapterResult> = sampleShowdownEngineArchiveDownloadAdapterDryRunResults,
): ShowdownEngineArchiveDownloadAdapterValidationResult {
  const issues: ShowdownEngineArchiveDownloadAdapterValidationIssue[] = []
  const entries = Object.entries(results)

  validateRequiredFixtures(results, issues)
  entries.forEach(([key, result]) => validateResult(result, issues, key))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedResultCount: entries.length,
    checkedLifecycleStepCount: entries.reduce((total, [, result]) => total + result.lifecycle.length, 0),
  }
}

export const sampleShowdownEngineArchiveDownloadAdapterValidation = validateShowdownEngineArchiveDownloadAdapter()
