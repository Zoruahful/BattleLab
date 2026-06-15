import type { ShowdownEngineFormatRegistryValidationPlan } from './showdownEngineFormatRegistryValidationPlan'
import {
  sampleShowdownEngineActiveRevisionPointer,
  sampleShowdownEngineStagingRevisionPointer,
  showdownEngineStorageRootDescriptor,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineActivationGateStatus =
  | 'activation-ready'
  | 'blocked'
  | 'failed-preserves-active'
  | 'cancelled-preserves-active'

export type ShowdownEngineActivationGateDecision =
  | 'promote-staged-revision'
  | 'blocked'
  | 'reject-staged-revision'
  | 'cancelled'

export interface ShowdownEngineActivationGatePrerequisite {
  key:
    | 'immutable-source-policy'
    | 'archive-contents-manifest'
    | 'extraction-staging'
    | 'required-files'
    | 'format-registry-validation'
    | 'custom-format-overlay'
  status: 'ready' | 'blocked' | 'failed' | 'cancelled'
  message: string
  metadataOnly: true
}

export interface ShowdownEngineActivationGateStorageTarget {
  rootFolderKey: typeof showdownEngineStorageRootDescriptor.rootFolderKey
  activeRevisionFolderKey: typeof showdownEngineStorageRootDescriptor.activeRevisionFolderKey
  stagingRevisionFolderKey: typeof showdownEngineStorageRootDescriptor.stagingRevisionFolderKey
  customOverlayFolderKey: typeof showdownEngineStorageRootDescriptor.customOverlayFolderKey
  pathResolvedByFutureAdapter: true
  writesFiles: false
}

export interface ShowdownEngineActivationGatePromotion {
  decision: ShowdownEngineActivationGateDecision
  promotionBlocked: boolean
  previousActiveRevisionId: string
  stagedRevisionId: string | null
  resultingActiveRevisionId: string
  previousActivePreserved: true
  reason: string
}

export interface ShowdownEngineActivationGateSafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
  noArchiveInspection: true
  noArchiveExtraction: true
  noFileIo: true
  noFileReads: true
  noDynamicImports: true
  noLoaderExecution: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineActivationGate {
  gateId: string
  status: ShowdownEngineActivationGateStatus
  message: string
  registryValidationPlanId: string
  prerequisites: ShowdownEngineActivationGatePrerequisite[]
  storageTarget: ShowdownEngineActivationGateStorageTarget
  promotion: ShowdownEngineActivationGatePromotion
  safety: ShowdownEngineActivationGateSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineActivationGateInput {
  registryValidationPlan: ShowdownEngineFormatRegistryValidationPlan
  scenario?: 'normal' | 'failed' | 'cancelled'
  gateId?: string
}

const determineStatus = (
  plan: ShowdownEngineFormatRegistryValidationPlan,
  scenario: ShowdownEngineActivationGateInput['scenario'] = 'normal',
): ShowdownEngineActivationGateStatus => {
  if (scenario === 'failed') return 'failed-preserves-active'
  if (scenario === 'cancelled') return 'cancelled-preserves-active'

  return plan.status === 'ready-for-future-validation' ? 'activation-ready' : 'blocked'
}

const createMessage = (status: ShowdownEngineActivationGateStatus): string => {
  if (status === 'activation-ready') {
    return 'Pokemon Showdown Engine activation prerequisites are represented for a future approved promotion handoff.'
  }

  if (status === 'failed-preserves-active') {
    return 'Failed activation gate rejects staged metadata and preserves the previous active Engine revision.'
  }

  if (status === 'cancelled-preserves-active') {
    return 'Cancelled activation gate preserves the previous active Engine revision.'
  }

  return 'Pokemon Showdown Engine activation remains blocked until all source, manifest, extraction, and registry prerequisites are ready.'
}

const createPrerequisites = (
  plan: ShowdownEngineFormatRegistryValidationPlan,
  status: ShowdownEngineActivationGateStatus,
): ShowdownEngineActivationGatePrerequisite[] => {
  const failedOrCancelled = status === 'failed-preserves-active' || status === 'cancelled-preserves-active'
  const terminalStatus = status === 'failed-preserves-active' ? 'failed' : 'cancelled'
  const prerequisiteStatus = (ready: boolean): ShowdownEngineActivationGatePrerequisite['status'] =>
    failedOrCancelled ? terminalStatus : ready ? 'ready' : 'blocked'

  return [
    {
      key: 'immutable-source-policy',
      status: prerequisiteStatus(plan.safety.pokemonShowdownAuthority === 'pokemon-showdown-legality-source-of-truth'),
      message: 'Immutable Pokemon Showdown source policy must be approved before activation.',
      metadataOnly: true,
    },
    {
      key: 'archive-contents-manifest',
      status: prerequisiteStatus(plan.extractionPlanStatus === 'ready-for-future-staging'),
      message: 'Archive contents manifest and extraction staging must be represented before activation.',
      metadataOnly: true,
    },
    {
      key: 'extraction-staging',
      status: prerequisiteStatus(plan.extractionPlanStatus === 'ready-for-future-staging'),
      message: 'Extraction/staging handoff must be ready before promotion.',
      metadataOnly: true,
    },
    {
      key: 'required-files',
      status: prerequisiteStatus(plan.registrySourceFile.readinessStatus === 'valid'),
      message: 'Required Pokemon Showdown files, including the official format registry source, must validate.',
      metadataOnly: true,
    },
    {
      key: 'format-registry-validation',
      status: prerequisiteStatus(plan.status === 'ready-for-future-validation'),
      message: 'Official Pokemon Showdown format registry validation must be available before activation.',
      metadataOnly: true,
    },
    {
      key: 'custom-format-overlay',
      status: prerequisiteStatus(!plan.customOverlay.modifiesUpstreamSourceInPlace && plan.customOverlay.readinessStatus === 'supported'),
      message: 'BattleLab custom formats must remain overlays and must not modify upstream source in place.',
      metadataOnly: true,
    },
  ]
}

const createPromotion = (
  status: ShowdownEngineActivationGateStatus,
  plan: ShowdownEngineFormatRegistryValidationPlan,
): ShowdownEngineActivationGatePromotion => {
  if (status === 'activation-ready') {
    return {
      decision: 'promote-staged-revision',
      promotionBlocked: false,
      previousActiveRevisionId: plan.promotionGate.previousActiveRevisionId,
      stagedRevisionId: plan.promotionGate.stagedRevisionId,
      resultingActiveRevisionId: plan.promotionGate.stagedRevisionId ?? sampleShowdownEngineStagingRevisionPointer.revisionId,
      previousActivePreserved: true,
      reason: 'Future activation may promote the staged revision only after real storage promotion is approved.',
    }
  }

  if (status === 'failed-preserves-active') {
    return {
      decision: 'reject-staged-revision',
      promotionBlocked: true,
      previousActiveRevisionId: plan.promotionGate.previousActiveRevisionId,
      stagedRevisionId: null,
      resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
      previousActivePreserved: true,
      reason: 'Failed activation gate preserves previous active Engine metadata.',
    }
  }

  if (status === 'cancelled-preserves-active') {
    return {
      decision: 'cancelled',
      promotionBlocked: true,
      previousActiveRevisionId: plan.promotionGate.previousActiveRevisionId,
      stagedRevisionId: null,
      resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
      previousActivePreserved: true,
      reason: 'Cancelled activation gate preserves previous active Engine metadata.',
    }
  }

  return {
    decision: 'blocked',
    promotionBlocked: true,
    previousActiveRevisionId: plan.promotionGate.previousActiveRevisionId,
    stagedRevisionId: null,
    resultingActiveRevisionId: sampleShowdownEngineActiveRevisionPointer.revisionId,
    previousActivePreserved: true,
    reason: 'Activation is blocked by unmet prerequisite metadata.',
  }
}

export function createShowdownEngineActivationGate(
  input: ShowdownEngineActivationGateInput,
): ShowdownEngineActivationGate {
  const scenario = input.scenario ?? 'normal'
  const status = determineStatus(input.registryValidationPlan, scenario)

  return {
    gateId: input.gateId ?? `${input.registryValidationPlan.planId}-activation-gate`,
    status,
    message: createMessage(status),
    registryValidationPlanId: input.registryValidationPlan.planId,
    prerequisites: createPrerequisites(input.registryValidationPlan, status),
    storageTarget: {
      rootFolderKey: showdownEngineStorageRootDescriptor.rootFolderKey,
      activeRevisionFolderKey: showdownEngineStorageRootDescriptor.activeRevisionFolderKey,
      stagingRevisionFolderKey: showdownEngineStorageRootDescriptor.stagingRevisionFolderKey,
      customOverlayFolderKey: showdownEngineStorageRootDescriptor.customOverlayFolderKey,
      pathResolvedByFutureAdapter: true,
      writesFiles: false,
    },
    promotion: createPromotion(status, input.registryValidationPlan),
    safety: {
      noImportTimeDownload: input.registryValidationPlan.safety.noImportTimeDownload,
      noAppLoadDownload: input.registryValidationPlan.safety.noAppLoadDownload,
      noPanelOpenDownload: input.registryValidationPlan.safety.noPanelOpenDownload,
      noArchiveInspection: input.registryValidationPlan.safety.noArchiveInspection,
      noArchiveExtraction: input.registryValidationPlan.safety.noArchiveExtraction,
      noFileIo: input.registryValidationPlan.safety.noFileIo,
      noFileReads: input.registryValidationPlan.safety.noFileReads,
      noDynamicImports: input.registryValidationPlan.safety.noDynamicImports,
      noLoaderExecution: input.registryValidationPlan.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: input.registryValidationPlan.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: input.registryValidationPlan.safety.noSimulationExecution,
      customFormatsOverlayOnly: input.registryValidationPlan.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: input.registryValidationPlan.safety.pokemonShowdownAuthority,
      catalogRole: input.registryValidationPlan.safety.catalogRole,
    },
    boundaryNotes: [
      ...input.registryValidationPlan.boundaryNotes,
      'Activation gate is metadata-only and does not read files, write files, import source, execute loaders, wire UI, or run simulation.',
      'Future real promotion must preserve the previous active Engine until immutable source, manifest, extraction, required-file, and format-registry validation all pass.',
    ],
  }
}
