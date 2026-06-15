import type {
  ShowdownEngineArchiveCatalogUpdateProgressRow,
  ShowdownEngineArchiveCatalogUpdateReadModel,
  ShowdownEngineArchiveCatalogUpdateRowKey,
} from './showdownEngineArchiveCatalogUpdateReadModel'
import { sampleShowdownEngineArchiveCatalogUpdateReadModels } from './showdownEngineArchiveCatalogUpdateReadModel'

export type ShowdownEngineArchiveCatalogUpdateReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveCatalogUpdateReadModelValidationCode =
  | 'progress-row-missing'
  | 'source-summary-invalid'
  | 'validation-summary-invalid'
  | 'decision-summary-invalid'
  | 'safety-summary-invalid'
  | 'authority-boundary-invalid'
  | 'execution-boundary-invalid'

export interface ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue {
  code: ShowdownEngineArchiveCatalogUpdateReadModelValidationCode
  severity: ShowdownEngineArchiveCatalogUpdateReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveCatalogUpdateReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[]
  checkedReadModelCount: number
  checkedProgressRowCount: number
}

const requiredRows: ShowdownEngineArchiveCatalogUpdateRowKey[] = [
  'checking-current-engine',
  'resolving-source-archive',
  'downloading-archive-metadata',
  'verifying-archive-hash-policy',
  'preparing-staged-revision',
  'validating-required-files',
  'checking-format-registry',
  'deciding-promote-or-reject',
]

const createIssue = (
  code: ShowdownEngineArchiveCatalogUpdateReadModelValidationCode,
  severity: ShowdownEngineArchiveCatalogUpdateReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateProgressRows = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  requiredRows.forEach((key) => {
    const row = model.progressRows.find((entry: ShowdownEngineArchiveCatalogUpdateProgressRow) => entry.key === key)

    if (!row) {
      issues.push(
        createIssue(
          'progress-row-missing',
          'error',
          `${path}.progressRows.${key}`,
          `Archive Catalog Update read-model must include ${key}.`,
        ),
      )
      return
    }

    if (!row.metadataOnly || !row.label || !row.message || row.progressPercent < 0 || row.progressPercent > 100) {
      issues.push(
        createIssue(
          'progress-row-missing',
          'error',
          `${path}.progressRows.${key}`,
          'Archive progress rows must remain metadata-only and include usable UI text/progress data.',
        ),
      )
    }
  })
}

const validateSourceSummary = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    model.sourceArchive.repositoryOwner !== 'smogon' ||
    model.sourceArchive.repositoryName !== 'pokemon-showdown' ||
    !model.sourceArchive.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/') ||
    model.sourceArchive.downloadStrategy !== 'https-archive-download' ||
    !model.sourceArchive.disallowGitClone ||
    !model.sourceArchive.disallowDynamicNpmInstall
  ) {
    issues.push(
      createIssue(
        'source-summary-invalid',
        'error',
        `${path}.sourceArchive`,
        'Archive read-model must preserve GitHub source archive metadata and forbid git clone or dynamic npm install.',
      ),
    )
  }
}

const validateValidationSummary = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.validation.archiveChecksumStatus ||
    model.validation.archiveHashAlgorithm !== 'sha256' ||
    model.validation.requiredFileCount < 1 ||
    model.validation.officialFormatRegistryStatus !== 'available' ||
    model.validation.officialFormatCount < 1 ||
    model.validation.customFormatOverlayStatus !== 'supported'
  ) {
    issues.push(
      createIssue(
        'validation-summary-invalid',
        'error',
        `${path}.validation`,
        'Archive read-model must include checksum, required-file, format registry, and custom overlay readiness.',
      ),
    )
  }
}

const validateDecisionSummary = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (!model.decision.previousValidEnginePreserved || !model.decision.replacementRequiresValidation) {
    issues.push(
      createIssue(
        'decision-summary-invalid',
        'error',
        `${path}.decision`,
        'Archive read-model decision must preserve previous valid Engine data and require replacement validation.',
      ),
    )
  }

  if (model.decision.outcome === 'ready-to-promote' && !model.decision.promotedRevisionId) {
    issues.push(
      createIssue(
        'decision-summary-invalid',
        'error',
        `${path}.decision.promotedRevisionId`,
        'Ready-to-promote archive read-model must include a promoted revision id.',
      ),
    )
  }

  if (
    (model.decision.outcome === 'failed' || model.decision.outcome === 'cancelled') &&
    model.decision.promotedRevisionId
  ) {
    issues.push(
      createIssue(
        'decision-summary-invalid',
        'error',
        `${path}.decision.promotedRevisionId`,
        'Failed/cancelled archive read-models must not promote a revision.',
      ),
    )
  }
}

const validateSafety = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.safety.explicitUserActionRequired ||
    !model.safety.noImportTimeExecution ||
    !model.safety.noAppLoadExecution ||
    !model.safety.noPanelOpenExecution ||
    !model.safety.noNetworkExecution ||
    !model.safety.noArchiveExtraction ||
    !model.safety.noFileIo ||
    !model.safety.noLoaderExecution ||
    !model.safety.noDownloadedScriptAutoRun ||
    !model.safety.noWritesOutsideApprovedRoot ||
    !model.safety.noSimulationExecution ||
    !model.safety.preservePreviousValidEngineOnFailure
  ) {
    issues.push(
      createIssue(
        'safety-summary-invalid',
        'error',
        `${path}.safety`,
        'Archive Catalog Update read-model safety flags must remain closed.',
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
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.boundaryNotes.some((note) => note.includes('does not trigger Engine execution')) ||
    !model.boundaryNotes.some((note) => note.includes('no-IO'))
  ) {
    issues.push(
      createIssue(
        'execution-boundary-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Archive read-model boundary notes must preserve no-IO and no-execution semantics.',
      ),
    )
  }
}

const validateReadModel = (
  model: ShowdownEngineArchiveCatalogUpdateReadModel,
  issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  validateProgressRows(model, issues, path)
  validateSourceSummary(model, issues, path)
  validateValidationSummary(model, issues, path)
  validateDecisionSummary(model, issues, path)
  validateSafety(model, issues, path)
  validateBoundaryNotes(model, issues, path)
}

export function validateShowdownEngineArchiveCatalogUpdateReadModel(
  models: ShowdownEngineArchiveCatalogUpdateReadModel[] = Object.values(sampleShowdownEngineArchiveCatalogUpdateReadModels),
): ShowdownEngineArchiveCatalogUpdateReadModelValidationResult {
  const issues: ShowdownEngineArchiveCatalogUpdateReadModelValidationIssue[] = []

  models.forEach((model, index) => validateReadModel(model, issues, `models.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedReadModelCount: models.length,
    checkedProgressRowCount: models.reduce((total, model) => total + model.progressRows.length, 0),
  }
}

export const sampleShowdownEngineArchiveCatalogUpdateReadModelValidation = validateShowdownEngineArchiveCatalogUpdateReadModel()
