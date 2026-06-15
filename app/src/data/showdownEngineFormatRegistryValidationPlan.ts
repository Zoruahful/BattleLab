import type { ShowdownEngineArchiveExtractionPlan } from './showdownEngineArchiveExtractionPlan'
import type {
  ShowdownEngineFormatRegistryLoaderProof,
  ShowdownEngineFormatRegistrySourceFileReadiness,
} from './showdownEngineFormatRegistryLoaderProof'
import {
  sampleShowdownEngineFormatRegistryLoaderProofs,
} from './showdownEngineFormatRegistryLoaderProof'

export type ShowdownEngineFormatRegistryValidationPlanStatus =
  | 'ready-for-future-validation'
  | 'blocked-by-extraction-plan'
  | 'blocked-by-registry-source-file'
  | 'failed-preserves-active'
  | 'cancelled-preserves-active'

export type ShowdownEngineFormatRegistryValidationPlanDecision =
  | 'validation-ready'
  | 'blocked'
  | 'reject'
  | 'cancelled'

export interface ShowdownEngineFormatRegistryValidationSourceFileHandoff {
  relativePath: ShowdownEngineFormatRegistrySourceFileReadiness['relativePath']
  purpose: 'formats-registry'
  required: true
  readinessStatus: ShowdownEngineFormatRegistrySourceFileReadiness['status']
  metadataOnly: true
}

export interface ShowdownEngineFormatRegistryValidationExpectedRegistry {
  readinessStatus: ShowdownEngineFormatRegistryLoaderProof['registry']['status']
  expectedOfficialFormatCount: number
  expectedBattleLabCustomFormatCount: number
  officialFormatsDiscoverable: boolean
  metadataOnly: true
}

export interface ShowdownEngineFormatRegistryValidationOverlayHandoff {
  overlayFolderKey: ShowdownEngineFormatRegistryLoaderProof['customOverlay']['overlayFolderKey']
  mergeStrategy: ShowdownEngineFormatRegistryLoaderProof['customOverlay']['mergeStrategy']
  modifiesUpstreamSourceInPlace: false
  readinessStatus: ShowdownEngineFormatRegistryLoaderProof['customOverlay']['status']
}

export interface ShowdownEngineFormatRegistryValidationPlanPromotionGate {
  decision: ShowdownEngineFormatRegistryValidationPlanDecision
  promotionBlocked: boolean
  reason: string
  previousActiveRevisionId: string
  stagedRevisionId: string | null
  previousActivePreserved: true
}

export interface ShowdownEngineFormatRegistryValidationPlanSafety {
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

export interface ShowdownEngineFormatRegistryValidationPlan {
  planId: string
  status: ShowdownEngineFormatRegistryValidationPlanStatus
  message: string
  extractionPlanId: string
  extractionPlanStatus: ShowdownEngineArchiveExtractionPlan['status']
  registrySourceFile: ShowdownEngineFormatRegistryValidationSourceFileHandoff
  expectedRegistry: ShowdownEngineFormatRegistryValidationExpectedRegistry
  customOverlay: ShowdownEngineFormatRegistryValidationOverlayHandoff
  promotionGate: ShowdownEngineFormatRegistryValidationPlanPromotionGate
  safety: ShowdownEngineFormatRegistryValidationPlanSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineFormatRegistryValidationPlanInput {
  extractionPlan: ShowdownEngineArchiveExtractionPlan
  loaderProof?: ShowdownEngineFormatRegistryLoaderProof
  scenario?: 'normal' | 'failed' | 'cancelled'
  planId?: string
}

const determineStatus = (
  extractionPlan: ShowdownEngineArchiveExtractionPlan,
  loaderProof: ShowdownEngineFormatRegistryLoaderProof,
  scenario: ShowdownEngineFormatRegistryValidationPlanInput['scenario'] = 'normal',
): ShowdownEngineFormatRegistryValidationPlanStatus => {
  if (scenario === 'failed') {
    return 'failed-preserves-active'
  }

  if (scenario === 'cancelled') {
    return 'cancelled-preserves-active'
  }

  if (extractionPlan.status !== 'ready-for-future-staging') {
    return 'blocked-by-extraction-plan'
  }

  if (
    loaderProof.status !== 'available' ||
    loaderProof.requiredSourceFile.status !== 'valid' ||
    loaderProof.registry.status !== 'available'
  ) {
    return 'blocked-by-registry-source-file'
  }

  return 'ready-for-future-validation'
}

const createMessage = (status: ShowdownEngineFormatRegistryValidationPlanStatus): string => {
  if (status === 'ready-for-future-validation') {
    return 'Format registry validation handoff is ready for a future approved staged Engine validation lane.'
  }

  if (status === 'blocked-by-extraction-plan') {
    return 'Format registry validation is blocked until extraction/staging prerequisites are ready.'
  }

  if (status === 'blocked-by-registry-source-file') {
    return 'Format registry validation is blocked until the official registry source file and registry metadata are available.'
  }

  if (status === 'cancelled-preserves-active') {
    return 'Cancelled format registry validation planning preserves the previous active Engine revision.'
  }

  return 'Failed format registry validation planning rejects staged metadata and preserves the previous active Engine revision.'
}

const createPromotionGate = (
  status: ShowdownEngineFormatRegistryValidationPlanStatus,
  extractionPlan: ShowdownEngineArchiveExtractionPlan,
): ShowdownEngineFormatRegistryValidationPlanPromotionGate => {
  if (status === 'ready-for-future-validation') {
    return {
      decision: 'validation-ready',
      promotionBlocked: false,
      reason: 'Future activation may proceed only after real staged registry validation is approved.',
      previousActiveRevisionId: extractionPlan.decision.previousActiveRevisionId,
      stagedRevisionId: extractionPlan.decision.stagedRevisionId,
      previousActivePreserved: true,
    }
  }

  if (status === 'cancelled-preserves-active') {
    return {
      decision: 'cancelled',
      promotionBlocked: true,
      reason: 'Cancellation keeps the previous active Engine revision in place.',
      previousActiveRevisionId: extractionPlan.decision.previousActiveRevisionId,
      stagedRevisionId: null,
      previousActivePreserved: true,
    }
  }

  if (status === 'failed-preserves-active') {
    return {
      decision: 'reject',
      promotionBlocked: true,
      reason: 'Failed registry validation handoff rejects staged metadata and keeps the previous active Engine revision.',
      previousActiveRevisionId: extractionPlan.decision.previousActiveRevisionId,
      stagedRevisionId: null,
      previousActivePreserved: true,
    }
  }

  return {
    decision: 'blocked',
    promotionBlocked: true,
    reason: 'Registry validation handoff is blocked by unmet extraction or registry source prerequisites.',
    previousActiveRevisionId: extractionPlan.decision.previousActiveRevisionId,
    stagedRevisionId: null,
    previousActivePreserved: true,
  }
}

export function createShowdownEngineFormatRegistryValidationPlan(
  input: ShowdownEngineFormatRegistryValidationPlanInput,
): ShowdownEngineFormatRegistryValidationPlan {
  const loaderProof = input.loaderProof ?? sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable
  const scenario = input.scenario ?? 'normal'
  const status = determineStatus(input.extractionPlan, loaderProof, scenario)

  return {
    planId: input.planId ?? `${input.extractionPlan.planId}-format-registry-validation-plan`,
    status,
    message: createMessage(status),
    extractionPlanId: input.extractionPlan.planId,
    extractionPlanStatus: input.extractionPlan.status,
    registrySourceFile: {
      relativePath: loaderProof.requiredSourceFile.relativePath,
      purpose: loaderProof.requiredSourceFile.purpose,
      required: loaderProof.requiredSourceFile.required,
      readinessStatus: loaderProof.requiredSourceFile.status,
      metadataOnly: loaderProof.requiredSourceFile.metadataOnly,
    },
    expectedRegistry: {
      readinessStatus: loaderProof.registry.status,
      expectedOfficialFormatCount: loaderProof.registry.officialFormatCount,
      expectedBattleLabCustomFormatCount: loaderProof.registry.battleLabCustomFormatCount,
      officialFormatsDiscoverable: loaderProof.registry.status === 'available' && loaderProof.registry.officialFormatCount > 0,
      metadataOnly: true,
    },
    customOverlay: {
      overlayFolderKey: loaderProof.customOverlay.overlayFolderKey,
      mergeStrategy: loaderProof.customOverlay.mergeStrategy,
      modifiesUpstreamSourceInPlace: loaderProof.customOverlay.modifiesUpstreamSourceInPlace,
      readinessStatus: loaderProof.customOverlay.status,
    },
    promotionGate: createPromotionGate(status, input.extractionPlan),
    safety: {
      noImportTimeDownload: input.extractionPlan.safety.noImportTimeDownload,
      noAppLoadDownload: input.extractionPlan.safety.noAppLoadDownload,
      noPanelOpenDownload: input.extractionPlan.safety.noPanelOpenDownload,
      noArchiveInspection: input.extractionPlan.safety.noArchiveInspection,
      noArchiveExtraction: input.extractionPlan.safety.noArchiveExtraction,
      noFileIo: input.extractionPlan.safety.noFileIo,
      noFileReads: loaderProof.safety.noFileReads,
      noDynamicImports: input.extractionPlan.safety.noDynamicImports,
      noLoaderExecution: input.extractionPlan.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: input.extractionPlan.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: input.extractionPlan.safety.noSimulationExecution,
      customFormatsOverlayOnly: input.extractionPlan.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: input.extractionPlan.safety.pokemonShowdownAuthority,
      catalogRole: input.extractionPlan.safety.catalogRole,
    },
    boundaryNotes: [
      ...input.extractionPlan.boundaryNotes,
      'Format registry validation plan is metadata-only and does not read extracted files, dynamically import Pokemon Showdown source, execute loaders, or run simulation.',
      'BattleLab custom formats remain overlays and must not modify upstream Pokemon Showdown source in place.',
    ],
  }
}
