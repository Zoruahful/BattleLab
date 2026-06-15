import type {
  ShowdownEngineActivationGateReadModel,
} from './showdownEngineActivationGateReadModel'
import { sampleShowdownEngineArchiveDownloadReadModels } from './showdownEngineArchiveDownloadReadModel'
import { createFailedShowdownEngineArchiveMetadataReadModel } from './showdownEngineArchiveMetadataReadModel'
import type { ShowdownEngineArchiveBodyDownloadReadModelStatus } from './showdownEngineArchiveBodyDownloadReadModel'
import type { ShowdownEngineUpdateReadModel } from './showdownEngineUpdateService'
import { sampleShowdownEngineUpdateReadModels } from './showdownEngineUpdateService'

export type ShowdownEngineCatalogUpdateAggregateStatus =
  | 'ready-preview'
  | 'blocked-preview'
  | 'failed-preserves-active'
  | 'cancelled-preserves-active'

export interface ShowdownEngineCatalogUpdateAggregateSection {
  key:
    | 'engine-update'
    | 'archive-metadata'
    | 'archive-download-dry-run'
    | 'archive-body-download-proof'
    | 'activation-gate'
    | 'storage-preservation'
  label: string
  status: string
  message: string
  blocksActivation: boolean
  metadataOnly: true
}

export interface ShowdownEngineCatalogUpdateAggregateRevisionSummary {
  previousActiveRevisionId: string
  stagedRevisionId: string | null
  resultingActiveRevisionId: string
  previousActivePreserved: true
}

export interface ShowdownEngineCatalogUpdateAggregateSafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
  noArchiveBodyDownloadTriggered: true
  noMetadataFetchTriggered: true
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

export interface ShowdownEngineCatalogUpdateAggregateReadModel {
  readModelId: string
  status: ShowdownEngineCatalogUpdateAggregateStatus
  message: string
  sections: ShowdownEngineCatalogUpdateAggregateSection[]
  engineUpdateStatus: ShowdownEngineUpdateReadModel['status']
  archiveMetadataStatus: 'not-run-preview' | 'complete' | 'failed'
  archiveDownloadDryRunStatus: string
  archiveBodyDownloadStatus: 'not-run-preview' | ShowdownEngineArchiveBodyDownloadReadModelStatus
  activationGateStatus: ShowdownEngineActivationGateReadModel['status']
  revision: ShowdownEngineCatalogUpdateAggregateRevisionSummary
  safety: ShowdownEngineCatalogUpdateAggregateSafety
  boundaryNotes: string[]
}

const prerequisiteKeys: ShowdownEngineActivationGateReadModel['prerequisiteRows'][number]['key'][] = [
  'immutable-source-policy',
  'archive-contents-manifest',
  'extraction-staging',
  'required-files',
  'format-registry-validation',
  'custom-format-overlay',
]

const prerequisiteLabels: Record<ShowdownEngineActivationGateReadModel['prerequisiteRows'][number]['key'], string> = {
  'immutable-source-policy': 'Immutable Source Policy',
  'archive-contents-manifest': 'Archive Contents Manifest',
  'extraction-staging': 'Extraction / Staging',
  'required-files': 'Required Files',
  'format-registry-validation': 'Format Registry Validation',
  'custom-format-overlay': 'Custom Format Overlay',
}

const createStaticActivationGateReadModel = (
  status: ShowdownEngineActivationGateReadModel['status'],
): ShowdownEngineActivationGateReadModel => {
  const ready = status === 'activation-ready'
  const failed = status === 'failed-preserves-active'
  const cancelled = status === 'cancelled-preserves-active'
  const rowStatus = failed ? 'failed' : cancelled ? 'cancelled' : ready ? 'ready' : 'blocked'
  const previousActiveRevisionId = 'pokemon-showdown-current-valid-preview'
  const stagedRevisionId = ready ? 'pokemon-showdown-master-preview-staged' : null
  const resultingActiveRevisionId = ready ? stagedRevisionId : previousActiveRevisionId

  return {
    readModelId: `static-activation-gate-${status}`,
    phase: ready ? 'ready' : failed ? 'failed' : cancelled ? 'cancelled' : 'blocked',
    status,
    message: ready
      ? 'Pokemon Showdown Engine activation prerequisites are represented for a future approved promotion handoff.'
      : failed
        ? 'Failed activation gate rejects staged metadata and preserves the previous active Engine revision.'
        : cancelled
          ? 'Cancelled activation gate preserves the previous active Engine revision.'
          : 'Pokemon Showdown Engine activation remains blocked until all source, manifest, extraction, and registry prerequisites are ready.',
    prerequisiteRows: prerequisiteKeys.map((key) => ({
      key,
      label: prerequisiteLabels[key],
      status: rowStatus,
      message: `${prerequisiteLabels[key]} is represented by no-execution aggregate preview metadata.`,
      metadataOnly: true,
    })),
    activeRevision: {
      revisionId: previousActiveRevisionId,
      role: 'active',
      available: true,
    },
    stagedRevision: {
      revisionId: stagedRevisionId ?? 'not-available',
      role: 'staged',
      available: Boolean(stagedRevisionId),
    },
    resultingActiveRevision: {
      revisionId: resultingActiveRevisionId ?? previousActiveRevisionId,
      role: 'resulting-active',
      available: true,
    },
    promotion: {
      decision: ready ? 'promote-staged-revision' : failed ? 'reject-staged-revision' : cancelled ? 'cancelled' : 'blocked',
      promotionBlocked: !ready,
      previousActivePreserved: true,
      reason: ready
        ? 'Future activation may promote the staged revision only after real storage promotion is approved.'
        : 'Activation remains blocked or terminal; previous active Engine metadata remains preserved.',
    },
    safety: {
      noImportTimeDownload: true,
      noAppLoadDownload: true,
      noPanelOpenDownload: true,
      noArchiveInspection: true,
      noArchiveExtraction: true,
      noFileIo: true,
      noFileReads: true,
      noDynamicImports: true,
      noLoaderExecution: true,
      noCatalogUpdatePanelWiring: true,
      noSimulationExecution: true,
      customFormatsOverlayOnly: true,
      pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
      catalogRole: 'enrichment-only',
    },
    boundaryNotes: [
      'Static activation gate read-model is UI-safe metadata only and does not trigger Catalog Update execution.',
      'BattleLab custom formats remain overlays and must not modify upstream Pokemon Showdown source in place.',
    ],
  }
}

export interface ShowdownEngineCatalogUpdateAggregateReadModelInput {
  activationGateReadModel: ShowdownEngineActivationGateReadModel
  engineUpdateReadModel?: ShowdownEngineUpdateReadModel
  readModelId?: string
}

const createStatus = (
  activationGate: ShowdownEngineActivationGateReadModel,
): ShowdownEngineCatalogUpdateAggregateStatus => {
  if (activationGate.status === 'activation-ready') return 'ready-preview'
  if (activationGate.status === 'failed-preserves-active') return 'failed-preserves-active'
  if (activationGate.status === 'cancelled-preserves-active') return 'cancelled-preserves-active'

  return 'blocked-preview'
}

const createMessage = (status: ShowdownEngineCatalogUpdateAggregateStatus): string => {
  if (status === 'ready-preview') {
    return 'Engine update, archive handoff, and activation gate are represented for a future approved Catalog Update flow.'
  }

  if (status === 'failed-preserves-active') {
    return 'Engine aggregate preview is failed; previous active Engine metadata remains preserved.'
  }

  if (status === 'cancelled-preserves-active') {
    return 'Engine aggregate preview is cancelled; previous active Engine metadata remains preserved.'
  }

  return 'Engine aggregate preview is blocked until activation prerequisites are ready.'
}

const createSections = (
  activationGate: ShowdownEngineActivationGateReadModel,
  engineUpdate: ShowdownEngineUpdateReadModel,
): ShowdownEngineCatalogUpdateAggregateSection[] => {
  const metadataReadModel = createFailedShowdownEngineArchiveMetadataReadModel()
  const dryRunDownload = sampleShowdownEngineArchiveDownloadReadModels.complete

  return [
    {
      key: 'engine-update',
      label: 'Engine Update',
      status: engineUpdate.status,
      message: engineUpdate.message,
      blocksActivation: engineUpdate.status === 'failed' || engineUpdate.status === 'cancelled',
      metadataOnly: true,
    },
    {
      key: 'archive-metadata',
      label: 'Archive Metadata',
      status: 'not-run-preview',
      message: `Metadata fetch is not triggered by this aggregate. Static failure fixture remains available: ${metadataReadModel.status}.`,
      blocksActivation: false,
      metadataOnly: true,
    },
    {
      key: 'archive-download-dry-run',
      label: 'Archive Download Dry Run',
      status: dryRunDownload.status,
      message: dryRunDownload.message,
      blocksActivation: dryRunDownload.status === 'failed' || dryRunDownload.status === 'cancelled',
      metadataOnly: true,
    },
    {
      key: 'archive-body-download-proof',
      label: 'Archive Body Download Proof',
      status: 'not-run-preview',
      message: 'Archive body download proof is not triggered by this aggregate read-model.',
      blocksActivation: false,
      metadataOnly: true,
    },
    {
      key: 'activation-gate',
      label: 'Activation Gate',
      status: activationGate.status,
      message: activationGate.message,
      blocksActivation: activationGate.status !== 'activation-ready',
      metadataOnly: true,
    },
    {
      key: 'storage-preservation',
      label: 'Storage / Previous Active Preservation',
      status: activationGate.promotion.previousActivePreserved ? 'preserved' : 'not-preserved',
      message: activationGate.promotion.previousActivePreserved
        ? 'Previous active Engine metadata remains preserved until future activation succeeds.'
        : 'Previous active Engine preservation is not represented.',
      blocksActivation: !activationGate.promotion.previousActivePreserved,
      metadataOnly: true,
    },
  ]
}

export function createShowdownEngineCatalogUpdateAggregateReadModel(
  input: ShowdownEngineCatalogUpdateAggregateReadModelInput,
): ShowdownEngineCatalogUpdateAggregateReadModel {
  const engineUpdate = input.engineUpdateReadModel ?? sampleShowdownEngineUpdateReadModels.complete
  const status = createStatus(input.activationGateReadModel)

  return {
    readModelId: input.readModelId ?? `${input.activationGateReadModel.readModelId}-aggregate`,
    status,
    message: createMessage(status),
    sections: createSections(input.activationGateReadModel, engineUpdate),
    engineUpdateStatus: engineUpdate.status,
    archiveMetadataStatus: 'not-run-preview',
    archiveDownloadDryRunStatus: sampleShowdownEngineArchiveDownloadReadModels.complete.status,
    archiveBodyDownloadStatus: 'not-run-preview',
    activationGateStatus: input.activationGateReadModel.status,
    revision: {
      previousActiveRevisionId: input.activationGateReadModel.activeRevision.revisionId,
      stagedRevisionId: input.activationGateReadModel.stagedRevision.available
        ? input.activationGateReadModel.stagedRevision.revisionId
        : null,
      resultingActiveRevisionId: input.activationGateReadModel.resultingActiveRevision.revisionId,
      previousActivePreserved: input.activationGateReadModel.promotion.previousActivePreserved,
    },
    safety: {
      noImportTimeDownload: input.activationGateReadModel.safety.noImportTimeDownload,
      noAppLoadDownload: input.activationGateReadModel.safety.noAppLoadDownload,
      noPanelOpenDownload: input.activationGateReadModel.safety.noPanelOpenDownload,
      noArchiveBodyDownloadTriggered: true,
      noMetadataFetchTriggered: true,
      noArchiveExtraction: input.activationGateReadModel.safety.noArchiveExtraction,
      noFileIo: input.activationGateReadModel.safety.noFileIo,
      noFileReads: input.activationGateReadModel.safety.noFileReads,
      noDynamicImports: input.activationGateReadModel.safety.noDynamicImports,
      noLoaderExecution: input.activationGateReadModel.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: input.activationGateReadModel.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: input.activationGateReadModel.safety.noSimulationExecution,
      customFormatsOverlayOnly: input.activationGateReadModel.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: input.activationGateReadModel.safety.pokemonShowdownAuthority,
      catalogRole: input.activationGateReadModel.safety.catalogRole,
    },
    boundaryNotes: [
      ...input.activationGateReadModel.boundaryNotes,
      'Aggregate read-model is UI-safe metadata only and does not trigger metadata fetch, archive body download, extraction, file IO, loader execution, UI wiring, or simulation.',
    ],
  }
}

export async function createShowdownEngineCatalogUpdateAggregateReadModelSamples() {
  const activationSamples = {
    blocked: createStaticActivationGateReadModel('blocked'),
    ready: createStaticActivationGateReadModel('activation-ready'),
    failed: createStaticActivationGateReadModel('failed-preserves-active'),
    cancelled: createStaticActivationGateReadModel('cancelled-preserves-active'),
  }

  return {
    blocked: createShowdownEngineCatalogUpdateAggregateReadModel({
      activationGateReadModel: activationSamples.blocked,
      readModelId: 'showdown-engine-aggregate-blocked',
    }),
    ready: createShowdownEngineCatalogUpdateAggregateReadModel({
      activationGateReadModel: activationSamples.ready,
      readModelId: 'showdown-engine-aggregate-ready',
    }),
    failed: createShowdownEngineCatalogUpdateAggregateReadModel({
      activationGateReadModel: activationSamples.failed,
      engineUpdateReadModel: sampleShowdownEngineUpdateReadModels.failed,
      readModelId: 'showdown-engine-aggregate-failed',
    }),
    cancelled: createShowdownEngineCatalogUpdateAggregateReadModel({
      activationGateReadModel: activationSamples.cancelled,
      engineUpdateReadModel: sampleShowdownEngineUpdateReadModels.cancelled,
      readModelId: 'showdown-engine-aggregate-cancelled',
    }),
  }
}
