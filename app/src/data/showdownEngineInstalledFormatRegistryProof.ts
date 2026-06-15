import {
  battleLabCustomFormatPlaceholders,
  createShowdownEngineFormatRegistryReadModel,
  type ShowdownEngineFormatAvailability,
  type ShowdownEngineFormatRegistryReadModel,
} from './showdownEngineUpdateService'
import { showdownEngineCustomFormatOverlayPolicy } from './showdownEngineUpdateArchitecture'

export type ShowdownEngineInstalledFormatRegistryProofStatus = 'available' | 'unavailable'

export interface ShowdownEngineInstalledFormatRegistryProofOptions {
  proofId?: string
  checkedAt?: string
  loadRegistry?: (checkedAt: string) => Promise<ShowdownEngineFormatRegistryReadModel>
}

export interface ShowdownEngineInstalledFormatRegistryPackageStatus {
  packageName: 'pokemon-showdown'
  importStrategy: 'explicit-async-installed-package-import'
  status: ShowdownEngineInstalledFormatRegistryProofStatus
  errorMessage: string | null
}

export interface ShowdownEngineInstalledFormatRegistryFormatSummary {
  formatId: string
  displayName: string
  source: 'official-pokemon-showdown'
  gameType?: string
  generation?: number
  section?: string
}

export interface ShowdownEngineInstalledFormatRegistryOverlayReadiness {
  overlayFolderKey: typeof showdownEngineCustomFormatOverlayPolicy.overlayFolderKey
  mergeStrategy: typeof showdownEngineCustomFormatOverlayPolicy.mergeStrategy
  modifiesUpstreamSourceInPlace: false
  status: 'supported'
  placeholderFormatCount: number
  message: string
}

export interface ShowdownEngineInstalledFormatRegistryProofSafety {
  explicitCallOnly: true
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

export interface ShowdownEngineInstalledFormatRegistryProof {
  proofId: string
  status: ShowdownEngineInstalledFormatRegistryProofStatus
  checkedAt: string
  packageStatus: ShowdownEngineInstalledFormatRegistryPackageStatus
  officialFormatCount: number
  sampleOfficialFormats: ShowdownEngineInstalledFormatRegistryFormatSummary[]
  registry: ShowdownEngineFormatRegistryReadModel
  customOverlay: ShowdownEngineInstalledFormatRegistryOverlayReadiness
  safety: ShowdownEngineInstalledFormatRegistryProofSafety
  boundaryNotes: string[]
}

const sampleOfficialFormatLimit = 8

const createUnavailableRegistry = (checkedAt: string, message: string): ShowdownEngineFormatRegistryReadModel => ({
  status: 'unavailable',
  officialFormatCount: 0,
  battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
  formats: [...battleLabCustomFormatPlaceholders],
  checkedAt,
  message,
})

const summarizeOfficialFormats = (
  formats: ShowdownEngineFormatAvailability[],
): ShowdownEngineInstalledFormatRegistryFormatSummary[] =>
  formats
    .filter((format): format is ShowdownEngineFormatAvailability & { source: 'official-pokemon-showdown' } =>
      format.source === 'official-pokemon-showdown' && format.available,
    )
    .slice(0, sampleOfficialFormatLimit)
    .map((format) => ({
      formatId: format.formatId,
      displayName: format.displayName,
      source: format.source,
      ...(format.gameType ? { gameType: format.gameType } : {}),
      ...(format.generation ? { generation: format.generation } : {}),
      ...(format.section ? { section: format.section } : {}),
    }))

const createOverlayReadiness = (): ShowdownEngineInstalledFormatRegistryOverlayReadiness => ({
  overlayFolderKey: showdownEngineCustomFormatOverlayPolicy.overlayFolderKey,
  mergeStrategy: showdownEngineCustomFormatOverlayPolicy.mergeStrategy,
  modifiesUpstreamSourceInPlace: showdownEngineCustomFormatOverlayPolicy.modifyUpstreamSourceInPlace,
  status: 'supported',
  placeholderFormatCount: battleLabCustomFormatPlaceholders.length,
  message: showdownEngineCustomFormatOverlayPolicy.note,
})

const createSafety = (): ShowdownEngineInstalledFormatRegistryProofSafety => ({
  explicitCallOnly: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noArchiveDownload: true,
  noArchiveExtraction: true,
  noFileIo: true,
  noDynamicImportFromDownloadedCode: true,
  noCatalogUpdatePanelWiring: true,
  noSimulationExecution: true,
  installedPackageMetadataReadOnly: true,
  customFormatsOverlayOnly: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

export async function runShowdownEngineInstalledFormatRegistryProof(
  options: ShowdownEngineInstalledFormatRegistryProofOptions = {},
): Promise<ShowdownEngineInstalledFormatRegistryProof> {
  const checkedAt = options.checkedAt ?? new Date().toISOString()
  const loadRegistry = options.loadRegistry ?? createShowdownEngineFormatRegistryReadModel

  try {
    const registry = await loadRegistry(checkedAt)
    const available = registry.status === 'available' && registry.officialFormatCount > 0

    return {
      proofId: options.proofId ?? 'showdown-engine-installed-format-registry-proof',
      status: available ? 'available' : 'unavailable',
      checkedAt,
      packageStatus: {
        packageName: 'pokemon-showdown',
        importStrategy: 'explicit-async-installed-package-import',
        status: available ? 'available' : 'unavailable',
        errorMessage: available ? null : registry.message,
      },
      officialFormatCount: registry.officialFormatCount,
      sampleOfficialFormats: summarizeOfficialFormats(registry.formats),
      registry,
      customOverlay: createOverlayReadiness(),
      safety: createSafety(),
      boundaryNotes: [
        'Installed format registry proof runs only through explicit async helper calls.',
        'The proof reads installed Pokemon Showdown format metadata and does not download or extract Engine archives.',
        'No downloaded code is dynamically imported, no files are written, and no simulation is executed.',
        'Pokemon Showdown remains the legality and simulation source of truth.',
        'PokeAPI/catalog data remains enrichment-only.',
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown installed Pokemon Showdown format registry failure.'
    const registry = createUnavailableRegistry(checkedAt, message)

    return {
      proofId: options.proofId ?? 'showdown-engine-installed-format-registry-proof-unavailable',
      status: 'unavailable',
      checkedAt,
      packageStatus: {
        packageName: 'pokemon-showdown',
        importStrategy: 'explicit-async-installed-package-import',
        status: 'unavailable',
        errorMessage: message,
      },
      officialFormatCount: 0,
      sampleOfficialFormats: [],
      registry,
      customOverlay: createOverlayReadiness(),
      safety: createSafety(),
      boundaryNotes: [
        'Installed format registry proof fallback is explicit-call only and does not run on import, app load, or panel open.',
        'Unavailable installed package status does not change Engine activation state or run simulation.',
        'BattleLab custom formats remain overlays and do not mutate upstream Pokemon Showdown source.',
      ],
    }
  }
}
