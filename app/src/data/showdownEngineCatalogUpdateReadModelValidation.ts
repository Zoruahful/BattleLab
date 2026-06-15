import type {
  ShowdownEngineCatalogUpdateProgressRow,
  ShowdownEngineCatalogUpdateReadModel,
  ShowdownEngineCatalogUpdateSectionKey,
} from './showdownEngineCatalogUpdateReadModel'
import { createShowdownEngineCatalogUpdateReadModelSamples } from './showdownEngineCatalogUpdateReadModel'

export type ShowdownEngineCatalogUpdateReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineCatalogUpdateReadModelValidationCode =
  | 'progress-row-missing'
  | 'revision-summary-invalid'
  | 'storage-summary-invalid'
  | 'readiness-summary-invalid'
  | 'safety-summary-invalid'
  | 'execution-boundary-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineCatalogUpdateReadModelValidationIssue {
  code: ShowdownEngineCatalogUpdateReadModelValidationCode
  severity: ShowdownEngineCatalogUpdateReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineCatalogUpdateReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[]
  checkedReadModelCount: number
  checkedProgressRowCount: number
}

const requiredProgressRows: ShowdownEngineCatalogUpdateSectionKey[] = [
  'checking',
  'downloading',
  'extracting-preparing',
  'validating',
  'current',
  'complete',
  'warning',
  'failed',
  'cancelled',
]

const createIssue = (
  code: ShowdownEngineCatalogUpdateReadModelValidationCode,
  severity: ShowdownEngineCatalogUpdateReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineCatalogUpdateReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateProgressRows = (
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  requiredProgressRows.forEach((key) => {
    const row = model.progressRows.find((entry: ShowdownEngineCatalogUpdateProgressRow) => entry.key === key)
    if (!row) {
      issues.push(
        createIssue(
          'progress-row-missing',
          'error',
          `${path}.progressRows.${key}`,
          `Catalog Update Engine read-model must include ${key} progress row.`,
        ),
      )
      return
    }

    if (!row.label || !row.message || row.progressPercent < 0 || row.progressPercent > 100) {
      issues.push(
        createIssue(
          'progress-row-missing',
          'error',
          `${path}.progressRows.${key}`,
          'Progress rows must include label, message, and a 0-100 progress value.',
        ),
      )
    }
  })
}

const validateRevisionSummaries = (
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (!model.activeRevision.revisionId || model.activeRevision.status === 'missing') {
    issues.push(
      createIssue(
        'revision-summary-invalid',
        'error',
        `${path}.activeRevision`,
        'Catalog Update Engine read-model must include active revision summary.',
      ),
    )
  }

  if (!model.stagedRevision.revisionId || !model.rejectedRevision.revisionId) {
    issues.push(
      createIssue(
        'revision-summary-invalid',
        'error',
        `${path}.revisionSummaries`,
        'Catalog Update Engine read-model must include staged and rejected revision summaries.',
      ),
    )
  }
}

const validateStorageAndReadiness = (
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
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
        'Storage summary must stay scoped to the approved Engine root and must not claim real file IO.',
      ),
    )
  }

  if (
    !model.readiness.archiveChecksumStatus ||
    !model.readiness.requiredFileStatus ||
    model.readiness.requiredFileCount < 1 ||
    model.readiness.officialFormatRegistryStatus !== 'available' ||
    model.readiness.officialFormatCount < 1 ||
    model.readiness.customFormatOverlayStatus !== 'supported'
  ) {
    issues.push(
      createIssue(
        'readiness-summary-invalid',
        'error',
        `${path}.readiness`,
        'Readiness summary must include archive, required-file, format registry, and custom overlay status.',
      ),
    )
  }
}

const validateSafety = (
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.safety.explicitUserActionRequired ||
    !model.safety.noImportTimeExecution ||
    !model.safety.noAppLoadExecution ||
    !model.safety.noPanelOpenExecution ||
    !model.safety.noHiddenExecutableInstall ||
    !model.safety.noDownloadedScriptAutoRun ||
    !model.safety.noObfuscation ||
    !model.safety.noWritesOutsideApprovedRoot ||
    !model.safety.noRealFileIo ||
    !model.safety.noSimulationExecution ||
    !model.safety.preservePreviousValidEngineOnFailure
  ) {
    issues.push(
      createIssue(
        'safety-summary-invalid',
        'error',
        `${path}.safety`,
        'Catalog Update Engine read-model safety flags must remain closed.',
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
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  if (
    !model.boundaryNotes.some((note) => note.includes('does not trigger Engine execution')) ||
    !model.boundaryNotes.some((note) => note.includes('Future implementation must run only after Catalog Update -> Update'))
  ) {
    issues.push(
      createIssue(
        'execution-boundary-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Boundary notes must preserve no-execution and future explicit user-triggered semantics.',
      ),
    )
  }
}

const validateModel = (
  model: ShowdownEngineCatalogUpdateReadModel,
  issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[],
  path: string,
) => {
  validateProgressRows(model, issues, path)
  validateRevisionSummaries(model, issues, path)
  validateStorageAndReadiness(model, issues, path)
  validateSafety(model, issues, path)
  validateBoundaryNotes(model, issues, path)
}

export async function validateShowdownEngineCatalogUpdateReadModel(): Promise<ShowdownEngineCatalogUpdateReadModelValidationResult> {
  const issues: ShowdownEngineCatalogUpdateReadModelValidationIssue[] = []
  const samples = await createShowdownEngineCatalogUpdateReadModelSamples()
  const models = Object.entries(samples)

  models.forEach(([key, model]) => validateModel(model, issues, key))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedReadModelCount: models.length,
    checkedProgressRowCount: models.reduce((total, [, model]) => total + model.progressRows.length, 0),
  }
}
