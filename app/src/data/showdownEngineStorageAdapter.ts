import type {
  ShowdownEngineArchiveIntegrity,
  ShowdownEngineRequiredFileCheck,
  ShowdownEngineRevisionMetadata,
  ShowdownEngineSourceArchiveDescriptor,
  ShowdownEngineStoragePlan,
  ShowdownEngineUpdateExecutionTrigger,
} from './showdownEngineUpdateArchitecture'
import {
  sampleShowdownEngineArchiveIntegrity,
  showdownEngineGitHubSourceArchive,
  showdownEngineRequiredFileChecks,
  showdownEngineStoragePlan,
} from './showdownEngineUpdateArchitecture'
import type {
  ShowdownEngineFormatRegistryReadModel,
  ShowdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'
import {
  sampleShowdownEngineFormatRegistry,
  showdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'

export type ShowdownEngineStorageAdapterKind = 'contract-only-app-managed-storage'

export type ShowdownEngineStorageOperationKind =
  | 'resolve-engine-root'
  | 'create-staging-revision'
  | 'write-staged-archive-metadata'
  | 'read-staged-archive-metadata'
  | 'validate-required-file-manifest'
  | 'promote-staged-revision'
  | 'reject-staged-revision'
  | 'read-active-revision-metadata'

export type ShowdownEngineStorageOperationStatus =
  | 'planned'
  | 'ready'
  | 'blocked'
  | 'validated'
  | 'promoted'
  | 'rejected'

export type ShowdownEngineStorageSafetyStatus = 'closed' | 'unsafe'

export interface ShowdownEngineStorageRootDescriptor {
  rootFolderKey: ShowdownEngineStoragePlan['rootFolderKey']
  activeRevisionFolderKey: ShowdownEngineStoragePlan['activeRevisionFolderKey']
  stagingRevisionFolderKey: ShowdownEngineStoragePlan['stagingRevisionFolderKey']
  customOverlayFolderKey: ShowdownEngineStoragePlan['customOverlayFolderKey']
  logicalRootLabel: string
  pathResolvedByFutureAdapter: true
  concretePath?: never
  allowWritesOutsideRoot: false
}

export interface ShowdownEngineStorageRevisionPointer {
  revisionId: string
  folderKey: string
  status: 'active' | 'staged' | 'rejected'
  metadataOnly: true
}

export interface ShowdownEngineStorageArchiveMetadata {
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  archiveIntegrity: ShowdownEngineArchiveIntegrity
  downloadedAt: string
  preparedAt: string
  metadataOnly: true
}

export interface ShowdownEngineStorageRequiredFileManifest {
  requiredFiles: ShowdownEngineRequiredFileCheck[]
  status: 'not-checked' | 'valid' | 'invalid'
  message: string
}

export interface ShowdownEngineStorageOperation {
  kind: ShowdownEngineStorageOperationKind
  status: ShowdownEngineStorageOperationStatus
  explicitUserActionRequired: true
  writesFiles: false
  runsDownloadedScripts: false
  message: string
}

export interface ShowdownEngineStorageAdapterSafety {
  trigger: ShowdownEngineUpdateExecutionTrigger
  adapterKind: ShowdownEngineStorageAdapterKind
  importTimeExecution: false
  appLoadExecution: false
  panelOpenExecution: false
  hiddenExecutableInstall: false
  downloadedScriptAutoRun: false
  obfuscation: false
  writesOutsideApprovedRoot: false
  realFileIoImplemented: false
  simulationExecution: false
  preservePreviousValidEngineOnFailure: true
  pokemonShowdownAuthority: ShowdownEngineUpdateSafetyPolicy['pokemonShowdownAuthority']
  catalogRole: ShowdownEngineUpdateSafetyPolicy['catalogRole']
  status: ShowdownEngineStorageSafetyStatus
}

export interface ShowdownEngineStorageAdapterContract {
  contractId: string
  adapterKind: ShowdownEngineStorageAdapterKind
  trigger: ShowdownEngineUpdateExecutionTrigger
  root: ShowdownEngineStorageRootDescriptor
  activeRevision: ShowdownEngineStorageRevisionPointer
  stagingRevision: ShowdownEngineStorageRevisionPointer
  rejectedRevision: ShowdownEngineStorageRevisionPointer
  archiveMetadata: ShowdownEngineStorageArchiveMetadata
  requiredFileManifest: ShowdownEngineStorageRequiredFileManifest
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  operations: ShowdownEngineStorageOperation[]
  safety: ShowdownEngineStorageAdapterSafety
  notes: string[]
}

export interface ShowdownEngineStorageAdapterScenario {
  scenarioId: string
  status: 'success' | 'failed' | 'cancelled'
  previousActiveRevision: ShowdownEngineStorageRevisionPointer
  stagedRevision: ShowdownEngineStorageRevisionPointer | null
  resultingActiveRevision: ShowdownEngineStorageRevisionPointer
  replacementValidated: boolean
  message: string
}

const sampleTimestamp = '2026-06-15T19:30:00.000Z'

export const showdownEngineStorageRootDescriptor: ShowdownEngineStorageRootDescriptor = {
  rootFolderKey: showdownEngineStoragePlan.rootFolderKey,
  activeRevisionFolderKey: showdownEngineStoragePlan.activeRevisionFolderKey,
  stagingRevisionFolderKey: showdownEngineStoragePlan.stagingRevisionFolderKey,
  customOverlayFolderKey: showdownEngineStoragePlan.customOverlayFolderKey,
  logicalRootLabel: 'BattleLab app-managed Pokemon Showdown Engine storage',
  pathResolvedByFutureAdapter: true,
  allowWritesOutsideRoot: false,
}

export const sampleShowdownEngineActiveRevisionPointer: ShowdownEngineStorageRevisionPointer = {
  revisionId: 'pokemon-showdown-current-valid-preview',
  folderKey: showdownEngineStoragePlan.activeRevisionFolderKey,
  status: 'active',
  metadataOnly: true,
}

export const sampleShowdownEngineStagingRevisionPointer: ShowdownEngineStorageRevisionPointer = {
  revisionId: 'pokemon-showdown-master-preview-staged',
  folderKey: showdownEngineStoragePlan.stagingRevisionFolderKey,
  status: 'staged',
  metadataOnly: true,
}

export const sampleShowdownEngineRejectedRevisionPointer: ShowdownEngineStorageRevisionPointer = {
  revisionId: 'pokemon-showdown-master-preview-rejected',
  folderKey: showdownEngineStoragePlan.stagingRevisionFolderKey,
  status: 'rejected',
  metadataOnly: true,
}

export const sampleShowdownEngineStorageArchiveMetadata: ShowdownEngineStorageArchiveMetadata = {
  sourceArchive: showdownEngineGitHubSourceArchive,
  archiveIntegrity: sampleShowdownEngineArchiveIntegrity,
  downloadedAt: sampleTimestamp,
  preparedAt: sampleTimestamp,
  metadataOnly: true,
}

export const sampleShowdownEngineStorageRequiredFileManifest: ShowdownEngineStorageRequiredFileManifest = {
  requiredFiles: showdownEngineRequiredFileChecks,
  status: 'valid',
  message: 'Required Pokemon Showdown Engine files are represented for future staged revision validation.',
}

export const showdownEngineStorageAdapterSafety: ShowdownEngineStorageAdapterSafety = {
  trigger: 'catalog-update-user-click-update',
  adapterKind: 'contract-only-app-managed-storage',
  importTimeExecution: false,
  appLoadExecution: false,
  panelOpenExecution: false,
  hiddenExecutableInstall: false,
  downloadedScriptAutoRun: false,
  obfuscation: false,
  writesOutsideApprovedRoot: false,
  realFileIoImplemented: false,
  simulationExecution: false,
  preservePreviousValidEngineOnFailure: true,
  pokemonShowdownAuthority: showdownEngineUpdateSafetyPolicy.pokemonShowdownAuthority,
  catalogRole: showdownEngineUpdateSafetyPolicy.catalogRole,
  status: 'closed',
}

export const sampleShowdownEngineStorageOperations: ShowdownEngineStorageOperation[] = [
  {
    kind: 'resolve-engine-root',
    status: 'ready',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Resolve logical app-managed Engine root through a future storage adapter.',
  },
  {
    kind: 'create-staging-revision',
    status: 'planned',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Create a staging revision under the approved Engine root before activation.',
  },
  {
    kind: 'write-staged-archive-metadata',
    status: 'planned',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Persist source archive and checksum metadata in the staged revision once file IO is approved.',
  },
  {
    kind: 'read-staged-archive-metadata',
    status: 'planned',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Read staged metadata before validation and promotion.',
  },
  {
    kind: 'validate-required-file-manifest',
    status: 'validated',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Validate required Pokemon Showdown files before activation.',
  },
  {
    kind: 'promote-staged-revision',
    status: 'promoted',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Promote staged revision to active only after hash, required-file, and format registry validation passes.',
  },
  {
    kind: 'reject-staged-revision',
    status: 'rejected',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Reject staged revision and keep previous active Engine data after failure or cancellation.',
  },
  {
    kind: 'read-active-revision-metadata',
    status: 'ready',
    explicitUserActionRequired: true,
    writesFiles: false,
    runsDownloadedScripts: false,
    message: 'Read active Engine revision metadata for future Catalog Update status surfaces.',
  },
]

export const sampleShowdownEngineStorageAdapterContract: ShowdownEngineStorageAdapterContract = {
  contractId: 'showdown-engine-storage-adapter-contract-v1',
  adapterKind: 'contract-only-app-managed-storage',
  trigger: 'catalog-update-user-click-update',
  root: showdownEngineStorageRootDescriptor,
  activeRevision: sampleShowdownEngineActiveRevisionPointer,
  stagingRevision: sampleShowdownEngineStagingRevisionPointer,
  rejectedRevision: sampleShowdownEngineRejectedRevisionPointer,
  archiveMetadata: sampleShowdownEngineStorageArchiveMetadata,
  requiredFileManifest: sampleShowdownEngineStorageRequiredFileManifest,
  formatRegistry: sampleShowdownEngineFormatRegistry,
  operations: sampleShowdownEngineStorageOperations,
  safety: showdownEngineStorageAdapterSafety,
  notes: [
    'This contract is metadata-only and does not implement real file IO.',
    'Future storage implementation must run only after Catalog Update -> Update.',
    'Previous valid Engine data remains active until staged replacement validates.',
    'Downloaded Pokemon Showdown source files must not be run automatically.',
  ],
}

export const sampleShowdownEngineStorageScenarios: ShowdownEngineStorageAdapterScenario[] = [
  {
    scenarioId: 'storage-promote-validated-staging',
    status: 'success',
    previousActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    stagedRevision: sampleShowdownEngineStagingRevisionPointer,
    resultingActiveRevision: {
      ...sampleShowdownEngineStagingRevisionPointer,
      folderKey: showdownEngineStoragePlan.activeRevisionFolderKey,
      status: 'active',
    },
    replacementValidated: true,
    message: 'Validated staged revision can become active in a future storage implementation.',
  },
  {
    scenarioId: 'storage-failed-keeps-active',
    status: 'failed',
    previousActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    stagedRevision: sampleShowdownEngineRejectedRevisionPointer,
    resultingActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    replacementValidated: false,
    message: 'Failed staged revision is rejected and previous active Engine remains active.',
  },
  {
    scenarioId: 'storage-cancelled-keeps-active',
    status: 'cancelled',
    previousActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    stagedRevision: null,
    resultingActiveRevision: sampleShowdownEngineActiveRevisionPointer,
    replacementValidated: false,
    message: 'Cancelled update leaves previous active Engine untouched.',
  },
]

export function createShowdownEngineStorageRevisionMetadata(
  status: ShowdownEngineRevisionMetadata['status'] = 'staged',
): ShowdownEngineRevisionMetadata {
  return {
    revisionId:
      status === 'active'
        ? sampleShowdownEngineActiveRevisionPointer.revisionId
        : status === 'rejected'
          ? sampleShowdownEngineRejectedRevisionPointer.revisionId
          : sampleShowdownEngineStagingRevisionPointer.revisionId,
    versionLabel: showdownEngineGitHubSourceArchive.versionLabel,
    sourceArchive: showdownEngineGitHubSourceArchive,
    archiveIntegrity: sampleShowdownEngineArchiveIntegrity,
    requiredFiles: showdownEngineRequiredFileChecks,
    formatRegistry: sampleShowdownEngineFormatRegistry,
    status,
    preparedAt: sampleTimestamp,
  }
}
