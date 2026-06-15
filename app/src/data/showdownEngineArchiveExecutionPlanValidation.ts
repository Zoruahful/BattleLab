import type {
  ShowdownEngineArchiveExecutionPlan,
  ShowdownEngineArchiveExecutionStage,
} from './showdownEngineArchiveExecutionPlan'
import {
  createCancelledShowdownEngineArchiveExecutionPlan,
  createFailedShowdownEngineArchiveExecutionPlan,
  sampleShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'

export type ShowdownEngineArchiveExecutionPlanValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveExecutionPlanValidationCode =
  | 'stage-missing'
  | 'stage-invalid'
  | 'explicit-trigger-invalid'
  | 'source-archive-invalid'
  | 'storage-boundary-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'promotion-gate-invalid'
  | 'previous-engine-preservation-invalid'
  | 'required-file-validation-invalid'
  | 'format-registry-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineArchiveExecutionPlanValidationIssue {
  code: ShowdownEngineArchiveExecutionPlanValidationCode
  severity: ShowdownEngineArchiveExecutionPlanValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveExecutionPlanValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[]
  checkedPlanCount: number
  checkedStageCount: number
}

const requiredStages: ShowdownEngineArchiveExecutionStage[] = [
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
  code: ShowdownEngineArchiveExecutionPlanValidationCode,
  severity: ShowdownEngineArchiveExecutionPlanValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveExecutionPlanValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateStages = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  requiredStages.forEach((stage) => {
    if (!plan.steps.some((step) => step.stage === stage)) {
      issues.push(
        createIssue(
          'stage-missing',
          'error',
          `${path}.steps.${stage}`,
          `Archive execution plan must include ${stage}.`,
        ),
      )
    }
  })

  plan.steps.forEach((step, index) => {
    if (!step.metadataOnly || step.progressPercent < 0 || step.progressPercent > 100 || !step.message) {
      issues.push(
        createIssue(
          'stage-invalid',
          'error',
          `${path}.steps.${index}`,
          'Archive execution stages must stay metadata-only and include valid progress/message data.',
        ),
      )
    }
  })
}

const validateRequest = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  if (
    plan.request.trigger !== 'catalog-update-user-click-update' ||
    !plan.request.safety.explicitUserActionRequired ||
    !plan.request.safety.noImportTimeExecution ||
    !plan.request.safety.noAppLoadExecution ||
    !plan.request.safety.noPanelOpenExecution
  ) {
    issues.push(
      createIssue(
        'explicit-trigger-invalid',
        'error',
        `${path}.request`,
        'Archive execution must be future explicit user-triggered only.',
      ),
    )
  }

  if (
    plan.request.sourceArchive.sourceKind !== 'github-source-archive' ||
    plan.request.sourceArchive.repositoryOwner !== 'smogon' ||
    plan.request.sourceArchive.repositoryName !== 'pokemon-showdown' ||
    plan.request.sourceArchive.downloadStrategy !== 'https-archive-download' ||
    !plan.request.sourceArchive.disallowGitClone ||
    !plan.request.sourceArchive.disallowDynamicNpmInstall
  ) {
    issues.push(
      createIssue(
        'source-archive-invalid',
        'error',
        `${path}.request.sourceArchive`,
        'Archive execution plan must use Pokemon Showdown GitHub source archive metadata only.',
      ),
    )
  }
}

const validateStorageAndSafety = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  if (
    plan.storageContract.root.rootFolderKey !== 'battlelab-showdown-engine' ||
    plan.storageContract.root.allowWritesOutsideRoot ||
    plan.request.storageRootKey !== plan.storageContract.root.rootFolderKey
  ) {
    issues.push(
      createIssue(
        'storage-boundary-invalid',
        'error',
        `${path}.storageContract`,
        'Archive execution plan must remain scoped to approved app-managed Engine storage.',
      ),
    )
  }

  if (
    !plan.request.safety.noNetworkExecution ||
    !plan.request.safety.noArchiveExtraction ||
    !plan.request.safety.noFileIo ||
    !plan.request.safety.noLoaderExecution ||
    !plan.request.safety.noDownloadedScriptAutoRun ||
    !plan.request.safety.noWritesOutsideApprovedRoot ||
    !plan.request.safety.noSimulationExecution ||
    !plan.request.safety.preservePreviousValidEngineOnFailure
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.request.safety`,
        'No-IO archive execution safety flags must remain closed.',
      ),
    )
  }

  if (
    plan.request.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    plan.request.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.request.safety`,
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }
}

const validatePromotionGates = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  if (plan.decision.outcome === 'ready-to-promote') {
    if (
      plan.archiveIntegrity.algorithm !== 'sha256' ||
      plan.archiveIntegrity.status !== 'valid' ||
      plan.requiredFiles.some((file) => file.required && file.status !== 'valid') ||
      plan.formatRegistry.status !== 'available' ||
      plan.formatRegistry.officialFormatCount < 1 ||
      !plan.decision.promotedRevision ||
      plan.decision.resultingActiveRevision.revisionId !== plan.decision.promotedRevision.revisionId
    ) {
      issues.push(
        createIssue(
          'promotion-gate-invalid',
          'error',
          `${path}.decision`,
          'Ready-to-promote archive plan must require valid hash, required files, and format registry readiness.',
        ),
      )
    }
  }

  if (plan.decision.outcome === 'failed' || plan.decision.outcome === 'cancelled') {
    if (
      plan.decision.resultingActiveRevision.revisionId !== plan.request.activeRevision.revisionId ||
      !plan.decision.previousValidEnginePreserved ||
      plan.decision.promotedRevision
    ) {
      issues.push(
        createIssue(
          'previous-engine-preservation-invalid',
          'error',
          `${path}.decision`,
          'Failed and cancelled archive plans must preserve the previous active Engine and avoid promotion.',
        ),
      )
    }
  }

  if (!plan.requiredFiles.some((file) => file.purpose === 'team-validator')) {
    issues.push(
      createIssue(
        'required-file-validation-invalid',
        'error',
        `${path}.requiredFiles`,
        'Archive execution plan must include the Pokemon Showdown team-validator required-file gate.',
      ),
    )
  }

  if (plan.formatRegistry.status !== 'available' || plan.formatRegistry.officialFormatCount < 1) {
    issues.push(
      createIssue(
        'format-registry-invalid',
        'error',
        `${path}.formatRegistry`,
        'Archive execution plan must preserve official Pokemon Showdown format registry readiness.',
      ),
    )
  }
}

const validateBoundaryNotes = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  if (
    !plan.boundaryNotes.some((note) => note.includes('no-IO')) ||
    !plan.boundaryNotes.some((note) => note.includes('Future implementation must run only after Catalog Update -> Update'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Archive execution plan must include no-IO and explicit future user-triggered boundary notes.',
      ),
    )
  }
}

const validatePlan = (
  plan: ShowdownEngineArchiveExecutionPlan,
  issues: ShowdownEngineArchiveExecutionPlanValidationIssue[],
  path: string,
) => {
  validateStages(plan, issues, path)
  validateRequest(plan, issues, path)
  validateStorageAndSafety(plan, issues, path)
  validatePromotionGates(plan, issues, path)
  validateBoundaryNotes(plan, issues, path)
}

export function validateShowdownEngineArchiveExecutionPlan(
  plans: ShowdownEngineArchiveExecutionPlan[] = [
    sampleShowdownEngineArchiveExecutionPlan,
    createFailedShowdownEngineArchiveExecutionPlan(),
    createCancelledShowdownEngineArchiveExecutionPlan(),
  ],
): ShowdownEngineArchiveExecutionPlanValidationResult {
  const issues: ShowdownEngineArchiveExecutionPlanValidationIssue[] = []

  plans.forEach((plan, index) => validatePlan(plan, issues, `plans.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedPlanCount: plans.length,
    checkedStageCount: plans.reduce((total, plan) => total + plan.steps.length, 0),
  }
}

export const sampleShowdownEngineArchiveExecutionPlanValidation = validateShowdownEngineArchiveExecutionPlan()
