import type {
  ShowdownEngineArchiveDownloadAdapterLifecycleStage,
  ShowdownEngineArchiveDownloadAdapterResult,
  ShowdownEngineArchiveDownloadAdapterStatus,
} from './showdownEngineArchiveDownloadAdapter'
import {
  sampleShowdownEngineArchiveDownloadAdapterDryRunResults,
} from './showdownEngineArchiveDownloadAdapter'

export type ShowdownEngineArchiveDownloadReadModelStatus = ShowdownEngineArchiveDownloadAdapterStatus

export interface ShowdownEngineArchiveDownloadReadModelRow {
  key: ShowdownEngineArchiveDownloadAdapterLifecycleStage | 'complete' | 'failed' | 'cancelled'
  label: string
  status: ShowdownEngineArchiveDownloadAdapterStatus | 'pending'
  progressPercent: number
  message: string
  blocksActivation: boolean
  metadataOnly: true
}

export interface ShowdownEngineArchiveDownloadSourceProps {
  repositoryOwner: string
  repositoryName: string
  archiveUrl: string
  revision: string
  versionLabel: string
  downloadStrategy: 'https-archive-download'
  dryRun: true
}

export interface ShowdownEngineArchiveDownloadValidationProps {
  checksumStatus: string
  checksumAlgorithm: string
  requiredFileStatus: 'valid' | 'invalid'
  requiredFileCount: number
  formatRegistryStatus: string
  officialFormatCount: number
  readyForPromotion: boolean
}

export interface ShowdownEngineArchiveDownloadStorageProps {
  rootFolderKey: string
  activeRevisionFolderKey: string
  stagingRevisionFolderKey: string
  customOverlayFolderKey: string
  writesOutsideApprovedRoot: false
  realFileIoImplemented: false
}

export interface ShowdownEngineArchiveDownloadDecisionProps {
  outcome: ShowdownEngineArchiveDownloadAdapterResult['decision']['outcome']
  resultingActiveRevisionId: string
  previousActiveRevisionId: string
  promotedRevisionId: string | null
  rejectedRevisionId: string | null
  previousActivePreserved: true
  message: string
}

export interface ShowdownEngineArchiveDownloadSafetyProps {
  explicitUserActionRequired: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noRealNetworkRequest: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveDownloadReadModel {
  readModelId: string
  status: ShowdownEngineArchiveDownloadReadModelStatus
  message: string
  rows: ShowdownEngineArchiveDownloadReadModelRow[]
  source: ShowdownEngineArchiveDownloadSourceProps
  validation: ShowdownEngineArchiveDownloadValidationProps
  storage: ShowdownEngineArchiveDownloadStorageProps
  decision: ShowdownEngineArchiveDownloadDecisionProps
  safety: ShowdownEngineArchiveDownloadSafetyProps
  boundaryNotes: string[]
}

const rowLabels: Record<ShowdownEngineArchiveDownloadReadModelRow['key'], string> = {
  'checking-current-engine': 'Checking current Engine',
  'resolving-github-archive': 'Resolving GitHub archive metadata',
  'planning-archive-download': 'Planned archive download',
  'validating-checksum-handoff': 'Checksum / hash validation',
  'validating-required-files-handoff': 'Required-file validation',
  'validating-format-registry-handoff': 'Format registry validation',
  'planning-staging': 'Staging / preparing',
  'final-decision': 'Promote / reject decision',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const createRows = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadReadModelRow[] => {
  const lifecycleRows = result.lifecycle.map((step): ShowdownEngineArchiveDownloadReadModelRow => ({
    key: step.stage,
    label: rowLabels[step.stage],
    status: step.status,
    progressPercent: step.progressPercent,
    message: step.message,
    blocksActivation: step.blocksActivation,
    metadataOnly: true,
  }))

  return [
    ...lifecycleRows,
    {
      key: 'complete',
      label: rowLabels.complete,
      status: result.status === 'complete' ? 'complete' : 'pending',
      progressPercent: result.status === 'complete' ? 100 : 0,
      message: result.status === 'complete' ? result.decision.message : 'Complete is not active for this dry-run state.',
      blocksActivation: false,
      metadataOnly: true,
    },
    {
      key: 'failed',
      label: rowLabels.failed,
      status: result.status === 'failed' ? 'failed' : 'pending',
      progressPercent: result.status === 'failed' ? 100 : 0,
      message: result.status === 'failed' ? result.decision.message : 'Failed is not active for this dry-run state.',
      blocksActivation: result.status === 'failed',
      metadataOnly: true,
    },
    {
      key: 'cancelled',
      label: rowLabels.cancelled,
      status: result.status === 'cancelled' ? 'cancelled' : 'pending',
      progressPercent: result.status === 'cancelled' ? 100 : 0,
      message: result.status === 'cancelled' ? result.decision.message : 'Cancelled is not active for this dry-run state.',
      blocksActivation: result.status === 'cancelled',
      metadataOnly: true,
    },
  ]
}

const createSource = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadSourceProps => ({
  repositoryOwner: result.sourceArchive.repositoryOwner,
  repositoryName: result.sourceArchive.repositoryName,
  archiveUrl: result.sourceArchive.archiveUrl,
  revision: result.sourceArchive.revision,
  versionLabel: result.sourceArchive.versionLabel,
  downloadStrategy: result.sourceArchive.downloadStrategy,
  dryRun: true,
})

const createValidation = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadValidationProps => ({
  checksumStatus: result.validationHandoff.checksum.status,
  checksumAlgorithm: result.validationHandoff.checksum.algorithm,
  requiredFileStatus: result.validationHandoff.requiredFileStatus,
  requiredFileCount: result.validationHandoff.requiredFiles.length,
  formatRegistryStatus: result.validationHandoff.formatRegistryStatus,
  officialFormatCount: result.validationHandoff.formatRegistry.officialFormatCount,
  readyForPromotion: result.validationHandoff.readyForPromotion,
})

const createStorage = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadStorageProps => ({
  rootFolderKey: result.storageContract.root.rootFolderKey,
  activeRevisionFolderKey: result.storageContract.root.activeRevisionFolderKey,
  stagingRevisionFolderKey: result.storageContract.root.stagingRevisionFolderKey,
  customOverlayFolderKey: result.storageContract.root.customOverlayFolderKey,
  writesOutsideApprovedRoot: result.storageContract.safety.writesOutsideApprovedRoot,
  realFileIoImplemented: result.storageContract.safety.realFileIoImplemented,
})

const createDecision = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadDecisionProps => ({
  outcome: result.decision.outcome,
  resultingActiveRevisionId: result.resultingActiveRevision.revisionId,
  previousActiveRevisionId: result.previousActiveRevision.revisionId,
  promotedRevisionId: result.decision.promotedRevision?.revisionId ?? null,
  rejectedRevisionId: result.decision.rejectedRevision?.revisionId ?? null,
  previousActivePreserved: result.previousActivePreserved,
  message: result.decision.message,
})

const createSafety = (
  result: ShowdownEngineArchiveDownloadAdapterResult,
): ShowdownEngineArchiveDownloadSafetyProps => ({
  explicitUserActionRequired: result.safety.explicitUserActionRequired,
  noImportTimeExecution: result.safety.noImportTimeExecution,
  noAppLoadExecution: result.safety.noAppLoadExecution,
  noPanelOpenExecution: result.safety.noPanelOpenExecution,
  noRealNetworkRequest: result.safety.noRealNetworkRequest,
  noArchiveExtraction: result.safety.noArchiveExtraction,
  noFileIo: result.safety.noFileIo,
  noDynamicImports: result.safety.noDynamicImports,
  noLoaderExecution: result.safety.noLoaderExecution,
  noSimulationExecution: result.safety.noSimulationExecution,
  customFormatsOverlayOnly: result.safety.customFormatsOverlayOnly,
  pokemonShowdownAuthority: result.safety.pokemonShowdownAuthority,
  catalogRole: result.safety.catalogRole,
})

const createMessage = (result: ShowdownEngineArchiveDownloadAdapterResult): string => {
  if (result.status === 'failed') {
    return 'Dry-run archive download is blocked; previous active Engine remains preserved.'
  }

  if (result.status === 'cancelled') {
    return 'Dry-run archive download is cancelled; previous active Engine remains preserved.'
  }

  return 'Dry-run archive download is ready for a future validated Engine update handoff.'
}

export function createShowdownEngineArchiveDownloadReadModel(
  result: ShowdownEngineArchiveDownloadAdapterResult = sampleShowdownEngineArchiveDownloadAdapterDryRunResults.complete,
): ShowdownEngineArchiveDownloadReadModel {
  return {
    readModelId: `${result.adapterId}-read-model`,
    status: result.status,
    message: createMessage(result),
    rows: createRows(result),
    source: createSource(result),
    validation: createValidation(result),
    storage: createStorage(result),
    decision: createDecision(result),
    safety: createSafety(result),
    boundaryNotes: [
      ...result.boundaryNotes,
      'Archive download read-model projection is serializable UI-safe data only and does not trigger Engine execution.',
    ],
  }
}

export const sampleShowdownEngineArchiveDownloadReadModels = {
  complete: createShowdownEngineArchiveDownloadReadModel(sampleShowdownEngineArchiveDownloadAdapterDryRunResults.complete),
  failed: createShowdownEngineArchiveDownloadReadModel(sampleShowdownEngineArchiveDownloadAdapterDryRunResults.failed),
  cancelled: createShowdownEngineArchiveDownloadReadModel(sampleShowdownEngineArchiveDownloadAdapterDryRunResults.cancelled),
}
