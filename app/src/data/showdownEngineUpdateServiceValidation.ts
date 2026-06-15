import type {
  ShowdownEngineUpdateProgressEvent,
  ShowdownEngineUpdateReadModel,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import {
  createShowdownEngineFormatRegistryReadModel,
  sampleShowdownEngineUpdateReadModels,
  showdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'

export type ShowdownEngineUpdateValidationSeverity = 'error' | 'warning'

export type ShowdownEngineUpdateValidationCode =
  | 'explicit-call-boundary-invalid'
  | 'safety-policy-open'
  | 'status-coverage-missing'
  | 'failed-replaced-current-engine'
  | 'cancelled-replaced-current-engine'
  | 'format-registry-not-represented'
  | 'authority-boundary-invalid'

export interface ShowdownEngineUpdateValidationIssue {
  code: ShowdownEngineUpdateValidationCode
  severity: ShowdownEngineUpdateValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineUpdateValidationResult {
  isValid: boolean
  issues: ShowdownEngineUpdateValidationIssue[]
  checkedReadModelCount: number
  checkedStatuses: ShowdownEngineUpdateStatus[]
  liveFormatRegistryStatus: 'available' | 'unavailable' | 'not-checked'
  liveOfficialFormatCount: number
}

const requiredEventStatuses: ShowdownEngineUpdateStatus[] = [
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
  code: ShowdownEngineUpdateValidationCode,
  severity: ShowdownEngineUpdateValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineUpdateValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateSafetyPolicy = (issues: ShowdownEngineUpdateValidationIssue[]) => {
  if (
    showdownEngineUpdateSafetyPolicy.trigger !== 'future-user-triggered-catalog-update' ||
    !showdownEngineUpdateSafetyPolicy.explicitUserActionRequired ||
    showdownEngineUpdateSafetyPolicy.allowImportTimeExecution ||
    showdownEngineUpdateSafetyPolicy.allowAppLoadExecution ||
    showdownEngineUpdateSafetyPolicy.allowPanelOpenExecution
  ) {
    issues.push(
      createIssue(
        'explicit-call-boundary-invalid',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Engine update must remain explicit future-user-triggered only and must not run at import/app-load/panel-open time.',
      ),
    )
  }

  if (
    showdownEngineUpdateSafetyPolicy.allowHiddenExecutableInstall ||
    showdownEngineUpdateSafetyPolicy.allowDownloadedScriptExecution ||
    showdownEngineUpdateSafetyPolicy.allowObfuscation ||
    showdownEngineUpdateSafetyPolicy.allowWritesOutsideApprovedEngineStorage ||
    showdownEngineUpdateSafetyPolicy.allowSimulationExecution ||
    !showdownEngineUpdateSafetyPolicy.preservePreviousValidEngineOnFailure
  ) {
    issues.push(
      createIssue(
        'safety-policy-open',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Engine update safety flags must stay closed and preserve previous valid Engine data on failure.',
      ),
    )
  }

  if (
    showdownEngineUpdateSafetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    showdownEngineUpdateSafetyPolicy.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'showdownEngineUpdateSafetyPolicy',
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data enrichment-only.',
      ),
    )
  }
}

const collectEventStatuses = (models: ShowdownEngineUpdateReadModel[]) =>
  new Set(models.flatMap((model) => model.events.map((event: ShowdownEngineUpdateProgressEvent) => event.status)))

const validateStatusCoverage = (
  issues: ShowdownEngineUpdateValidationIssue[],
  models: ShowdownEngineUpdateReadModel[],
) => {
  const eventStatuses = collectEventStatuses(models)

  requiredEventStatuses.forEach((status) => {
    if (!eventStatuses.has(status)) {
      issues.push(
        createIssue(
          'status-coverage-missing',
          'error',
          `events.${status}`,
          `Engine update read-model fixtures must represent ${status} progress/status.`,
        ),
      )
    }
  })
}

const validatePreservation = (
  issues: ShowdownEngineUpdateValidationIssue[],
  model: ShowdownEngineUpdateReadModel,
  path: string,
) => {
  if (
    model.status === 'failed' &&
    model.previousValidEngine?.snapshotId !== model.activeEngine?.snapshotId
  ) {
    issues.push(
      createIssue(
        'failed-replaced-current-engine',
        'error',
        `${path}.activeEngine`,
        'Failed Engine update must not replace the previous valid Engine snapshot.',
      ),
    )
  }

  if (
    model.status === 'cancelled' &&
    model.previousValidEngine?.snapshotId !== model.activeEngine?.snapshotId
  ) {
    issues.push(
      createIssue(
        'cancelled-replaced-current-engine',
        'error',
        `${path}.activeEngine`,
        'Cancelled Engine update must not replace the previous valid Engine snapshot.',
      ),
    )
  }
}

const validateFormatRegistry = (
  issues: ShowdownEngineUpdateValidationIssue[],
  models: ShowdownEngineUpdateReadModel[],
) => {
  models.forEach((model, index) => {
    if (
      !model.formatRegistry ||
      model.formatRegistry.officialFormatCount < 1 ||
      !model.formatRegistry.formats.some((format) => format.source === 'battlelab-custom')
    ) {
      issues.push(
        createIssue(
          'format-registry-not-represented',
          'error',
          `models.${index}.formatRegistry`,
          'Engine update read-model must represent official Pokemon Showdown format availability and BattleLab custom format space.',
        ),
      )
    }
  })
}

export async function validateShowdownEngineUpdateService(): Promise<ShowdownEngineUpdateValidationResult> {
  const issues: ShowdownEngineUpdateValidationIssue[] = []
  const models = Object.values(sampleShowdownEngineUpdateReadModels)
  const liveFormatRegistry = await createShowdownEngineFormatRegistryReadModel('2026-06-15T18:30:00.000Z')

  validateSafetyPolicy(issues)
  validateStatusCoverage(issues, models)
  validateFormatRegistry(issues, models)
  models.forEach((model, index) => validatePreservation(issues, model, `models.${index}`))

  if (liveFormatRegistry.status !== 'available' || liveFormatRegistry.officialFormatCount < 1) {
    issues.push(
      createIssue(
        'format-registry-not-represented',
        'error',
        'liveFormatRegistry',
        'Explicit format registry readiness check must expose official Pokemon Showdown format availability.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedReadModelCount: models.length,
    checkedStatuses: models.map((model) => model.status),
    liveFormatRegistryStatus: liveFormatRegistry.status,
    liveOfficialFormatCount: liveFormatRegistry.officialFormatCount,
  }
}
