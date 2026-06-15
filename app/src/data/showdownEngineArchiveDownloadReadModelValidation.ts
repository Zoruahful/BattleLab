import type {
  ShowdownEngineArchiveDownloadReadModel,
  ShowdownEngineArchiveDownloadReadModelRow,
} from './showdownEngineArchiveDownloadReadModel'
import { sampleShowdownEngineArchiveDownloadReadModels } from './showdownEngineArchiveDownloadReadModel'

export type ShowdownEngineArchiveDownloadReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveDownloadReadModelValidationCode =
  | 'row-missing'
  | 'source-invalid'
  | 'validation-summary-invalid'
  | 'storage-summary-invalid'
  | 'decision-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineArchiveDownloadReadModelValidationIssue {
  code: ShowdownEngineArchiveDownloadReadModelValidationCode
  severity: ShowdownEngineArchiveDownloadReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveDownloadReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[]
  checkedReadModelCount: number
  checkedRowCount: number
}

const requiredRows: ShowdownEngineArchiveDownloadReadModelRow['key'][] = [
  'checking-current-engine',
  'resolving-github-archive',
  'planning-archive-download',
  'validating-checksum-handoff',
  'validating-required-files-handoff',
  'validating-format-registry-handoff',
  'planning-staging',
  'final-decision',
  'complete',
  'failed',
  'cancelled',
]

const createIssue = (
  code: ShowdownEngineArchiveDownloadReadModelValidationCode,
  severity: ShowdownEngineArchiveDownloadReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveDownloadReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateRows = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  requiredRows.forEach((key) => {
    const row = model.rows.find((entry) => entry.key === key)

    if (!row) {
      issues.push(createIssue('row-missing', 'error', `${path}.rows.${key}`, `Read-model must include ${key}.`))
      return
    }

    if (!row.metadataOnly || !row.label || !row.message || row.progressPercent < 0 || row.progressPercent > 100) {
      issues.push(
        createIssue(
          'row-missing',
          'error',
          `${path}.rows.${key}`,
          'Rows must stay metadata-only and include usable text/progress data.',
        ),
      )
    }
  })
}

const validateSource = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (
    model.source.repositoryOwner !== 'smogon' ||
    model.source.repositoryName !== 'pokemon-showdown' ||
    !model.source.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/') ||
    model.source.downloadStrategy !== 'https-archive-download' ||
    !model.source.dryRun
  ) {
    issues.push(
      createIssue(
        'source-invalid',
        'error',
        `${path}.source`,
        'Read-model source summary must preserve dry-run Pokemon Showdown GitHub archive metadata.',
      ),
    )
  }
}

const validateSummaries = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (
    model.validation.checksumAlgorithm !== 'sha256' ||
    !model.validation.checksumStatus ||
    model.validation.requiredFileCount < 1 ||
    !model.validation.formatRegistryStatus
  ) {
    issues.push(
      createIssue(
        'validation-summary-invalid',
        'error',
        `${path}.validation`,
        'Read-model must expose checksum, required-file, and format registry readiness.',
      ),
    )
  }

  if (
    model.storage.rootFolderKey !== 'battlelab-showdown-engine' ||
    model.storage.writesOutsideApprovedRoot ||
    model.storage.realFileIoImplemented
  ) {
    issues.push(
      createIssue(
        'storage-summary-invalid',
        'error',
        `${path}.storage`,
        'Read-model storage summary must remain scoped to approved app-managed Engine storage with no real file IO.',
      ),
    )
  }
}

const validateDecision = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (!model.decision.previousActivePreserved) {
    issues.push(
      createIssue(
        'decision-invalid',
        'error',
        `${path}.decision.previousActivePreserved`,
        'Read-model decision must preserve previous active Engine metadata.',
      ),
    )
  }

  if ((model.status === 'failed' || model.status === 'cancelled') && model.decision.promotedRevisionId) {
    issues.push(
      createIssue(
        'decision-invalid',
        'error',
        `${path}.decision.promotedRevisionId`,
        'Failed/cancelled read-models must not promote a replacement revision.',
      ),
    )
  }
}

const validateSafety = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.safety.explicitUserActionRequired ||
    !model.safety.noImportTimeExecution ||
    !model.safety.noAppLoadExecution ||
    !model.safety.noPanelOpenExecution ||
    !model.safety.noRealNetworkRequest ||
    !model.safety.noArchiveExtraction ||
    !model.safety.noFileIo ||
    !model.safety.noDynamicImports ||
    !model.safety.noLoaderExecution ||
    !model.safety.noSimulationExecution ||
    !model.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Read-model safety flags must remain closed and custom formats must stay overlay-only.',
      ),
    )
  }

  if (
    model.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    model.safety.catalogRole !== 'enrichment-only'
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
}

const validateBoundaryNotes = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.boundaryNotes.some((note) => note.includes('serializable UI-safe data')) ||
    !model.boundaryNotes.some((note) => note.includes('does not trigger Engine execution'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Read-model boundary notes must preserve UI-safe no-execution semantics.',
      ),
    )
  }
}

const validateReadModel = (
  model: ShowdownEngineArchiveDownloadReadModel,
  issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[],
  path: string,
) => {
  validateRows(model, issues, path)
  validateSource(model, issues, path)
  validateSummaries(model, issues, path)
  validateDecision(model, issues, path)
  validateSafety(model, issues, path)
  validateBoundaryNotes(model, issues, path)
}

export function validateShowdownEngineArchiveDownloadReadModel(
  models: ShowdownEngineArchiveDownloadReadModel[] = Object.values(sampleShowdownEngineArchiveDownloadReadModels),
): ShowdownEngineArchiveDownloadReadModelValidationResult {
  const issues: ShowdownEngineArchiveDownloadReadModelValidationIssue[] = []

  models.forEach((model, index) => validateReadModel(model, issues, `models.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedReadModelCount: models.length,
    checkedRowCount: models.reduce((total, model) => total + model.rows.length, 0),
  }
}

export const sampleShowdownEngineArchiveDownloadReadModelValidation = validateShowdownEngineArchiveDownloadReadModel()
