import type {
  ShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'
import {
  createFailedShowdownEngineArchiveExecutionPlan,
  sampleShowdownEngineArchiveExecutionPlan,
} from './showdownEngineArchiveExecutionPlan'
import type {
  ShowdownEngineFormatRegistryReadModel,
  ShowdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'
import {
  sampleShowdownEngineFormatRegistry,
  showdownEngineUpdateSafetyPolicy,
} from './showdownEngineUpdateService'
import type {
  ShowdownEngineRequiredFileCheck,
  ShowdownEngineRevisionMetadata,
} from './showdownEngineUpdateArchitecture'
import {
  showdownEngineCustomFormatOverlayPolicy,
  showdownEngineRequiredFileChecks,
} from './showdownEngineUpdateArchitecture'
import type {
  ShowdownEngineStorageAdapterContract,
} from './showdownEngineStorageAdapter'
import {
  createShowdownEngineStorageRevisionMetadata,
  sampleShowdownEngineStorageAdapterContract,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineFormatRegistryLoaderProofSource =
  | 'active-revision'
  | 'staged-revision'
  | 'fallback-current'
  | 'blocked-staged-revision'

export type ShowdownEngineFormatRegistryLoaderProofStatus =
  | 'available'
  | 'blocked'
  | 'unavailable'

export interface ShowdownEngineFormatRegistrySourceFileReadiness {
  relativePath: string
  purpose: 'formats-registry'
  required: true
  status: ShowdownEngineRequiredFileCheck['status']
  metadataOnly: true
  message: string
}

export interface ShowdownEngineFormatRegistryOverlayReadiness {
  overlayFolderKey: typeof showdownEngineCustomFormatOverlayPolicy.overlayFolderKey
  mergeStrategy: typeof showdownEngineCustomFormatOverlayPolicy.mergeStrategy
  modifiesUpstreamSourceInPlace: false
  status: 'supported'
  message: string
}

export interface ShowdownEngineFormatRegistryLoaderProofSafety {
  explicitUserActionRequired: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noFileReads: true
  noDynamicImports: true
  noArchiveExtraction: true
  noLoaderExecution: true
  noSimulationExecution: true
  pokemonShowdownAuthority: ShowdownEngineUpdateSafetyPolicy['pokemonShowdownAuthority']
  catalogRole: ShowdownEngineUpdateSafetyPolicy['catalogRole']
}

export interface ShowdownEngineFormatRegistryLoaderProof {
  proofId: string
  status: ShowdownEngineFormatRegistryLoaderProofStatus
  source: ShowdownEngineFormatRegistryLoaderProofSource
  sourceRevisionId: string | null
  sourceRevisionStatus: ShowdownEngineRevisionMetadata['status'] | 'fallback'
  registry: ShowdownEngineFormatRegistryReadModel
  requiredSourceFile: ShowdownEngineFormatRegistrySourceFileReadiness
  customOverlay: ShowdownEngineFormatRegistryOverlayReadiness
  storageContract: Pick<ShowdownEngineStorageAdapterContract, 'trigger' | 'root' | 'safety'>
  archivePlanId: string
  stagedRevisionBecomesActive: boolean
  previousActivePreserved: boolean
  safety: ShowdownEngineFormatRegistryLoaderProofSafety
  boundaryNotes: string[]
}

const createUnavailableRegistry = (): ShowdownEngineFormatRegistryReadModel => ({
  status: 'unavailable',
  officialFormatCount: 0,
  battleLabCustomFormatCount: 0,
  formats: [],
  checkedAt: '2026-06-15T00:00:00.000Z',
  message: 'Format registry is unavailable in this no-IO fallback fixture.',
})

const createRequiredFormatRegistryFile = (
  status: ShowdownEngineRequiredFileCheck['status'] = 'valid',
): ShowdownEngineFormatRegistrySourceFileReadiness => {
  const sourceFile = showdownEngineRequiredFileChecks.find((file) => file.purpose === 'formats-registry')

  return {
    relativePath: sourceFile?.relativePath ?? 'config/formats.ts',
    purpose: 'formats-registry',
    required: true,
    status,
    metadataOnly: true,
    message:
      status === 'valid'
        ? 'Format registry source file is represented as metadata and ready for future loader validation.'
        : 'Format registry source file is unavailable, so no registry data can be trusted.',
  }
}

const createOverlayReadiness = (): ShowdownEngineFormatRegistryOverlayReadiness => ({
  overlayFolderKey: showdownEngineCustomFormatOverlayPolicy.overlayFolderKey,
  mergeStrategy: showdownEngineCustomFormatOverlayPolicy.mergeStrategy,
  modifiesUpstreamSourceInPlace: false,
  status: 'supported',
  message: showdownEngineCustomFormatOverlayPolicy.note,
})

const createSafety = (): ShowdownEngineFormatRegistryLoaderProofSafety => ({
  explicitUserActionRequired: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noFileReads: true,
  noDynamicImports: true,
  noArchiveExtraction: true,
  noLoaderExecution: true,
  noSimulationExecution: true,
  pokemonShowdownAuthority: showdownEngineUpdateSafetyPolicy.pokemonShowdownAuthority,
  catalogRole: showdownEngineUpdateSafetyPolicy.catalogRole,
})

const createProof = (
  source: ShowdownEngineFormatRegistryLoaderProofSource,
  revision: ShowdownEngineRevisionMetadata | null,
  plan: ShowdownEngineArchiveExecutionPlan,
  overrides: Partial<ShowdownEngineFormatRegistryLoaderProof> = {},
): ShowdownEngineFormatRegistryLoaderProof => ({
  proofId: `showdown-engine-format-registry-loader-${source}`,
  status: revision?.formatRegistry.status === 'available' ? 'available' : 'unavailable',
  source,
  sourceRevisionId: revision?.revisionId ?? null,
  sourceRevisionStatus: revision?.status ?? 'fallback',
  registry: revision?.formatRegistry ?? createUnavailableRegistry(),
  requiredSourceFile: createRequiredFormatRegistryFile(revision ? 'valid' : 'not-checked'),
  customOverlay: createOverlayReadiness(),
  storageContract: {
    trigger: sampleShowdownEngineStorageAdapterContract.trigger,
    root: sampleShowdownEngineStorageAdapterContract.root,
    safety: sampleShowdownEngineStorageAdapterContract.safety,
  },
  archivePlanId: plan.planId,
  stagedRevisionBecomesActive: revision?.status === 'staged' && plan.decision.outcome === 'ready-to-promote',
  previousActivePreserved: true,
  safety: createSafety(),
  boundaryNotes: [
    'Format registry loader proof is metadata-only and performs no file reads.',
    'Future implementation must run only after Catalog Update -> Update.',
    'BattleLab custom formats are overlaid beside upstream Pokemon Showdown data and do not modify upstream source in place.',
  ],
  ...overrides,
})

const activeRevision = createShowdownEngineStorageRevisionMetadata('active')
const stagedRevision = sampleShowdownEngineArchiveExecutionPlan.candidateRevision
const failedPlan = createFailedShowdownEngineArchiveExecutionPlan()

export const sampleShowdownEngineFormatRegistryLoaderProofs = {
  activeAvailable: createProof('active-revision', activeRevision, sampleShowdownEngineArchiveExecutionPlan, {
    proofId: 'showdown-engine-format-registry-loader-active-available',
    stagedRevisionBecomesActive: false,
    previousActivePreserved: true,
  }),
  stagedAvailable: createProof('staged-revision', stagedRevision, sampleShowdownEngineArchiveExecutionPlan, {
    proofId: 'showdown-engine-format-registry-loader-staged-available',
    stagedRevisionBecomesActive: true,
  }),
  failedStagedBlocked: createProof('blocked-staged-revision', failedPlan.candidateRevision, failedPlan, {
    proofId: 'showdown-engine-format-registry-loader-failed-staged-blocked',
    status: 'blocked',
    stagedRevisionBecomesActive: false,
    previousActivePreserved: true,
    boundaryNotes: [
      ...failedPlan.boundaryNotes,
      'Rejected staged revisions must not become the active format registry source.',
    ],
  }),
  unavailableFallback: createProof('fallback-current', null, sampleShowdownEngineArchiveExecutionPlan, {
    proofId: 'showdown-engine-format-registry-loader-unavailable-fallback',
    status: 'unavailable',
    registry: createUnavailableRegistry(),
    requiredSourceFile: createRequiredFormatRegistryFile('not-checked'),
    stagedRevisionBecomesActive: false,
    previousActivePreserved: true,
    boundaryNotes: [
      'Unavailable registry fallback is metadata-only and must not attempt file reads or dynamic imports.',
      'Previous active Engine metadata remains the only trusted source until a registry validates.',
    ],
  }),
}

export function createShowdownEngineFormatRegistryLoaderProofs() {
  return sampleShowdownEngineFormatRegistryLoaderProofs
}

export const sampleShowdownEngineFormatRegistryLoaderReadiness = {
  officialFormatCount: sampleShowdownEngineFormatRegistry.officialFormatCount,
  customFormatOverlayStatus: 'supported' as const,
  requiredSourceFilePath: createRequiredFormatRegistryFile().relativePath,
  metadataOnly: true,
}
