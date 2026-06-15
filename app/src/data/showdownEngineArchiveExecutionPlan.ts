import type {
  ShowdownEngineArchiveIntegrity,
  ShowdownEngineRequiredFileCheck,
  ShowdownEngineRevisionMetadata,
  ShowdownEngineSourceArchiveDescriptor,
} from './showdownEngineUpdateArchitecture'
import {
  sampleShowdownEngineArchiveIntegrity,
  showdownEngineGitHubSourceArchive,
  showdownEngineRequiredFileChecks,
} from './showdownEngineUpdateArchitecture'
import type {
  ShowdownEngineDataSnapshot,
  ShowdownEngineFormatRegistryReadModel,
  ShowdownEngineUpdateProgressEvent,
  ShowdownEngineUpdateSafetyPolicy,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import {
  sampleCurrentShowdownEngineData,
  sampleShowdownEngineFormatRegistry,
  showdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'
import type {
  ShowdownEngineStorageAdapterContract,
  ShowdownEngineStorageRevisionPointer,
} from './showdownEngineStorageAdapter'
import {
  sampleShowdownEngineActiveRevisionPointer,
  sampleShowdownEngineRejectedRevisionPointer,
  sampleShowdownEngineStagingRevisionPointer,
  sampleShowdownEngineStorageAdapterContract,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineArchiveExecutionTrigger = 'catalog-update-user-click-update'

export type ShowdownEngineArchiveExecutionStage =
  | 'checking-current-engine'
  | 'resolving-source-archive'
  | 'downloading-archive-metadata'
  | 'verifying-archive-hash-policy'
  | 'preparing-staged-revision'
  | 'validating-required-files'
  | 'checking-format-registry'
  | 'deciding-promote-or-reject'

export type ShowdownEngineArchiveExecutionStageStatus =
  | 'pending'
  | 'planned'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineArchiveExecutionOutcome = 'ready-to-promote' | 'failed' | 'cancelled'

export interface ShowdownEngineArchiveExecutionSafety {
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

export interface ShowdownEngineArchiveExecutionRequest {
  requestId: string
  trigger: ShowdownEngineArchiveExecutionTrigger
  requestedAt: string
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  storageRootKey: string
  activeRevision: ShowdownEngineStorageRevisionPointer
  targetStagingRevision: ShowdownEngineStorageRevisionPointer
  safety: ShowdownEngineArchiveExecutionSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineArchiveExecutionStep {
  stage: ShowdownEngineArchiveExecutionStage
  status: ShowdownEngineArchiveExecutionStageStatus
  progressPercent: number
  message: string
  blocksPromotion: boolean
  metadataOnly: true
  progressEvent: ShowdownEngineUpdateProgressEvent
}

export interface ShowdownEngineArchiveExecutionDecision {
  outcome: ShowdownEngineArchiveExecutionOutcome
  status: ShowdownEngineUpdateStatus
  stagedRevision: ShowdownEngineStorageRevisionPointer | null
  promotedRevision: ShowdownEngineStorageRevisionPointer | null
  rejectedRevision: ShowdownEngineStorageRevisionPointer | null
  resultingActiveRevision: ShowdownEngineStorageRevisionPointer
  previousValidEnginePreserved: true
  replacementRequiresValidation: true
  message: string
}

export interface ShowdownEngineArchiveExecutionPlan {
  planId: string
  request: ShowdownEngineArchiveExecutionRequest
  steps: ShowdownEngineArchiveExecutionStep[]
  archiveIntegrity: ShowdownEngineArchiveIntegrity
  requiredFiles: ShowdownEngineRequiredFileCheck[]
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  storageContract: ShowdownEngineStorageAdapterContract
  previousValidEngine: ShowdownEngineDataSnapshot
  candidateRevision: ShowdownEngineRevisionMetadata
  decision: ShowdownEngineArchiveExecutionDecision
  boundaryNotes: string[]
}

const requestedAt = '2026-06-15T00:00:00.000Z'

const stageToUpdateStatus = (
  stage: ShowdownEngineArchiveExecutionStage,
  status: ShowdownEngineArchiveExecutionStageStatus,
): ShowdownEngineUpdateStatus => {
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'

  switch (stage) {
    case 'checking-current-engine':
    case 'resolving-source-archive':
      return 'checking'
    case 'downloading-archive-metadata':
      return 'downloading'
    case 'verifying-archive-hash-policy':
    case 'validating-required-files':
    case 'checking-format-registry':
      return 'validating'
    case 'preparing-staged-revision':
      return 'extracting-preparing'
    case 'deciding-promote-or-reject':
      return status === 'warning' ? 'warning' : 'complete'
  }
}

const stageToPhase = (status: ShowdownEngineUpdateStatus): ShowdownEngineUpdateProgressEvent['phase'] => {
  if (status === 'extracting-preparing') return 'preparing'
  if (status === 'not-started') return 'idle'
  return status
}

const createStep = (
  requestId: string,
  stage: ShowdownEngineArchiveExecutionStage,
  status: ShowdownEngineArchiveExecutionStageStatus,
  progressPercent: number,
  message: string,
  blocksPromotion = false,
): ShowdownEngineArchiveExecutionStep => {
  const updateStatus = stageToUpdateStatus(stage, status)

  return {
    stage,
    status,
    progressPercent,
    message,
    blocksPromotion,
    metadataOnly: true,
    progressEvent: {
      eventId: `${requestId}-${stage}`,
      phase: stageToPhase(updateStatus),
      status: updateStatus,
      progressPercent,
      message,
      emittedAt: requestedAt,
    },
  }
}

const createSafety = (): ShowdownEngineArchiveExecutionSafety => ({
  explicitUserActionRequired: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noNetworkExecution: true,
  noArchiveExtraction: true,
  noFileIo: true,
  noLoaderExecution: true,
  noDownloadedScriptAutoRun: true,
  noWritesOutsideApprovedRoot: true,
  noSimulationExecution: true,
  preservePreviousValidEngineOnFailure: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

export const sampleShowdownEngineArchiveExecutionRequest: ShowdownEngineArchiveExecutionRequest = {
  requestId: 'showdown-engine-archive-execution-plan-preview',
  trigger: 'catalog-update-user-click-update',
  requestedAt,
  sourceArchive: showdownEngineGitHubSourceArchive,
  storageRootKey: sampleShowdownEngineStorageAdapterContract.root.rootFolderKey,
  activeRevision: sampleShowdownEngineActiveRevisionPointer,
  targetStagingRevision: sampleShowdownEngineStagingRevisionPointer,
  safety: createSafety(),
  boundaryNotes: [
    'Execution plan is metadata-only and must not download or extract Pokemon Showdown source archives.',
    'Future implementation must run only after Catalog Update -> Update.',
    'Pokemon Showdown remains the legality and simulation source of truth.',
    'PokeAPI/catalog data remains enrichment-only.',
  ],
}

export const sampleShowdownEngineArchiveExecutionSteps: ShowdownEngineArchiveExecutionStep[] = [
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'checking-current-engine',
    'complete',
    10,
    'Check current active Engine metadata before considering a staged replacement.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'resolving-source-archive',
    'complete',
    20,
    'Resolve Pokemon Showdown GitHub source archive metadata without cloning or dynamic npm install.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'downloading-archive-metadata',
    'planned',
    35,
    'Plan archive metadata download only; no network request is made in this checkpoint.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'verifying-archive-hash-policy',
    'planned',
    50,
    'Plan sha256 checksum validation before any future extraction or activation.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'preparing-staged-revision',
    'planned',
    65,
    'Plan staging under the approved app-managed Engine root without file IO.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'validating-required-files',
    'complete',
    78,
    'Represent required Pokemon Showdown files that must exist before activation.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'checking-format-registry',
    'complete',
    90,
    'Represent official Pokemon Showdown format registry readiness.',
  ),
  createStep(
    sampleShowdownEngineArchiveExecutionRequest.requestId,
    'deciding-promote-or-reject',
    'complete',
    100,
    'Promote only after archive, required-file, and format registry validation succeeds.',
  ),
]

const createCandidateRevision = (
  status: ShowdownEngineRevisionMetadata['status'] = 'staged',
  archiveIntegrity: ShowdownEngineArchiveIntegrity = sampleShowdownEngineArchiveIntegrity,
): ShowdownEngineRevisionMetadata => ({
  revisionId:
    status === 'rejected'
      ? sampleShowdownEngineRejectedRevisionPointer.revisionId
      : sampleShowdownEngineStagingRevisionPointer.revisionId,
  versionLabel: status === 'rejected' ? 'Pokemon Showdown rejected preview' : 'Pokemon Showdown staged preview',
  sourceArchive: showdownEngineGitHubSourceArchive,
  archiveIntegrity,
  requiredFiles: showdownEngineRequiredFileChecks,
  formatRegistry: sampleShowdownEngineFormatRegistry,
  status,
  preparedAt: requestedAt,
})

export const sampleShowdownEngineArchiveExecutionPlan: ShowdownEngineArchiveExecutionPlan = {
  planId: 'showdown-engine-archive-no-io-execution-plan-v1',
  request: sampleShowdownEngineArchiveExecutionRequest,
  steps: sampleShowdownEngineArchiveExecutionSteps,
  archiveIntegrity: sampleShowdownEngineArchiveIntegrity,
  requiredFiles: showdownEngineRequiredFileChecks,
  formatRegistry: sampleShowdownEngineFormatRegistry,
  storageContract: sampleShowdownEngineStorageAdapterContract,
  previousValidEngine: sampleCurrentShowdownEngineData,
  candidateRevision: createCandidateRevision('staged'),
  decision: {
    outcome: 'ready-to-promote',
    status: 'complete',
    stagedRevision: sampleShowdownEngineStagingRevisionPointer,
    promotedRevision: {
      ...sampleShowdownEngineStagingRevisionPointer,
      status: 'active',
    },
    rejectedRevision: null,
    resultingActiveRevision: {
      ...sampleShowdownEngineStagingRevisionPointer,
      status: 'active',
    },
    previousValidEnginePreserved: true,
    replacementRequiresValidation: true,
    message: 'Validated staged revision can be promoted in a future storage implementation.',
  },
  boundaryNotes: [
    ...sampleShowdownEngineArchiveExecutionRequest.boundaryNotes,
    'This plan is a no-IO handoff model for future Engine update execution.',
  ],
}

export const createFailedShowdownEngineArchiveExecutionPlan = (): ShowdownEngineArchiveExecutionPlan => {
  const failedIntegrity: ShowdownEngineArchiveIntegrity = {
    ...sampleShowdownEngineArchiveIntegrity,
    actualHash: 'sha256-mismatch-preview',
    status: 'failed',
    message: 'Archive checksum mismatch blocks staged revision activation.',
  }

  return {
    ...sampleShowdownEngineArchiveExecutionPlan,
    planId: 'showdown-engine-archive-no-io-execution-plan-failed',
    steps: sampleShowdownEngineArchiveExecutionSteps.map((step) =>
      step.stage === 'verifying-archive-hash-policy'
        ? createStep(
            sampleShowdownEngineArchiveExecutionRequest.requestId,
            'verifying-archive-hash-policy',
            'failed',
            50,
            'Archive checksum policy failed; staged revision must be rejected.',
            true,
          )
        : step,
    ),
    archiveIntegrity: failedIntegrity,
    candidateRevision: createCandidateRevision('rejected', failedIntegrity),
    decision: {
      outcome: 'failed',
      status: 'failed',
      stagedRevision: sampleShowdownEngineRejectedRevisionPointer,
      promotedRevision: null,
      rejectedRevision: sampleShowdownEngineRejectedRevisionPointer,
      resultingActiveRevision: sampleShowdownEngineActiveRevisionPointer,
      previousValidEnginePreserved: true,
      replacementRequiresValidation: true,
      message: 'Failed archive validation preserves the previous active Engine revision.',
    },
    boundaryNotes: [
      ...sampleShowdownEngineArchiveExecutionPlan.boundaryNotes,
      'Failed archive validation must preserve the previous active Engine revision.',
    ],
  }
}

export const createCancelledShowdownEngineArchiveExecutionPlan = (): ShowdownEngineArchiveExecutionPlan => ({
  ...sampleShowdownEngineArchiveExecutionPlan,
  planId: 'showdown-engine-archive-no-io-execution-plan-cancelled',
  steps: sampleShowdownEngineArchiveExecutionSteps.map((step) =>
    step.stage === 'preparing-staged-revision'
      ? createStep(
          sampleShowdownEngineArchiveExecutionRequest.requestId,
          'preparing-staged-revision',
          'cancelled',
          65,
          'User cancellation rejects the staged revision and preserves the active Engine.',
          true,
        )
      : step,
  ),
  decision: {
    outcome: 'cancelled',
    status: 'cancelled',
    stagedRevision: sampleShowdownEngineStagingRevisionPointer,
    promotedRevision: null,
    rejectedRevision: sampleShowdownEngineRejectedRevisionPointer,
    resultingActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    previousValidEnginePreserved: true,
    replacementRequiresValidation: true,
    message: 'Cancelled update preserves the previous active Engine revision.',
  },
  boundaryNotes: [
    ...sampleShowdownEngineArchiveExecutionPlan.boundaryNotes,
    'Cancelled archive execution must not replace active Engine data.',
  ],
})

export const showdownEngineArchiveExecutionSafetyPolicy: ShowdownEngineUpdateSafetyPolicy = showdownEngineUpdateSafetyPolicy
