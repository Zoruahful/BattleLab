import type {
  ShowdownEngineArchiveExecutionDecision,
  ShowdownEngineArchiveExecutionPlan,
  ShowdownEngineArchiveExecutionStage,
  ShowdownEngineArchiveExecutionStageStatus,
} from './showdownEngineArchiveExecutionPlan'
import {
  createCancelledShowdownEngineArchiveExecutionPlan,
  createFailedShowdownEngineArchiveExecutionPlan,
  sampleShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'
import type { ShowdownEngineUpdateStatus } from './showdownEngineUpdateService'

export type ShowdownEngineArchiveCatalogUpdateReadModelStatus = ShowdownEngineUpdateStatus

export type ShowdownEngineArchiveCatalogUpdateRowKey = ShowdownEngineArchiveExecutionStage

export interface ShowdownEngineArchiveCatalogUpdateProgressRow {
  key: ShowdownEngineArchiveCatalogUpdateRowKey
  label: string
  status: ShowdownEngineArchiveExecutionStageStatus
  progressPercent: number
  message: string
  blocksPromotion: boolean
  metadataOnly: true
}

export interface ShowdownEngineArchiveCatalogUpdateSourceSummary {
  repositoryOwner: string
  repositoryName: string
  archiveUrl: string
  revision: string
  downloadStrategy: 'https-archive-download'
  disallowGitClone: true
  disallowDynamicNpmInstall: true
}

export interface ShowdownEngineArchiveCatalogUpdateValidationSummary {
  archiveChecksumStatus: string
  archiveHashAlgorithm: string
  requiredFileStatus: 'valid' | 'invalid'
  requiredFileCount: number
  officialFormatRegistryStatus: string
  officialFormatCount: number
  customFormatOverlayStatus: 'supported'
}

export interface ShowdownEngineArchiveCatalogUpdateDecisionSummary {
  outcome: ShowdownEngineArchiveExecutionDecision['outcome']
  status: ShowdownEngineArchiveExecutionDecision['status']
  stagedRevisionId: string | null
  promotedRevisionId: string | null
  rejectedRevisionId: string | null
  resultingActiveRevisionId: string
  previousValidEnginePreserved: true
  replacementRequiresValidation: true
  message: string
}

export interface ShowdownEngineArchiveCatalogUpdateSafetySummary {
  explicitUserActionRequired: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noNetworkExecution: true
  noArchiveExtraction: true
  noFileIo: true
  noLoaderExecution: true
  noDownloadedScriptAutoRun: true
  noWritesOutsideApprovedRoot: true
  noSimulationExecution: true
  preservePreviousValidEngineOnFailure: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveCatalogUpdateReadModel {
  readModelId: string
  status: ShowdownEngineArchiveCatalogUpdateReadModelStatus
  message: string
  progressRows: ShowdownEngineArchiveCatalogUpdateProgressRow[]
  sourceArchive: ShowdownEngineArchiveCatalogUpdateSourceSummary
  validation: ShowdownEngineArchiveCatalogUpdateValidationSummary
  decision: ShowdownEngineArchiveCatalogUpdateDecisionSummary
  safety: ShowdownEngineArchiveCatalogUpdateSafetySummary
  boundaryNotes: string[]
}

const rowLabels: Record<ShowdownEngineArchiveCatalogUpdateRowKey, string> = {
  'checking-current-engine': 'Checking current Engine',
  'resolving-source-archive': 'Resolving GitHub archive metadata',
  'downloading-archive-metadata': 'Planned download metadata',
  'verifying-archive-hash-policy': 'Hash / checksum validation',
  'preparing-staged-revision': 'Staging / preparing',
  'validating-required-files': 'Required-file validation',
  'checking-format-registry': 'Format registry readiness',
  'deciding-promote-or-reject': 'Promote / reject decision',
}

const createProgressRows = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateProgressRow[] =>
  plan.steps.map((step) => ({
    key: step.stage,
    label: rowLabels[step.stage],
    status: step.status,
    progressPercent: step.progressPercent,
    message: step.message,
    blocksPromotion: step.blocksPromotion,
    metadataOnly: true,
  }))

const createSourceSummary = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateSourceSummary => ({
  repositoryOwner: plan.request.sourceArchive.repositoryOwner,
  repositoryName: plan.request.sourceArchive.repositoryName,
  archiveUrl: plan.request.sourceArchive.archiveUrl,
  revision: plan.request.sourceArchive.revision,
  downloadStrategy: plan.request.sourceArchive.downloadStrategy,
  disallowGitClone: plan.request.sourceArchive.disallowGitClone,
  disallowDynamicNpmInstall: plan.request.sourceArchive.disallowDynamicNpmInstall,
})

const createValidationSummary = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateValidationSummary => ({
  archiveChecksumStatus: plan.archiveIntegrity.status,
  archiveHashAlgorithm: plan.archiveIntegrity.algorithm,
  requiredFileStatus: plan.requiredFiles.every((file) => !file.required || file.status === 'valid') ? 'valid' : 'invalid',
  requiredFileCount: plan.requiredFiles.length,
  officialFormatRegistryStatus: plan.formatRegistry.status,
  officialFormatCount: plan.formatRegistry.officialFormatCount,
  customFormatOverlayStatus: 'supported',
})

const createDecisionSummary = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateDecisionSummary => ({
  outcome: plan.decision.outcome,
  status: plan.decision.status,
  stagedRevisionId: plan.decision.stagedRevision?.revisionId ?? null,
  promotedRevisionId: plan.decision.promotedRevision?.revisionId ?? null,
  rejectedRevisionId: plan.decision.rejectedRevision?.revisionId ?? null,
  resultingActiveRevisionId: plan.decision.resultingActiveRevision.revisionId,
  previousValidEnginePreserved: plan.decision.previousValidEnginePreserved,
  replacementRequiresValidation: plan.decision.replacementRequiresValidation,
  message: plan.decision.message,
})

const createSafetySummary = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateSafetySummary => ({
  explicitUserActionRequired: plan.request.safety.explicitUserActionRequired,
  noImportTimeExecution: plan.request.safety.noImportTimeExecution,
  noAppLoadExecution: plan.request.safety.noAppLoadExecution,
  noPanelOpenExecution: plan.request.safety.noPanelOpenExecution,
  noNetworkExecution: plan.request.safety.noNetworkExecution,
  noArchiveExtraction: plan.request.safety.noArchiveExtraction,
  noFileIo: plan.request.safety.noFileIo,
  noLoaderExecution: plan.request.safety.noLoaderExecution,
  noDownloadedScriptAutoRun: plan.request.safety.noDownloadedScriptAutoRun,
  noWritesOutsideApprovedRoot: plan.request.safety.noWritesOutsideApprovedRoot,
  noSimulationExecution: plan.request.safety.noSimulationExecution,
  preservePreviousValidEngineOnFailure: plan.request.safety.preservePreviousValidEngineOnFailure,
  pokemonShowdownAuthority: plan.request.safety.pokemonShowdownAuthority,
  catalogRole: plan.request.safety.catalogRole,
})

const getMessage = (plan: ShowdownEngineArchiveExecutionPlan): string => {
  if (plan.decision.outcome === 'failed') {
    return 'Archive validation is blocked; previous active Engine remains preserved.'
  }

  if (plan.decision.outcome === 'cancelled') {
    return 'Archive update preview is cancelled; previous active Engine remains preserved.'
  }

  return 'Archive execution preview is ready for a future validated staged promotion.'
}

export function createShowdownEngineArchiveCatalogUpdateReadModel(
  plan: ShowdownEngineArchiveExecutionPlan = sampleShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveCatalogUpdateReadModel {
  return {
    readModelId: `${plan.planId}-catalog-update-read-model`,
    status: plan.decision.status,
    message: getMessage(plan),
    progressRows: createProgressRows(plan),
    sourceArchive: createSourceSummary(plan),
    validation: createValidationSummary(plan),
    decision: createDecisionSummary(plan),
    safety: createSafetySummary(plan),
    boundaryNotes: [
      ...plan.boundaryNotes,
      'Catalog Update archive read-model projection is UI-safe data only and does not trigger Engine execution.',
    ],
  }
}

export const sampleShowdownEngineArchiveCatalogUpdateReadModels = {
  ready: createShowdownEngineArchiveCatalogUpdateReadModel(sampleShowdownEngineArchiveExecutionPlan),
  failed: createShowdownEngineArchiveCatalogUpdateReadModel(createFailedShowdownEngineArchiveExecutionPlan()),
  cancelled: createShowdownEngineArchiveCatalogUpdateReadModel(createCancelledShowdownEngineArchiveExecutionPlan()),
}
