import type {
  ShowdownEngineDataSnapshot,
  ShowdownEngineFormatRegistryReadModel,
  ShowdownEngineUpdateProgressEvent,
  ShowdownEngineUpdateSafetyPolicy,
  ShowdownEngineUpdateStatus,
} from './showdownEngineUpdateService'
import {
  createShowdownEngineFormatRegistryReadModel,
  sampleCurrentShowdownEngineData,
  showdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'

export type ShowdownEngineSourceArchiveKind = 'github-source-archive'

export type ShowdownEngineUpdateExecutionTrigger = 'catalog-update-user-click-update'

export type ShowdownEngineArchiveHashAlgorithm = 'sha256'

export type ShowdownEngineRevisionStatus = 'current' | 'staged' | 'active' | 'rejected'

export type ShowdownEngineArchitectureValidationStatus =
  | 'not-checked'
  | 'checking'
  | 'valid'
  | 'warning'
  | 'failed'
  | 'cancelled'

export interface ShowdownEngineSourceArchiveDescriptor {
  sourceKind: ShowdownEngineSourceArchiveKind
  repositoryOwner: 'smogon'
  repositoryName: 'pokemon-showdown'
  archiveUrl: string
  revision: string
  versionLabel: string
  requestedAt: string
  downloadStrategy: 'https-archive-download'
  disallowGitClone: true
  disallowDynamicNpmInstall: true
}

export interface ShowdownEngineArchiveIntegrity {
  algorithm: ShowdownEngineArchiveHashAlgorithm
  expectedHash: string
  actualHash?: string
  status: ShowdownEngineArchitectureValidationStatus
  message: string
}

export interface ShowdownEngineRequiredFileCheck {
  relativePath: string
  purpose: 'dex-data' | 'formats-registry' | 'team-validator' | 'package-metadata'
  required: true
  status: ShowdownEngineArchitectureValidationStatus
  message: string
}

export interface ShowdownEngineStoragePlan {
  rootFolderKey: 'battlelab-showdown-engine'
  activeRevisionFolderKey: 'active'
  stagingRevisionFolderKey: 'staging'
  customOverlayFolderKey: 'battlelab-custom-overlays'
  allowWritesOutsideRoot: false
  activationStrategy: 'validate-staging-before-swap'
  preservePreviousValidOnFailure: true
}

export interface ShowdownEngineCustomFormatOverlayPolicy {
  supported: true
  modifyUpstreamSourceInPlace: false
  overlayFolderKey: 'battlelab-custom-overlays'
  mergeStrategy: 'read-overlay-after-official-registry'
  note: string
}

export interface ShowdownEngineRevisionMetadata {
  revisionId: string
  versionLabel: string
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  archiveIntegrity: ShowdownEngineArchiveIntegrity
  requiredFiles: ShowdownEngineRequiredFileCheck[]
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  status: ShowdownEngineRevisionStatus
  preparedAt: string
}

export interface ShowdownEngineUpdateArchitectureReadModel {
  updateId: string
  trigger: ShowdownEngineUpdateExecutionTrigger
  status: ShowdownEngineUpdateStatus
  sourceArchive: ShowdownEngineSourceArchiveDescriptor
  storagePlan: ShowdownEngineStoragePlan
  customFormatOverlayPolicy: ShowdownEngineCustomFormatOverlayPolicy
  previousValidEngine: ShowdownEngineDataSnapshot | null
  stagedRevision: ShowdownEngineRevisionMetadata | null
  activeRevision: ShowdownEngineRevisionMetadata | null
  safetyPolicy: ShowdownEngineUpdateSafetyPolicy
  events: ShowdownEngineUpdateProgressEvent[]
  boundaryNotes: string[]
}

const sampleTimestamp = '2026-06-15T19:00:00.000Z'

export const showdownEngineGitHubSourceArchive: ShowdownEngineSourceArchiveDescriptor = {
  sourceKind: 'github-source-archive',
  repositoryOwner: 'smogon',
  repositoryName: 'pokemon-showdown',
  archiveUrl: 'https://github.com/smogon/pokemon-showdown/archive/refs/heads/master.zip',
  revision: 'master-archive-preview',
  versionLabel: 'pokemon-showdown-github-master-preview',
  requestedAt: sampleTimestamp,
  downloadStrategy: 'https-archive-download',
  disallowGitClone: true,
  disallowDynamicNpmInstall: true,
}

export const showdownEngineStoragePlan: ShowdownEngineStoragePlan = {
  rootFolderKey: 'battlelab-showdown-engine',
  activeRevisionFolderKey: 'active',
  stagingRevisionFolderKey: 'staging',
  customOverlayFolderKey: 'battlelab-custom-overlays',
  allowWritesOutsideRoot: false,
  activationStrategy: 'validate-staging-before-swap',
  preservePreviousValidOnFailure: true,
}

export const showdownEngineCustomFormatOverlayPolicy: ShowdownEngineCustomFormatOverlayPolicy = {
  supported: true,
  modifyUpstreamSourceInPlace: false,
  overlayFolderKey: 'battlelab-custom-overlays',
  mergeStrategy: 'read-overlay-after-official-registry',
  note: 'BattleLab custom formats should live beside the active Engine revision and must not patch upstream Pokemon Showdown source files in place.',
}

export const showdownEngineRequiredFileChecks: ShowdownEngineRequiredFileCheck[] = [
  {
    relativePath: 'package.json',
    purpose: 'package-metadata',
    required: true,
    status: 'valid',
    message: 'Package metadata must be present before activation.',
  },
  {
    relativePath: 'sim/dex.ts',
    purpose: 'dex-data',
    required: true,
    status: 'valid',
    message: 'Dex entrypoint must be present before activation.',
  },
  {
    relativePath: 'sim/team-validator.ts',
    purpose: 'team-validator',
    required: true,
    status: 'valid',
    message: 'Team validator source must be present before activation.',
  },
  {
    relativePath: 'config/formats.ts',
    purpose: 'formats-registry',
    required: true,
    status: 'valid',
    message: 'Official format registry source must be present before activation.',
  },
]

export const sampleShowdownEngineArchiveIntegrity: ShowdownEngineArchiveIntegrity = {
  algorithm: 'sha256',
  expectedHash: 'sha256-placeholder-approved-at-download-time',
  actualHash: 'sha256-placeholder-approved-at-download-time',
  status: 'valid',
  message: 'Future implementation must compare archive bytes against a computed sha256 before extraction/activation.',
}

const createEvent = (
  updateId: string,
  status: ShowdownEngineUpdateStatus,
  progressPercent: number,
  message: string,
): ShowdownEngineUpdateProgressEvent => ({
  eventId: `${updateId}-${status}`,
  phase: status === 'extracting-preparing' ? 'preparing' : status === 'not-started' ? 'idle' : status,
  status,
  progressPercent,
  message,
  emittedAt: sampleTimestamp,
})

const createArchitectureEvents = (updateId: string): ShowdownEngineUpdateProgressEvent[] => [
  createEvent(updateId, 'checking', 10, 'Check active Engine revision and source archive metadata.'),
  createEvent(updateId, 'downloading', 30, 'Download Pokemon Showdown GitHub source archive after explicit Update action.'),
  createEvent(updateId, 'extracting-preparing', 55, 'Extract archive into staging under the approved Engine storage root.'),
  createEvent(updateId, 'validating', 85, 'Validate archive hash, required files, and official format registry availability.'),
  createEvent(updateId, 'complete', 100, 'Activate staged Engine revision only after validation succeeds.'),
]

export async function createShowdownEngineUpdateArchitectureReadModel(): Promise<ShowdownEngineUpdateArchitectureReadModel> {
  const formatRegistry = await createShowdownEngineFormatRegistryReadModel(sampleTimestamp)
  const updateId = 'showdown-engine-archive-update-architecture'
  const stagedRevision: ShowdownEngineRevisionMetadata = {
    revisionId: 'pokemon-showdown-master-preview-staged',
    versionLabel: showdownEngineGitHubSourceArchive.versionLabel,
    sourceArchive: showdownEngineGitHubSourceArchive,
    archiveIntegrity: sampleShowdownEngineArchiveIntegrity,
    requiredFiles: showdownEngineRequiredFileChecks,
    formatRegistry,
    status: 'staged',
    preparedAt: sampleTimestamp,
  }

  return {
    updateId,
    trigger: 'catalog-update-user-click-update',
    status: 'complete',
    sourceArchive: showdownEngineGitHubSourceArchive,
    storagePlan: showdownEngineStoragePlan,
    customFormatOverlayPolicy: showdownEngineCustomFormatOverlayPolicy,
    previousValidEngine: sampleCurrentShowdownEngineData,
    stagedRevision,
    activeRevision: {
      ...stagedRevision,
      status: 'active',
      revisionId: 'pokemon-showdown-master-preview-active',
    },
    safetyPolicy: showdownEngineUpdateSafetyPolicy,
    events: createArchitectureEvents(updateId),
    boundaryNotes: [
      'Architecture uses GitHub source archive download only; no git clone and no dynamic npm install.',
      'Future implementation must run only after Catalog Update -> Update user action.',
      'Downloaded scripts are source data for validation/loading and must not be executed automatically.',
      'Failed or cancelled staging must leave the previous valid Engine active.',
      'BattleLab custom formats should be overlaid without modifying upstream Pokemon Showdown source in place.',
    ],
  }
}

export const createFailedShowdownEngineUpdateArchitectureReadModel = async () => {
  const model = await createShowdownEngineUpdateArchitectureReadModel()
  const stagedRevision = model.stagedRevision
  if (!stagedRevision) {
    throw new Error('Showdown Engine update architecture fixture is missing staged revision.')
  }

  return {
    ...model,
    status: 'failed' as const,
    stagedRevision: {
      ...stagedRevision,
      status: 'rejected' as const,
      archiveIntegrity: {
        ...sampleShowdownEngineArchiveIntegrity,
        actualHash: 'sha256-mismatch',
        status: 'failed' as const,
        message: 'Archive checksum mismatch blocks activation.',
      },
    },
    activeRevision: null,
    events: [
      ...model.events.slice(0, 4),
      createEvent(model.updateId, 'failed', 85, 'Archive validation failed; previous Engine remains active.'),
    ],
    boundaryNotes: [...model.boundaryNotes, 'Failed validation must not replace the active Engine revision.'],
  }
}

export const createCancelledShowdownEngineUpdateArchitectureReadModel = async () => {
  const model = await createShowdownEngineUpdateArchitectureReadModel()

  return {
    ...model,
    status: 'cancelled' as const,
    stagedRevision: null,
    activeRevision: null,
    events: [
      model.events[0],
      createEvent(model.updateId, 'cancelled', 10, 'User cancellation leaves the previous Engine active.'),
    ],
    boundaryNotes: [...model.boundaryNotes, 'Cancelled updates must not replace the active Engine revision.'],
  }
}
