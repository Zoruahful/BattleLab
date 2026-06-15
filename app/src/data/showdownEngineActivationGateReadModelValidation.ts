import {
  createShowdownEngineActivationGateReadModelSamples,
  type ShowdownEngineActivationGateReadModel,
} from './showdownEngineActivationGateReadModel'

export type ShowdownEngineActivationGateReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineActivationGateReadModelValidationCode =
  | 'fixture-coverage-invalid'
  | 'phase-status-invalid'
  | 'prerequisite-row-invalid'
  | 'revision-summary-invalid'
  | 'promotion-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineActivationGateReadModelValidationIssue {
  code: ShowdownEngineActivationGateReadModelValidationCode
  severity: ShowdownEngineActivationGateReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineActivationGateReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineActivationGateReadModelValidationIssue[]
  coveredStatuses: ShowdownEngineActivationGateReadModel['status'][]
  checkedReadModelCount: number
  readyReadModelCount: number
  blockedReadModelCount: number
}

const createIssue = (
  code: ShowdownEngineActivationGateReadModelValidationCode,
  severity: ShowdownEngineActivationGateReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineActivationGateReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateReadModel = (
  readModel: ShowdownEngineActivationGateReadModel,
  issues: ShowdownEngineActivationGateReadModelValidationIssue[],
  path: string,
) => {
  const expectedPhaseByStatus: Record<ShowdownEngineActivationGateReadModel['status'], ShowdownEngineActivationGateReadModel['phase']> = {
    'activation-ready': 'ready',
    blocked: 'blocked',
    'failed-preserves-active': 'failed',
    'cancelled-preserves-active': 'cancelled',
  }

  if (readModel.phase !== expectedPhaseByStatus[readModel.status]) {
    issues.push(
      createIssue(
        'phase-status-invalid',
        'error',
        `${path}.phase`,
        'Activation gate read-model phase must align with status.',
      ),
    )
  }

  const expectedPrerequisites: ShowdownEngineActivationGateReadModel['prerequisiteRows'][number]['key'][] = [
    'immutable-source-policy',
    'archive-contents-manifest',
    'extraction-staging',
    'required-files',
    'format-registry-validation',
    'custom-format-overlay',
  ]

  expectedPrerequisites.forEach((key) => {
    const row = readModel.prerequisiteRows.find((candidate) => candidate.key === key)

    if (!row || !row.label || !row.message || !row.metadataOnly) {
      issues.push(
        createIssue(
          'prerequisite-row-invalid',
          'error',
          `${path}.prerequisiteRows.${key}`,
          `Activation gate read-model must include metadata-only ${key} row with label and message.`,
        ),
      )
    }
  })

  if (readModel.status === 'activation-ready' && readModel.prerequisiteRows.some((row) => row.status !== 'ready')) {
    issues.push(
      createIssue(
        'prerequisite-row-invalid',
        'error',
        `${path}.prerequisiteRows`,
        'Activation-ready read-model must show all prerequisite rows as ready.',
      ),
    )
  }

  if (
    !readModel.activeRevision.available ||
    !readModel.resultingActiveRevision.available ||
    readModel.activeRevision.role !== 'active' ||
    readModel.stagedRevision.role !== 'staged' ||
    readModel.resultingActiveRevision.role !== 'resulting-active'
  ) {
    issues.push(
      createIssue(
        'revision-summary-invalid',
        'error',
        `${path}.revisionSummaries`,
        'Activation gate read-model must expose active, staged, and resulting-active revision summaries.',
      ),
    )
  }

  if (
    readModel.status === 'activation-ready' &&
    (readModel.promotion.decision !== 'promote-staged-revision' || readModel.promotion.promotionBlocked)
  ) {
    issues.push(
      createIssue(
        'promotion-invalid',
        'error',
        `${path}.promotion`,
        'Activation-ready read-model must expose promote-staged-revision as unblocked metadata.',
      ),
    )
  }

  if (readModel.status !== 'activation-ready' && !readModel.promotion.promotionBlocked) {
    issues.push(
      createIssue(
        'promotion-invalid',
        'error',
        `${path}.promotion`,
        'Blocked, failed, and cancelled read-models must keep promotion blocked.',
      ),
    )
  }

  if (!readModel.promotion.previousActivePreserved) {
    issues.push(
      createIssue(
        'promotion-invalid',
        'error',
        `${path}.promotion.previousActivePreserved`,
        'Activation gate read-model must preserve previous active Engine metadata.',
      ),
    )
  }

  if (
    !readModel.safety.noImportTimeDownload ||
    !readModel.safety.noAppLoadDownload ||
    !readModel.safety.noPanelOpenDownload ||
    !readModel.safety.noArchiveInspection ||
    !readModel.safety.noArchiveExtraction ||
    !readModel.safety.noFileIo ||
    !readModel.safety.noFileReads ||
    !readModel.safety.noDynamicImports ||
    !readModel.safety.noLoaderExecution ||
    !readModel.safety.noCatalogUpdatePanelWiring ||
    !readModel.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Activation gate read-model safety flags must remain closed for execution, IO, UI wiring, and simulation.',
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
        'Activation gate read-model must preserve Showdown authority, PokeAPI enrichment-only, and overlay-only custom formats.',
      ),
    )
  }

  if (
    !readModel.boundaryNotes.some((note) => note.includes('UI-safe metadata')) ||
    !readModel.boundaryNotes.some((note) => note.includes('does not trigger Catalog Update execution'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Activation gate read-model boundary notes must state UI-safe metadata and no Catalog Update execution.',
      ),
    )
  }
}

export async function validateShowdownEngineActivationGateReadModel(): Promise<ShowdownEngineActivationGateReadModelValidationResult> {
  const issues: ShowdownEngineActivationGateReadModelValidationIssue[] = []
  const samples = await createShowdownEngineActivationGateReadModelSamples()
  const readModels = Object.values(samples)
  const coveredStatuses = Array.from(new Set(readModels.map((readModel) => readModel.status)))
  const requiredStatuses: ShowdownEngineActivationGateReadModel['status'][] = [
    'blocked',
    'activation-ready',
    'failed-preserves-active',
    'cancelled-preserves-active',
  ]

  readModels.forEach((readModel, index) => validateReadModel(readModel, issues, `readModels.${index}`))

  requiredStatuses.forEach((status) => {
    if (!coveredStatuses.includes(status)) {
      issues.push(
        createIssue(
          'fixture-coverage-invalid',
          'error',
          'coveredStatuses',
          `Activation gate read-model samples must cover ${status}.`,
        ),
      )
    }
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses,
    checkedReadModelCount: readModels.length,
    readyReadModelCount: readModels.filter((readModel) => readModel.status === 'activation-ready').length,
    blockedReadModelCount: readModels.filter((readModel) => readModel.promotion.promotionBlocked).length,
  }
}
