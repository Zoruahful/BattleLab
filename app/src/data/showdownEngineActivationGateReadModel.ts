import type { ShowdownEngineActivationGate } from './showdownEngineActivationGate'
import { createShowdownEngineActivationGate } from './showdownEngineActivationGate'
import { createShowdownEngineArchiveContentsManifest } from './showdownEngineArchiveContentsManifest'
import { createShowdownEngineArchiveExtractionPlan } from './showdownEngineArchiveExtractionPlan'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'
import { createShowdownEngineFormatRegistryValidationPlan } from './showdownEngineFormatRegistryValidationPlan'
import { sampleShowdownEngineFormatRegistryLoaderProofs } from './showdownEngineFormatRegistryLoaderProof'
import { createShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'

export type ShowdownEngineActivationGateReadModelPhase =
  | 'checking-activation-gate'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineActivationGateReadModelStatus = ShowdownEngineActivationGate['status']

export interface ShowdownEngineActivationGatePrerequisiteRow {
  key: ShowdownEngineActivationGate['prerequisites'][number]['key']
  label: string
  status: ShowdownEngineActivationGate['prerequisites'][number]['status']
  message: string
  metadataOnly: true
}

export interface ShowdownEngineActivationGateRevisionSummary {
  revisionId: string
  role: 'active' | 'staged' | 'resulting-active'
  available: boolean
}

export interface ShowdownEngineActivationGatePromotionSummary {
  decision: ShowdownEngineActivationGate['promotion']['decision']
  promotionBlocked: boolean
  previousActivePreserved: true
  reason: string
}

export interface ShowdownEngineActivationGateReadModelSafety {
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

export interface ShowdownEngineActivationGateReadModel {
  readModelId: string
  phase: ShowdownEngineActivationGateReadModelPhase
  status: ShowdownEngineActivationGateReadModelStatus
  message: string
  prerequisiteRows: ShowdownEngineActivationGatePrerequisiteRow[]
  activeRevision: ShowdownEngineActivationGateRevisionSummary
  stagedRevision: ShowdownEngineActivationGateRevisionSummary
  resultingActiveRevision: ShowdownEngineActivationGateRevisionSummary
  promotion: ShowdownEngineActivationGatePromotionSummary
  safety: ShowdownEngineActivationGateReadModelSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineActivationGateReadModelInput {
  activationGate: ShowdownEngineActivationGate
  readModelId?: string
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'
const requiredFiles = ['package.json', 'sim/dex.ts', 'sim/team-validator.ts', 'config/formats.ts']

const prerequisiteLabels: Record<ShowdownEngineActivationGate['prerequisites'][number]['key'], string> = {
  'immutable-source-policy': 'Immutable Source Policy',
  'archive-contents-manifest': 'Archive Contents Manifest',
  'extraction-staging': 'Extraction / Staging',
  'required-files': 'Required Files',
  'format-registry-validation': 'Format Registry Validation',
  'custom-format-overlay': 'Custom Format Overlay',
}

const getPhase = (status: ShowdownEngineActivationGateReadModelStatus): ShowdownEngineActivationGateReadModelPhase => {
  if (status === 'activation-ready') return 'ready'
  if (status === 'failed-preserves-active') return 'failed'
  if (status === 'cancelled-preserves-active') return 'cancelled'
  if (status === 'blocked') return 'blocked'

  return 'checking-activation-gate'
}

const createPrerequisiteRows = (
  gate: ShowdownEngineActivationGate,
): ShowdownEngineActivationGatePrerequisiteRow[] =>
  gate.prerequisites.map((prerequisite) => ({
    key: prerequisite.key,
    label: prerequisiteLabels[prerequisite.key],
    status: prerequisite.status,
    message: prerequisite.message,
    metadataOnly: prerequisite.metadataOnly,
  }))

const createRevisionSummary = (
  revisionId: string | null,
  role: ShowdownEngineActivationGateRevisionSummary['role'],
): ShowdownEngineActivationGateRevisionSummary => ({
  revisionId: revisionId ?? 'not-available',
  role,
  available: Boolean(revisionId),
})

export function createShowdownEngineActivationGateReadModel(
  input: ShowdownEngineActivationGateReadModelInput,
): ShowdownEngineActivationGateReadModel {
  const gate = input.activationGate

  return {
    readModelId: input.readModelId ?? `${gate.gateId}-read-model`,
    phase: getPhase(gate.status),
    status: gate.status,
    message: gate.message,
    prerequisiteRows: createPrerequisiteRows(gate),
    activeRevision: createRevisionSummary(gate.promotion.previousActiveRevisionId, 'active'),
    stagedRevision: createRevisionSummary(gate.promotion.stagedRevisionId, 'staged'),
    resultingActiveRevision: createRevisionSummary(gate.promotion.resultingActiveRevisionId, 'resulting-active'),
    promotion: {
      decision: gate.promotion.decision,
      promotionBlocked: gate.promotion.promotionBlocked,
      previousActivePreserved: gate.promotion.previousActivePreserved,
      reason: gate.promotion.reason,
    },
    safety: {
      noImportTimeDownload: gate.safety.noImportTimeDownload,
      noAppLoadDownload: gate.safety.noAppLoadDownload,
      noPanelOpenDownload: gate.safety.noPanelOpenDownload,
      noArchiveInspection: gate.safety.noArchiveInspection,
      noArchiveExtraction: gate.safety.noArchiveExtraction,
      noFileIo: gate.safety.noFileIo,
      noFileReads: gate.safety.noFileReads,
      noDynamicImports: gate.safety.noDynamicImports,
      noLoaderExecution: gate.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: gate.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: gate.safety.noSimulationExecution,
      customFormatsOverlayOnly: gate.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: gate.safety.pokemonShowdownAuthority,
      catalogRole: gate.safety.catalogRole,
    },
    boundaryNotes: [
      ...gate.boundaryNotes,
      'Activation gate read-model is UI-safe metadata only and does not trigger Catalog Update execution.',
    ],
  }
}

export async function createShowdownEngineActivationGateReadModelSamples() {
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const branchPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    revisionPolicyId: 'activation-read-model-branch-preview',
  })
  const pinnedPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    immutableRevision,
    approvedImmutableSha256: approvedSha,
    approvedAt: '2026-06-15T00:00:00.000Z',
    revisionPolicyId: 'activation-read-model-pinned-approved',
  })
  const blockedExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: branchPolicy,
      manifestId: 'activation-read-model-blocked-source-manifest',
    }),
    planId: 'activation-read-model-blocked-extraction-plan',
  })
  const readyExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedPolicy,
      fileStatuses: Object.fromEntries(requiredFiles.map((file) => [file, 'present'])),
      manifestId: 'activation-read-model-ready-manifest',
    }),
    planId: 'activation-read-model-ready-extraction-plan',
  })
  const blockedRegistryPlan = createShowdownEngineFormatRegistryValidationPlan({
    extractionPlan: blockedExtractionPlan,
    loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
    planId: 'activation-read-model-blocked-registry-plan',
  })
  const readyRegistryPlan = createShowdownEngineFormatRegistryValidationPlan({
    extractionPlan: readyExtractionPlan,
    loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
    planId: 'activation-read-model-ready-registry-plan',
  })

  return {
    blocked: createShowdownEngineActivationGateReadModel({
      activationGate: createShowdownEngineActivationGate({
        registryValidationPlan: blockedRegistryPlan,
        gateId: 'activation-read-model-gate-blocked',
      }),
    }),
    ready: createShowdownEngineActivationGateReadModel({
      activationGate: createShowdownEngineActivationGate({
        registryValidationPlan: readyRegistryPlan,
        gateId: 'activation-read-model-gate-ready',
      }),
    }),
    failed: createShowdownEngineActivationGateReadModel({
      activationGate: createShowdownEngineActivationGate({
        registryValidationPlan: readyRegistryPlan,
        scenario: 'failed',
        gateId: 'activation-read-model-gate-failed',
      }),
    }),
    cancelled: createShowdownEngineActivationGateReadModel({
      activationGate: createShowdownEngineActivationGate({
        registryValidationPlan: readyRegistryPlan,
        scenario: 'cancelled',
        gateId: 'activation-read-model-gate-cancelled',
      }),
    }),
  }
}
