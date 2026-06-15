import {
  createShowdownEngineCatalogUpdateAggregateReadModelSamples,
  type ShowdownEngineCatalogUpdateAggregateReadModel,
} from './showdownEngineCatalogUpdateAggregateReadModel'
import {
  runShowdownEngineInstalledFormatRegistryProof,
  type ShowdownEngineInstalledFormatRegistryFormatSummary,
  type ShowdownEngineInstalledFormatRegistryProof,
  type ShowdownEngineInstalledFormatRegistryProofOptions,
  type ShowdownEngineInstalledFormatRegistryProofStatus,
} from './showdownEngineInstalledFormatRegistryProof'

export type ShowdownEngineInstalledFormatRegistryBridgeStatus =
  | 'installed-registry-available'
  | 'installed-registry-unavailable'

export interface ShowdownEngineInstalledFormatRegistryBridgePackageSummary {
  packageName: 'pokemon-showdown'
  status: ShowdownEngineInstalledFormatRegistryProofStatus
  importStrategy: 'explicit-async-installed-package-import'
  errorMessage: string | null
}

export interface ShowdownEngineInstalledFormatRegistryBridgeAggregateHandoff {
  aggregateReadModelId: string
  aggregateStatus: ShowdownEngineCatalogUpdateAggregateReadModel['status']
  activationGateStatus: ShowdownEngineCatalogUpdateAggregateReadModel['activationGateStatus']
  previousActivePreserved: true
  metadataOnly: true
}

export interface ShowdownEngineInstalledFormatRegistryBridgeSafety {
  explicitAsyncOnly: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noArchiveDownload: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImportFromDownloadedCode: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  installedPackageMetadataReadOnly: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineInstalledFormatRegistryBridge {
  bridgeId: string
  status: ShowdownEngineInstalledFormatRegistryBridgeStatus
  message: string
  checkedAt: string
  packageSummary: ShowdownEngineInstalledFormatRegistryBridgePackageSummary
  officialFormatCount: number
  sampleOfficialFormats: ShowdownEngineInstalledFormatRegistryFormatSummary[]
  customOverlay: ShowdownEngineInstalledFormatRegistryProof['customOverlay']
  aggregateHandoff: ShowdownEngineInstalledFormatRegistryBridgeAggregateHandoff
  runtimeUnavailableFallback: {
    available: true
    status: 'runtime-unavailable-fallback'
    message: string
  }
  safety: ShowdownEngineInstalledFormatRegistryBridgeSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineInstalledFormatRegistryBridgeOptions extends ShowdownEngineInstalledFormatRegistryProofOptions {
  bridgeId?: string
}

const createStatus = (
  proof: ShowdownEngineInstalledFormatRegistryProof,
): ShowdownEngineInstalledFormatRegistryBridgeStatus =>
  proof.status === 'available' ? 'installed-registry-available' : 'installed-registry-unavailable'

const createMessage = (status: ShowdownEngineInstalledFormatRegistryBridgeStatus): string => {
  if (status === 'installed-registry-available') {
    return 'Installed Pokemon Showdown format registry metadata is available for future Engine status surfaces.'
  }

  return 'Installed Pokemon Showdown format registry metadata is unavailable; future UI should show runtime-unavailable fallback.'
}

const createAggregateHandoff = (
  proof: ShowdownEngineInstalledFormatRegistryProof,
  aggregate: ShowdownEngineCatalogUpdateAggregateReadModel,
): ShowdownEngineInstalledFormatRegistryBridgeAggregateHandoff => ({
  aggregateReadModelId: aggregate.readModelId,
  aggregateStatus: proof.status === 'available' ? aggregate.status : 'blocked-preview',
  activationGateStatus: proof.status === 'available' ? aggregate.activationGateStatus : 'blocked',
  previousActivePreserved: aggregate.revision.previousActivePreserved,
  metadataOnly: true,
})

export async function createShowdownEngineInstalledFormatRegistryBridge(
  options: ShowdownEngineInstalledFormatRegistryBridgeOptions = {},
): Promise<ShowdownEngineInstalledFormatRegistryBridge> {
  const proof = await runShowdownEngineInstalledFormatRegistryProof(options)
  const aggregateSamples = await createShowdownEngineCatalogUpdateAggregateReadModelSamples()
  const aggregate = proof.status === 'available' ? aggregateSamples.ready : aggregateSamples.blocked
  const status = createStatus(proof)

  return {
    bridgeId: options.bridgeId ?? `${proof.proofId}-bridge`,
    status,
    message: createMessage(status),
    checkedAt: proof.checkedAt,
    packageSummary: {
      packageName: proof.packageStatus.packageName,
      status: proof.packageStatus.status,
      importStrategy: proof.packageStatus.importStrategy,
      errorMessage: proof.packageStatus.errorMessage,
    },
    officialFormatCount: proof.officialFormatCount,
    sampleOfficialFormats: proof.sampleOfficialFormats,
    customOverlay: proof.customOverlay,
    aggregateHandoff: createAggregateHandoff(proof, aggregate),
    runtimeUnavailableFallback: {
      available: true,
      status: 'runtime-unavailable-fallback',
      message: 'If the installed Pokemon Showdown package is unavailable, BattleLab must show unavailable status and avoid claiming legality readiness.',
    },
    safety: {
      explicitAsyncOnly: true,
      noImportTimeExecution: proof.safety.noImportTimeExecution,
      noAppLoadExecution: proof.safety.noAppLoadExecution,
      noPanelOpenExecution: proof.safety.noPanelOpenExecution,
      noArchiveDownload: proof.safety.noArchiveDownload,
      noArchiveExtraction: proof.safety.noArchiveExtraction,
      noFileIo: proof.safety.noFileIo,
      noDynamicImportFromDownloadedCode: proof.safety.noDynamicImportFromDownloadedCode,
      noCatalogUpdatePanelWiring: proof.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: proof.safety.noSimulationExecution,
      installedPackageMetadataReadOnly: proof.safety.installedPackageMetadataReadOnly,
      customFormatsOverlayOnly: proof.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: proof.safety.pokemonShowdownAuthority,
      catalogRole: proof.safety.catalogRole,
    },
    boundaryNotes: [
      ...proof.boundaryNotes,
      'Installed format registry bridge is explicit async and does not run on module import.',
      'Bridge output is UI-unwired metadata for future Engine/Catalog Update status surfaces.',
    ],
  }
}
