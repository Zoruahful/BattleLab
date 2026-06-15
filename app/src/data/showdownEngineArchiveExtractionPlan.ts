import type { ShowdownEngineArchiveContentsManifest } from './showdownEngineArchiveContentsManifest'
import {
  sampleShowdownEngineActiveRevisionPointer,
  sampleShowdownEngineRejectedRevisionPointer,
  sampleShowdownEngineStagingRevisionPointer,
  showdownEngineStorageRootDescriptor,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineArchiveExtractionPlanStatus =
  | 'ready-for-future-staging'
  | 'blocked-by-source-policy'
  | 'blocked-by-manifest'
  | 'failed-preserves-active'
  | 'cancelled-preserves-active'

export type ShowdownEngineArchiveExtractionDecision = 'promote-ready' | 'reject' | 'blocked' | 'cancelled'

export interface ShowdownEngineArchiveExtractionTarget {
  rootFolderKey: 'battlelab-showdown-engine'
  stagingRevisionFolderKey: 'staging'
  activeRevisionFolderKey: 'active'
  rejectedRevisionFolderKey: 'staging'
  targetRevisionId: string
  targetFolderMetadataOnly: true
  concretePathResolvedByFutureAdapter: true
}

export interface ShowdownEngineArchiveExtractionValidationHandoff {
  immutableSourcePolicyStatus: ShowdownEngineArchiveContentsManifest['immutableSourcePolicy']['status']
  contentsManifestStatus: ShowdownEngineArchiveContentsManifest['status']
  requiredFileStatus: 'valid' | 'invalid' | 'not-inspected'
  requiredFileCount: number
  formatRegistryStatus: 'planned'
  customOverlayStatus: ShowdownEngineArchiveContentsManifest['overlayHandoff']['status']
}

export interface ShowdownEngineArchiveExtractionPlanDecision {
  decision: ShowdownEngineArchiveExtractionDecision
  message: string
  previousActiveRevisionId: string
  resultingActiveRevisionId: string
  stagedRevisionId: string | null
  rejectedRevisionId: string | null
  previousActivePreserved: true
}

export interface ShowdownEngineArchiveExtractionPlanSafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
  noArchiveInspection: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveExtractionPlan {
  planId: string
  status: ShowdownEngineArchiveExtractionPlanStatus
  message: string
  contentsManifest: ShowdownEngineArchiveContentsManifest
  extractionTarget: ShowdownEngineArchiveExtractionTarget
  validationHandoff: ShowdownEngineArchiveExtractionValidationHandoff
  decision: ShowdownEngineArchiveExtractionPlanDecision
  safety: ShowdownEngineArchiveExtractionPlanSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineArchiveExtractionPlanInput {
  contentsManifest: ShowdownEngineArchiveContentsManifest
  scenario?: 'normal' | 'failed' | 'cancelled'
  planId?: string
}

const determineStatus = (
  contentsManifest: ShowdownEngineArchiveContentsManifest,
  scenario: ShowdownEngineArchiveExtractionPlanInput['scenario'] = 'normal',
): ShowdownEngineArchiveExtractionPlanStatus => {
  if (scenario === 'failed') {
    return 'failed-preserves-active'
  }

  if (scenario === 'cancelled') {
    return 'cancelled-preserves-active'
  }

  if (contentsManifest.immutableSourcePolicy.status !== 'immutable-pinned-approved') {
    return 'blocked-by-source-policy'
  }

  if (contentsManifest.status !== 'manifest-valid') {
    return 'blocked-by-manifest'
  }

  return 'ready-for-future-staging'
}

const createMessage = (status: ShowdownEngineArchiveExtractionPlanStatus): string => {
  if (status === 'ready-for-future-staging') {
    return 'Extraction and staging prerequisites are represented for a future approved no-IO-to-real-IO handoff.'
  }

  if (status === 'blocked-by-source-policy') {
    return 'Extraction planning is blocked until immutable source revision policy is pinned-approved.'
  }

  if (status === 'blocked-by-manifest') {
    return 'Extraction planning is blocked until archive contents manifest prerequisites pass.'
  }

  if (status === 'cancelled-preserves-active') {
    return 'Cancelled extraction planning preserves the previous active Engine revision.'
  }

  return 'Failed extraction planning rejects staged metadata and preserves the previous active Engine revision.'
}

const createDecision = (
  status: ShowdownEngineArchiveExtractionPlanStatus,
  manifest: ShowdownEngineArchiveContentsManifest,
): ShowdownEngineArchiveExtractionPlanDecision => {
  if (status === 'ready-for-future-staging') {
    return {
      decision: 'promote-ready',
      message: 'Future staged revision can proceed only after real extraction, required-file, and format-registry validation are approved.',
      previousActiveRevisionId: manifest.promotionGate.previousActiveRevisionId,
      resultingActiveRevisionId: sampleShowdownEngineStagingRevisionPointer.revisionId,
      stagedRevisionId: sampleShowdownEngineStagingRevisionPointer.revisionId,
      rejectedRevisionId: null,
      previousActivePreserved: true,
    }
  }

  if (status === 'cancelled-preserves-active') {
    return {
      decision: 'cancelled',
      message: 'Cancellation leaves the previous active Engine untouched.',
      previousActiveRevisionId: manifest.promotionGate.previousActiveRevisionId,
      resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
      stagedRevisionId: null,
      rejectedRevisionId: null,
      previousActivePreserved: true,
    }
  }

  if (status === 'failed-preserves-active') {
    return {
      decision: 'reject',
      message: 'Failed staged metadata is rejected and previous active Engine remains active.',
      previousActiveRevisionId: manifest.promotionGate.previousActiveRevisionId,
      resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
      stagedRevisionId: null,
      rejectedRevisionId: sampleShowdownEngineRejectedRevisionPointer.revisionId,
      previousActivePreserved: true,
    }
  }

  return {
    decision: 'blocked',
    message: 'Extraction plan is blocked by unmet source or manifest prerequisites.',
    previousActiveRevisionId: manifest.promotionGate.previousActiveRevisionId,
    resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
    stagedRevisionId: null,
    rejectedRevisionId: null,
    previousActivePreserved: true,
  }
}

export function createShowdownEngineArchiveExtractionPlan(
  input: ShowdownEngineArchiveExtractionPlanInput,
): ShowdownEngineArchiveExtractionPlan {
  const scenario = input.scenario ?? 'normal'
  const status = determineStatus(input.contentsManifest, scenario)

  return {
    planId: input.planId ?? `${input.contentsManifest.manifestId}-extraction-plan`,
    status,
    message: createMessage(status),
    contentsManifest: input.contentsManifest,
    extractionTarget: {
      rootFolderKey: showdownEngineStorageRootDescriptor.rootFolderKey,
      stagingRevisionFolderKey: showdownEngineStorageRootDescriptor.stagingRevisionFolderKey,
      activeRevisionFolderKey: showdownEngineStorageRootDescriptor.activeRevisionFolderKey,
      rejectedRevisionFolderKey: showdownEngineStorageRootDescriptor.stagingRevisionFolderKey,
      targetRevisionId: sampleShowdownEngineStagingRevisionPointer.revisionId,
      targetFolderMetadataOnly: true,
      concretePathResolvedByFutureAdapter: true,
    },
    validationHandoff: {
      immutableSourcePolicyStatus: input.contentsManifest.immutableSourcePolicy.status,
      contentsManifestStatus: input.contentsManifest.status,
      requiredFileStatus:
        input.contentsManifest.status === 'manifest-valid'
          ? 'valid'
          : input.contentsManifest.status === 'manifest-missing-required-file'
            ? 'invalid'
            : 'not-inspected',
      requiredFileCount: input.contentsManifest.requiredFiles.length,
      formatRegistryStatus: 'planned',
      customOverlayStatus: input.contentsManifest.overlayHandoff.status,
    },
    decision: createDecision(status, input.contentsManifest),
    safety: {
      noImportTimeDownload: input.contentsManifest.safety.noImportTimeDownload,
      noAppLoadDownload: input.contentsManifest.safety.noAppLoadDownload,
      noPanelOpenDownload: input.contentsManifest.safety.noPanelOpenDownload,
      noArchiveInspection: input.contentsManifest.safety.noArchiveInspection,
      noArchiveExtraction: input.contentsManifest.safety.noArchiveExtraction,
      noFileIo: input.contentsManifest.safety.noFileIo,
      noDynamicImports: input.contentsManifest.safety.noDynamicImports,
      noLoaderExecution: input.contentsManifest.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: input.contentsManifest.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: input.contentsManifest.safety.noSimulationExecution,
      customFormatsOverlayOnly: input.contentsManifest.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: input.contentsManifest.safety.pokemonShowdownAuthority,
      catalogRole: input.contentsManifest.safety.catalogRole,
    },
    boundaryNotes: [
      ...input.contentsManifest.boundaryNotes,
      'Archive extraction plan is metadata-only and does not inspect, extract, write, import, load, or execute archive contents.',
      'Future real extraction must stage under app-managed Engine storage and preserve the previous active Engine until validation passes.',
    ],
  }
}

