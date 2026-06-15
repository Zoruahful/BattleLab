import type {
  ShowdownEngineArchiveExecutionDecision,
  ShowdownEngineArchiveExecutionPlan,
  ShowdownEngineArchiveExecutionSafety,
  ShowdownEngineArchiveExecutionStage,
} from './showdownEngineArchiveExecutionPlan'
import {
  createCancelledShowdownEngineArchiveExecutionPlan,
  createFailedShowdownEngineArchiveExecutionPlan,
  sampleShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'
import type {
  ShowdownEngineArchiveIntegrity,
  ShowdownEngineRequiredFileCheck,
  ShowdownEngineSourceArchiveDescriptor,
} from './showdownEngineUpdateArchitecture'
import type {
  ShowdownEngineFormatRegistryReadModel,
  ShowdownEngineUpdateProgressEvent,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import type {
  ShowdownEngineStorageAdapterContract,
  ShowdownEngineStorageRevisionPointer,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineArchiveDownloadAdapterMode = 'dry-run'

export type ShowdownEngineArchiveDownloadAdapterStatus =
  | 'not-started'
  | 'checking'
  | 'resolving'
  | 'downloading'
  | 'validating'
  | 'staging'
  | 'complete'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineArchiveDownloadAdapterLifecycleStage =
  | 'checking-current-engine'
  | 'resolving-github-archive'
  | 'planning-archive-download'
  | 'validating-checksum-handoff'
  | 'validating-required-files-handoff'
  | 'validating-format-registry-handoff'
  | 'planning-staging'
  | 'final-decision'

export interface ShowdownEngineArchiveDownloadAdapterRequest {
  adapterId: string
  mode: ShowdownEngineArchiveDownloadAdapterMode
  trigger: 'catalog-update-user-click-update'
  requestedAt: string
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  activeRevision: ShowdownEngineStorageRevisionPointer
  targetStagingRevision: ShowdownEngineStorageRevisionPointer
  dryRun: true
  boundaryNotes: string[]
}

export interface ShowdownEngineArchiveDownloadAdapterLifecycleStep {
  stage: ShowdownEngineArchiveDownloadAdapterLifecycleStage
  status: ShowdownEngineArchiveDownloadAdapterStatus
  progressPercent: number
  message: string
  metadataOnly: true
  blocksActivation: boolean
  progressEvent: ShowdownEngineUpdateProgressEvent
}

export interface ShowdownEngineArchiveDownloadAdapterValidationHandoff {
  checksum: ShowdownEngineArchiveIntegrity
  requiredFiles: ShowdownEngineRequiredFileCheck[]
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  requiredFileStatus: 'valid' | 'invalid'
  formatRegistryStatus: ShowdownEngineFormatRegistryReadModel['status']
  readyForPromotion: boolean
}

export interface ShowdownEngineArchiveDownloadAdapterSafety extends ShowdownEngineArchiveExecutionSafety {
  noRealNetworkRequest: true
  noDynamicImports: true
  noDryRunSideEffects: true
  customFormatsOverlayOnly: true
}

export interface ShowdownEngineArchiveDownloadAdapterResult {
  adapterId: string
  mode: ShowdownEngineArchiveDownloadAdapterMode
  status: ShowdownEngineArchiveDownloadAdapterStatus
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  lifecycle: ShowdownEngineArchiveDownloadAdapterLifecycleStep[]
  validationHandoff: ShowdownEngineArchiveDownloadAdapterValidationHandoff
  storageContract: Pick<ShowdownEngineStorageAdapterContract, 'trigger' | 'root' | 'safety'>
  decision: ShowdownEngineArchiveExecutionDecision
  resultingActiveRevision: ShowdownEngineStorageRevisionPointer
  previousActiveRevision: ShowdownEngineStorageRevisionPointer
  previousActivePreserved: true
  safety: ShowdownEngineArchiveDownloadAdapterSafety
  boundaryNotes: string[]
}

const mapExecutionStageToLifecycleStage = (
  stage: ShowdownEngineArchiveExecutionStage,
): ShowdownEngineArchiveDownloadAdapterLifecycleStage => {
  switch (stage) {
    case 'checking-current-engine':
      return 'checking-current-engine'
    case 'resolving-source-archive':
      return 'resolving-github-archive'
    case 'downloading-archive-metadata':
      return 'planning-archive-download'
    case 'verifying-archive-hash-policy':
      return 'validating-checksum-handoff'
    case 'preparing-staged-revision':
      return 'planning-staging'
    case 'validating-required-files':
      return 'validating-required-files-handoff'
    case 'checking-format-registry':
      return 'validating-format-registry-handoff'
    case 'deciding-promote-or-reject':
      return 'final-decision'
  }
}

const mapProgressStatus = (status: ShowdownEngineUpdateStatus): ShowdownEngineArchiveDownloadAdapterStatus => {
  switch (status) {
    case 'checking':
      return 'checking'
    case 'downloading':
      return 'downloading'
    case 'extracting-preparing':
      return 'staging'
    case 'validating':
      return 'validating'
    case 'complete':
    case 'warning':
    case 'current':
      return 'complete'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'not-started':
      return 'not-started'
  }
}

const createLifecycle = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveDownloadAdapterLifecycleStep[] =>
  plan.steps.map((step) => {
    const lifecycleStage = mapExecutionStageToLifecycleStage(step.stage)
    const status =
      lifecycleStage === 'resolving-github-archive'
        ? 'resolving'
        : lifecycleStage === 'planning-archive-download'
          ? 'downloading'
          : mapProgressStatus(step.progressEvent.status)

    return {
      stage: lifecycleStage,
      status,
      progressPercent: step.progressPercent,
      message: step.message,
      metadataOnly: true,
      blocksActivation: step.blocksPromotion,
      progressEvent: step.progressEvent,
    }
  })

const createValidationHandoff = (
  plan: ShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveDownloadAdapterValidationHandoff => {
  const requiredFileStatus = plan.requiredFiles.every((file) => !file.required || file.status === 'valid')
    ? 'valid'
    : 'invalid'

  return {
    checksum: plan.archiveIntegrity,
    requiredFiles: plan.requiredFiles,
    formatRegistry: plan.formatRegistry,
    requiredFileStatus,
    formatRegistryStatus: plan.formatRegistry.status,
    readyForPromotion:
      plan.archiveIntegrity.status === 'valid' &&
      requiredFileStatus === 'valid' &&
      plan.formatRegistry.status === 'available' &&
      plan.decision.outcome === 'ready-to-promote',
  }
}

const createSafety = (plan: ShowdownEngineArchiveExecutionPlan): ShowdownEngineArchiveDownloadAdapterSafety => ({
  ...plan.request.safety,
  noRealNetworkRequest: true,
  noDynamicImports: true,
  noDryRunSideEffects: true,
  customFormatsOverlayOnly: true,
})

export function createShowdownEngineArchiveDownloadAdapterDryRunResult(
  plan: ShowdownEngineArchiveExecutionPlan = sampleShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveDownloadAdapterResult {
  return {
    adapterId: `${plan.planId}-download-adapter-dry-run`,
    mode: 'dry-run',
    status:
      plan.decision.status === 'complete'
        ? 'complete'
        : plan.decision.status === 'failed'
          ? 'failed'
          : plan.decision.status === 'cancelled'
            ? 'cancelled'
            : 'validating',
    sourceArchive: plan.request.sourceArchive,
    lifecycle: createLifecycle(plan),
    validationHandoff: createValidationHandoff(plan),
    storageContract: {
      trigger: plan.storageContract.trigger,
      root: plan.storageContract.root,
      safety: plan.storageContract.safety,
    },
    decision: plan.decision,
    resultingActiveRevision: plan.decision.resultingActiveRevision,
    previousActiveRevision: plan.request.activeRevision,
    previousActivePreserved: plan.decision.previousValidEnginePreserved,
    safety: createSafety(plan),
    boundaryNotes: [
      ...plan.boundaryNotes,
      'Archive download adapter is dry-run only and performs no real network request.',
      'Archive download adapter must not extract archives, write files, dynamically import archive code, or execute loaders.',
      'BattleLab custom formats remain overlays and must not mutate upstream Pokemon Showdown source.',
    ],
  }
}

export const sampleShowdownEngineArchiveDownloadAdapterDryRunResults = {
  complete: createShowdownEngineArchiveDownloadAdapterDryRunResult(sampleShowdownEngineArchiveExecutionPlan),
  failed: createShowdownEngineArchiveDownloadAdapterDryRunResult(createFailedShowdownEngineArchiveExecutionPlan()),
  cancelled: createShowdownEngineArchiveDownloadAdapterDryRunResult(createCancelledShowdownEngineArchiveExecutionPlan()),
}

export function runShowdownEngineArchiveDownloadAdapterDryRun(
  plan: ShowdownEngineArchiveExecutionPlan = sampleShowdownEngineArchiveExecutionPlan,
): ShowdownEngineArchiveDownloadAdapterResult {
  return createShowdownEngineArchiveDownloadAdapterDryRunResult(plan)
}
