import type {
  ShowdownEngineRevisionMetadata,
  ShowdownEngineUpdateArchitectureReadModel,
} from './showdownEngineUpdateArchitecture'
import {
  createCancelledShowdownEngineUpdateArchitectureReadModel,
  createFailedShowdownEngineUpdateArchitectureReadModel,
  createShowdownEngineUpdateArchitectureReadModel,
} from './showdownEngineUpdateArchitecture'
import type {
  ShowdownEngineUpdatePhase,
  ShowdownEngineUpdateReadModel,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import { sampleShowdownEngineUpdateReadModels } from './showdownEngineUpdateService'
import type {
  ShowdownEngineStorageAdapterContract,
  ShowdownEngineStorageRevisionPointer,
} from './showdownEngineStorageAdapter'
import { sampleShowdownEngineStorageAdapterContract } from './showdownEngineStorageAdapter'

export type ShowdownEngineCatalogUpdateSectionKey =
  | 'checking'
  | 'downloading'
  | 'extracting-preparing'
  | 'validating'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineCatalogUpdateReadModelStatus = ShowdownEngineUpdateStatus

export interface ShowdownEngineCatalogUpdateProgressRow {
  key: ShowdownEngineCatalogUpdateSectionKey
  label: string
  status: 'pending' | 'active' | 'complete' | 'warning' | 'failed' | 'cancelled'
  progressPercent: number
  message: string
}

export interface ShowdownEngineCatalogUpdateRevisionSummary {
  revisionId: string
  versionLabel?: string
  status: 'active' | 'staged' | 'rejected' | 'current' | 'missing'
  sourceRevision?: string
  preparedAt?: string
  archiveHashStatus?: string
  requiredFileCount?: number
}

export interface ShowdownEngineCatalogUpdateStorageSummary {
  rootFolderKey: string
  activeRevisionFolderKey: string
  stagingRevisionFolderKey: string
  customOverlayFolderKey: string
  status: 'ready'
  writesOutsideApprovedRoot: false
  realFileIoImplemented: false
}

export interface ShowdownEngineCatalogUpdateReadinessSummary {
  archiveChecksumStatus: string
  requiredFileStatus: string
  requiredFileCount: number
  officialFormatRegistryStatus: string
  officialFormatCount: number
  customFormatOverlayStatus: string
}

export interface ShowdownEngineCatalogUpdateSafetySummary {
  explicitUserActionRequired: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noHiddenExecutableInstall: true
  noDownloadedScriptAutoRun: true
  noObfuscation: true
  noWritesOutsideApprovedRoot: true
  noRealFileIo: true
  noSimulationExecution: true
  preservePreviousValidEngineOnFailure: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineCatalogUpdateReadModel {
  readModelId: string
  status: ShowdownEngineCatalogUpdateReadModelStatus
  phase: ShowdownEngineUpdatePhase
  message: string
  progressRows: ShowdownEngineCatalogUpdateProgressRow[]
  activeRevision: ShowdownEngineCatalogUpdateRevisionSummary
  stagedRevision: ShowdownEngineCatalogUpdateRevisionSummary
  rejectedRevision: ShowdownEngineCatalogUpdateRevisionSummary
  storage: ShowdownEngineCatalogUpdateStorageSummary
  readiness: ShowdownEngineCatalogUpdateReadinessSummary
  safety: ShowdownEngineCatalogUpdateSafetySummary
  boundaryNotes: string[]
}

export interface ShowdownEngineCatalogUpdateReadModelInput {
  updateReadModel?: ShowdownEngineUpdateReadModel
  architectureReadModel?: ShowdownEngineUpdateArchitectureReadModel
  storageContract?: ShowdownEngineStorageAdapterContract
}

const progressLabels: Record<ShowdownEngineCatalogUpdateSectionKey, string> = {
  checking: 'Checking',
  downloading: 'Downloading',
  'extracting-preparing': 'Extracting / Preparing',
  validating: 'Validating',
  current: 'Current',
  complete: 'Complete',
  warning: 'Warning',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const progressOrder: ShowdownEngineCatalogUpdateSectionKey[] = [
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

const statusToRowStatus = (
  row: ShowdownEngineCatalogUpdateSectionKey,
  updateStatus: ShowdownEngineUpdateStatus,
): ShowdownEngineCatalogUpdateProgressRow['status'] => {
  if (row === updateStatus) {
    if (row === 'failed') return 'failed'
    if (row === 'cancelled') return 'cancelled'
    if (row === 'warning') return 'warning'
    return updateStatus === 'complete' || updateStatus === 'current' ? 'complete' : 'active'
  }

  if (updateStatus === 'complete' && ['checking', 'downloading', 'extracting-preparing', 'validating'].includes(row)) {
    return 'complete'
  }

  if (updateStatus === 'warning' && ['checking', 'downloading', 'extracting-preparing', 'validating'].includes(row)) {
    return 'complete'
  }

  return 'pending'
}

const getProgressPercent = (
  row: ShowdownEngineCatalogUpdateSectionKey,
  updateReadModel: ShowdownEngineUpdateReadModel,
) => {
  const event = updateReadModel.events.find((entry) => entry.status === row)
  if (event) return event.progressPercent

  if (statusToRowStatus(row, updateReadModel.status) === 'complete') return 100

  return 0
}

const createProgressRows = (updateReadModel: ShowdownEngineUpdateReadModel): ShowdownEngineCatalogUpdateProgressRow[] =>
  progressOrder.map((key) => {
    const event = updateReadModel.events.find((entry) => entry.status === key)
    return {
      key,
      label: progressLabels[key],
      status: statusToRowStatus(key, updateReadModel.status),
      progressPercent: getProgressPercent(key, updateReadModel),
      message: event?.message ?? `${progressLabels[key]} is not active in this preview state.`,
    }
  })

const missingRevision = (status: ShowdownEngineCatalogUpdateRevisionSummary['status']): ShowdownEngineCatalogUpdateRevisionSummary => ({
  revisionId: 'not-available',
  status,
})

const summarizeRevision = (
  revision: ShowdownEngineRevisionMetadata | null,
  fallback: ShowdownEngineStorageRevisionPointer,
): ShowdownEngineCatalogUpdateRevisionSummary => {
  if (!revision) {
    return {
      revisionId: fallback.revisionId,
      status: fallback.status,
    }
  }

  return {
    revisionId: revision.revisionId,
    versionLabel: revision.versionLabel,
    status: revision.status,
    sourceRevision: revision.sourceArchive.revision,
    preparedAt: revision.preparedAt,
    archiveHashStatus: revision.archiveIntegrity.status,
    requiredFileCount: revision.requiredFiles.length,
  }
}

const createStorageSummary = (
  storageContract: ShowdownEngineStorageAdapterContract,
): ShowdownEngineCatalogUpdateStorageSummary => ({
  rootFolderKey: storageContract.root.rootFolderKey,
  activeRevisionFolderKey: storageContract.root.activeRevisionFolderKey,
  stagingRevisionFolderKey: storageContract.root.stagingRevisionFolderKey,
  customOverlayFolderKey: storageContract.root.customOverlayFolderKey,
  status: 'ready',
  writesOutsideApprovedRoot: storageContract.root.allowWritesOutsideRoot,
  realFileIoImplemented: storageContract.safety.realFileIoImplemented,
})

const createReadinessSummary = (
  architectureReadModel: ShowdownEngineUpdateArchitectureReadModel,
  storageContract: ShowdownEngineStorageAdapterContract,
): ShowdownEngineCatalogUpdateReadinessSummary => {
  const revision = architectureReadModel.activeRevision ?? architectureReadModel.stagedRevision
  const requiredFiles = revision?.requiredFiles ?? storageContract.requiredFileManifest.requiredFiles
  const formatRegistry = revision?.formatRegistry ?? storageContract.formatRegistry
  const archiveIntegrity = revision?.archiveIntegrity ?? storageContract.archiveMetadata.archiveIntegrity

  return {
    archiveChecksumStatus: archiveIntegrity.status,
    requiredFileStatus: requiredFiles.every((file) => file.status === 'valid') ? 'valid' : 'invalid',
    requiredFileCount: requiredFiles.length,
    officialFormatRegistryStatus: formatRegistry.status,
    officialFormatCount: formatRegistry.officialFormatCount,
    customFormatOverlayStatus: architectureReadModel.customFormatOverlayPolicy.supported ? 'supported' : 'not-supported',
  }
}

const createSafetySummary = (
  storageContract: ShowdownEngineStorageAdapterContract,
): ShowdownEngineCatalogUpdateSafetySummary => ({
  explicitUserActionRequired: true,
  noImportTimeExecution: !storageContract.safety.importTimeExecution,
  noAppLoadExecution: !storageContract.safety.appLoadExecution,
  noPanelOpenExecution: !storageContract.safety.panelOpenExecution,
  noHiddenExecutableInstall: !storageContract.safety.hiddenExecutableInstall,
  noDownloadedScriptAutoRun: !storageContract.safety.downloadedScriptAutoRun,
  noObfuscation: !storageContract.safety.obfuscation,
  noWritesOutsideApprovedRoot: !storageContract.safety.writesOutsideApprovedRoot,
  noRealFileIo: !storageContract.safety.realFileIoImplemented,
  noSimulationExecution: !storageContract.safety.simulationExecution,
  preservePreviousValidEngineOnFailure: storageContract.safety.preservePreviousValidEngineOnFailure,
  pokemonShowdownAuthority: storageContract.safety.pokemonShowdownAuthority,
  catalogRole: storageContract.safety.catalogRole,
})

export async function createShowdownEngineCatalogUpdateReadModel(
  input: ShowdownEngineCatalogUpdateReadModelInput = {},
): Promise<ShowdownEngineCatalogUpdateReadModel> {
  const architectureReadModel = input.architectureReadModel ?? await createShowdownEngineUpdateArchitectureReadModel()
  const updateReadModel = input.updateReadModel ?? sampleShowdownEngineUpdateReadModels.complete
  const storageContract = input.storageContract ?? sampleShowdownEngineStorageAdapterContract

  return {
    readModelId: 'showdown-engine-catalog-update-read-model-preview',
    status: updateReadModel.status,
    phase: updateReadModel.phase,
    message: updateReadModel.message,
    progressRows: createProgressRows(updateReadModel),
    activeRevision: summarizeRevision(architectureReadModel.activeRevision, storageContract.activeRevision),
    stagedRevision: architectureReadModel.stagedRevision
      ? summarizeRevision(architectureReadModel.stagedRevision, storageContract.stagingRevision)
      : missingRevision('staged'),
    rejectedRevision: summarizeRevision(null, storageContract.rejectedRevision),
    storage: createStorageSummary(storageContract),
    readiness: createReadinessSummary(architectureReadModel, storageContract),
    safety: createSafetySummary(storageContract),
    boundaryNotes: [
      ...architectureReadModel.boundaryNotes,
      ...storageContract.notes,
      'Catalog Update read-model projection is data-only and does not trigger Engine execution.',
    ],
  }
}

export async function createShowdownEngineCatalogUpdateReadModelSamples() {
  const completeArchitecture = await createShowdownEngineUpdateArchitectureReadModel()
  const failedArchitecture = await createFailedShowdownEngineUpdateArchitectureReadModel()
  const cancelledArchitecture = await createCancelledShowdownEngineUpdateArchitectureReadModel()

  return {
    complete: await createShowdownEngineCatalogUpdateReadModel({
      updateReadModel: sampleShowdownEngineUpdateReadModels.complete,
      architectureReadModel: completeArchitecture,
    }),
    warning: await createShowdownEngineCatalogUpdateReadModel({
      updateReadModel: sampleShowdownEngineUpdateReadModels.warning,
      architectureReadModel: completeArchitecture,
    }),
    failed: await createShowdownEngineCatalogUpdateReadModel({
      updateReadModel: sampleShowdownEngineUpdateReadModels.failed,
      architectureReadModel: failedArchitecture,
    }),
    cancelled: await createShowdownEngineCatalogUpdateReadModel({
      updateReadModel: sampleShowdownEngineUpdateReadModels.cancelled,
      architectureReadModel: cancelledArchitecture,
    }),
    current: await createShowdownEngineCatalogUpdateReadModel({
      updateReadModel: sampleShowdownEngineUpdateReadModels.current,
      architectureReadModel: completeArchitecture,
    }),
  }
}
