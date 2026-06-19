import type { BattleFormat } from '../types'
import type { ShowdownRuntimeAdapterSafetyPolicy } from '../types/showdownRuntime'
import {
  createShowdownEngineInstalledFormatRegistryBridge,
  type ShowdownEngineInstalledFormatRegistryBridge,
} from './showdownEngineInstalledFormatRegistryBridge'
import {
  createShowdownEngineFormatRegistryReadModel,
  readShowdownEngineMetadata,
  type CatalogUpdateShowdownEngineMetadata,
  type ShowdownEngineFormatRegistryReadModel,
} from './showdownEngineUpdateService'

export type ShowdownLegalityFormatHandoffStatus =
  | 'official-format-available'
  | 'custom-overlay-required'
  | 'runtime-unavailable'
  | 'unsupported-format'

export type ShowdownLegalityFormatSource = 'official-pokemon-showdown' | 'battlelab-custom-overlay'

export interface ShowdownLegalityFormatMapping {
  appFormat: BattleFormat
  displayName: string
  targetShowdownFormatId: string
  source: ShowdownLegalityFormatSource
  requiresOfficialFormat: boolean
  requiresCustomOverlay: boolean
  unsupportedMessage?: string
}

export interface ShowdownLegalityFormatInstalledRegistryHandoff {
  status: ShowdownEngineInstalledFormatRegistryBridge['status']
  officialFormatCount: number
  packageStatus: ShowdownEngineInstalledFormatRegistryBridge['packageSummary']['status']
  checkedAt: string
}

export type ShowdownLegalityActiveEngineSource =
  | 'active-app-managed-engine'
  | 'installed-package-fallback'
  | 'unavailable'

export interface ShowdownLegalityActiveEngineHandoff {
  source: ShowdownLegalityActiveEngineSource
  active: boolean
  revision: string | null
  versionLabel: string | null
  checkedAt: string | null
  metadataStatus: CatalogUpdateShowdownEngineMetadata['status'] | 'unavailable'
  formatRegistryStatus: CatalogUpdateShowdownEngineMetadata['formatRegistryStatus'] | 'unavailable'
  requiredFilesStatus: CatalogUpdateShowdownEngineMetadata['requiredFilesStatus'] | 'unavailable'
  learnsetDataStatus: CatalogUpdateShowdownEngineMetadata['learnsetDataStatus'] | 'unavailable'
  officialFormatCount: number
  message: string
}

export interface ShowdownLegalityFormatCustomOverlayHandoff {
  required: boolean
  supported: boolean
  overlayFolderKey: string
  mergeStrategy: string
  modifiesUpstreamSourceInPlace: false
  message: string
}

export interface ShowdownLegalityFormatRuntimeFallback {
  available: true
  reason: 'runtime-unavailable' | 'unsupported-format'
  preserveCurrentUiBehavior: true
  message: string
}

export interface ShowdownLegalityFormatHandoffSafety {
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
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
  allowCatalogOnlyFinalLegality: false
}

export interface ShowdownLegalityFormatHandoff {
  handoffId: string
  appFormat: BattleFormat
  status: ShowdownLegalityFormatHandoffStatus
  mapping: ShowdownLegalityFormatMapping
  activeEngine: ShowdownLegalityActiveEngineHandoff
  installedRegistry: ShowdownLegalityFormatInstalledRegistryHandoff
  officialFormatAvailable: boolean
  customOverlay: ShowdownLegalityFormatCustomOverlayHandoff
  runtimeFallback: ShowdownLegalityFormatRuntimeFallback | null
  safetyPolicy: ShowdownRuntimeAdapterSafetyPolicy
  safety: ShowdownLegalityFormatHandoffSafety
  boundaryNotes: string[]
}

export interface ShowdownLegalityFormatHandoffOptions {
  handoffId?: string
  installedRegistryBridge?: ShowdownEngineInstalledFormatRegistryBridge
  activeEngineMetadata?: CatalogUpdateShowdownEngineMetadata | null
  formatRegistry?: ShowdownEngineFormatRegistryReadModel
  loadActiveEngineMetadata?: () => Promise<CatalogUpdateShowdownEngineMetadata | null>
  loadInstalledRegistryBridge?: () => Promise<ShowdownEngineInstalledFormatRegistryBridge>
  loadFormatRegistry?: (checkedAt: string) => Promise<ShowdownEngineFormatRegistryReadModel>
  preferActiveEngine?: boolean
}

export const showdownLegalityFormatMappings: Record<BattleFormat, ShowdownLegalityFormatMapping> = {
  'vgc-regulation-h': {
    appFormat: 'vgc-regulation-h',
    displayName: 'VGC Regulation H',
    targetShowdownFormatId: 'gen9vgc2024regh',
    source: 'official-pokemon-showdown',
    requiresOfficialFormat: true,
    requiresCustomOverlay: false,
    unsupportedMessage:
      'VGC Regulation H does not map to an installed Pokemon Showdown format in this package; legality must remain unavailable until an official format ID is present.',
  },
  'vgc-regulation-g': {
    appFormat: 'vgc-regulation-g',
    displayName: 'VGC Regulation G',
    targetShowdownFormatId: 'gen9vgc2025regg',
    source: 'official-pokemon-showdown',
    requiresOfficialFormat: true,
    requiresCustomOverlay: false,
  },
  custom: {
    appFormat: 'custom',
    displayName: 'BattleLab Custom Format',
    targetShowdownFormatId: 'battlelab-custom-vgc-preview',
    source: 'battlelab-custom-overlay',
    requiresOfficialFormat: false,
    requiresCustomOverlay: true,
    unsupportedMessage:
      'BattleLab custom formats remain overlay-only and are not executable Pokemon Showdown formats until an approved adapter overlay is implemented.',
  },
}

export const showdownLegalityFormatHandoffSafetyPolicy: ShowdownRuntimeAdapterSafetyPolicy = {
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
  allowCatalogOnlyFinalLegality: false,
  allowSimulationExecution: false,
  allowPersistentStorage: false,
  allowNetworkFetch: false,
  preserveRuntimeUnavailableFallback: true,
}

const createSafety = (): ShowdownLegalityFormatHandoffSafety => ({
  explicitAsyncOnly: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noArchiveDownload: true,
  noArchiveExtraction: true,
  noFileIo: true,
  noDynamicImportFromDownloadedCode: true,
  noCatalogUpdatePanelWiring: true,
  noSimulationExecution: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
  allowCatalogOnlyFinalLegality: false,
})

const createRegistryHandoff = (
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
): ShowdownLegalityFormatInstalledRegistryHandoff => ({
  status: bridge.status,
  officialFormatCount: bridge.officialFormatCount,
  packageStatus: bridge.packageSummary.status,
  checkedAt: bridge.checkedAt,
})

const createActiveEngineUnavailable = (
  source: Extract<ShowdownLegalityActiveEngineSource, 'installed-package-fallback' | 'unavailable'>,
  message: string,
): ShowdownLegalityActiveEngineHandoff => ({
  source,
  active: false,
  revision: null,
  versionLabel: null,
  checkedAt: null,
  metadataStatus: 'unavailable',
  formatRegistryStatus: 'unavailable',
  requiredFilesStatus: 'unavailable',
  learnsetDataStatus: 'unavailable',
  officialFormatCount: 0,
  message,
})

const isActiveEngineReady = (metadata: CatalogUpdateShowdownEngineMetadata | null | undefined) =>
  Boolean(
    metadata &&
      metadata.status === 'current' &&
      metadata.formatRegistryStatus === 'available' &&
      metadata.requiredFilesStatus === 'validated-from-installed-package' &&
      metadata.learnsetDataStatus === 'available',
  )

const createActiveEngineHandoff = (
  metadata: CatalogUpdateShowdownEngineMetadata | null,
): ShowdownLegalityActiveEngineHandoff => {
  if (!metadata) {
    return createActiveEngineUnavailable(
      'installed-package-fallback',
      'No active app-managed Pokemon Showdown Engine metadata is available; using installed package fallback.',
    )
  }

  const active = isActiveEngineReady(metadata)

  return {
    source: active ? 'active-app-managed-engine' : 'installed-package-fallback',
    active,
    revision: metadata.revision,
    versionLabel: metadata.versionLabel,
    checkedAt: metadata.lastCheckedAt,
    metadataStatus: metadata.status,
    formatRegistryStatus: metadata.formatRegistryStatus,
    requiredFilesStatus: metadata.requiredFilesStatus,
    learnsetDataStatus: metadata.learnsetDataStatus,
    officialFormatCount: metadata.officialFormatCount,
    message: active
      ? 'Active app-managed Pokemon Showdown Engine metadata is ready for format-aware legality handoff.'
      : 'Active app-managed Pokemon Showdown Engine metadata is not fully validated; using installed package fallback.',
  }
}

const createActiveEngineBridge = (
  activeEngine: ShowdownLegalityActiveEngineHandoff,
): ShowdownEngineInstalledFormatRegistryBridge => ({
  bridgeId: 'showdown-legality-active-engine-format-registry-bridge',
  status: 'installed-registry-available',
  message: 'Active app-managed Pokemon Showdown Engine readiness is available for legality format handoff.',
  checkedAt: activeEngine.checkedAt ?? new Date().toISOString(),
  packageSummary: {
    packageName: 'pokemon-showdown',
    status: 'available',
    importStrategy: 'explicit-async-installed-package-import',
    errorMessage: null,
  },
  officialFormatCount: activeEngine.officialFormatCount,
  sampleOfficialFormats: [],
  customOverlay: {
    overlayFolderKey: 'battlelab-custom-overlays',
    mergeStrategy: 'read-overlay-after-official-registry',
    modifiesUpstreamSourceInPlace: false,
    status: 'supported',
    placeholderFormatCount: 1,
    message: 'BattleLab custom formats remain overlays and do not mutate upstream Pokemon Showdown source.',
  },
  aggregateHandoff: {
    aggregateReadModelId: 'showdown-legality-active-engine-aggregate-handoff',
    aggregateStatus: 'ready-preview',
    activationGateStatus: 'activation-ready',
    previousActivePreserved: true,
    metadataOnly: true,
  },
  runtimeUnavailableFallback: {
    available: true,
    status: 'runtime-unavailable-fallback',
    message: 'If active Engine readiness is unavailable, BattleLab must use the explicit installed package fallback.',
  },
  safety: {
    explicitAsyncOnly: true,
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
  },
  boundaryNotes: [
    'Active Engine handoff is explicit async and does not run on module import.',
    'Active Engine metadata decides readiness; Pokemon Showdown remains the legality source of truth.',
  ],
})

const isOfficialFormatAvailable = (
  mapping: ShowdownLegalityFormatMapping,
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
  registry?: ShowdownEngineFormatRegistryReadModel,
) =>
  bridge.status === 'installed-registry-available' &&
  (registry?.formats ?? bridge.sampleOfficialFormats).some(
    (format) =>
      format.formatId === mapping.targetShowdownFormatId &&
      format.source === 'official-pokemon-showdown' &&
      (!('available' in format) || format.available),
  )

const createCustomOverlay = (
  mapping: ShowdownLegalityFormatMapping,
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
): ShowdownLegalityFormatCustomOverlayHandoff => ({
  required: mapping.requiresCustomOverlay,
  supported: bridge.customOverlay.status === 'supported' && !bridge.customOverlay.modifiesUpstreamSourceInPlace,
  overlayFolderKey: bridge.customOverlay.overlayFolderKey,
  mergeStrategy: bridge.customOverlay.mergeStrategy,
  modifiesUpstreamSourceInPlace: bridge.customOverlay.modifiesUpstreamSourceInPlace,
  message: mapping.requiresCustomOverlay
    ? 'BattleLab custom formats require an overlay handoff and must not modify upstream Pokemon Showdown source.'
    : 'Official Pokemon Showdown format handoff does not require a BattleLab custom overlay.',
})

const createRuntimeFallback = (
  status: ShowdownLegalityFormatHandoffStatus,
  mapping: ShowdownLegalityFormatMapping,
): ShowdownLegalityFormatRuntimeFallback | null => {
  if (status === 'official-format-available' || status === 'custom-overlay-required') return null

  return {
    available: true,
    reason: status === 'unsupported-format' ? 'unsupported-format' : 'runtime-unavailable',
    preserveCurrentUiBehavior: true,
    message:
      status === 'unsupported-format'
        ? mapping.unsupportedMessage ?? `${mapping.displayName} is not mapped to an available Pokemon Showdown format yet.`
        : 'Installed Pokemon Showdown format registry is unavailable; Pokemon Editor legality must remain unknown.',
  }
}

const createStatus = (
  mapping: ShowdownLegalityFormatMapping,
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
  officialFormatAvailable: boolean,
  customOverlay: ShowdownLegalityFormatCustomOverlayHandoff,
): ShowdownLegalityFormatHandoffStatus => {
  if (mapping.requiresCustomOverlay) {
    return customOverlay.supported ? 'custom-overlay-required' : 'unsupported-format'
  }

  if (officialFormatAvailable) return 'official-format-available'

  return bridge.status === 'installed-registry-unavailable' ? 'runtime-unavailable' : 'unsupported-format'
}

const resolveActiveEngineHandoff = async (
  options: ShowdownLegalityFormatHandoffOptions,
): Promise<ShowdownLegalityActiveEngineHandoff> => {
  if (options.preferActiveEngine === false || options.installedRegistryBridge) {
    return createActiveEngineUnavailable(
      'installed-package-fallback',
      'Installed registry bridge was provided explicitly; active Engine metadata lookup was skipped.',
    )
  }

  try {
    const metadata =
      'activeEngineMetadata' in options
        ? options.activeEngineMetadata ?? null
        : await (options.loadActiveEngineMetadata ?? readShowdownEngineMetadata)()

    return createActiveEngineHandoff(metadata)
  } catch (error) {
    return createActiveEngineUnavailable(
      'installed-package-fallback',
      error instanceof Error
        ? `Active Engine metadata could not be read; using installed package fallback. ${error.message}`
        : 'Active Engine metadata could not be read; using installed package fallback.',
    )
  }
}

export async function createShowdownLegalityFormatHandoff(
  appFormat: BattleFormat,
  options: ShowdownLegalityFormatHandoffOptions = {},
): Promise<ShowdownLegalityFormatHandoff> {
  const mapping = showdownLegalityFormatMappings[appFormat]
  const activeEngine = await resolveActiveEngineHandoff(options)
  const bridge =
    options.installedRegistryBridge ??
    (activeEngine.active ? createActiveEngineBridge(activeEngine) : undefined) ??
    (await (options.loadInstalledRegistryBridge ?? createShowdownEngineInstalledFormatRegistryBridge)())
  const registry =
    options.formatRegistry ??
    (!options.installedRegistryBridge && bridge.status === 'installed-registry-available'
      ? await (options.loadFormatRegistry ?? createShowdownEngineFormatRegistryReadModel)(bridge.checkedAt)
      : undefined)
  const officialFormatAvailable = isOfficialFormatAvailable(mapping, bridge, registry)
  const customOverlay = createCustomOverlay(mapping, bridge)
  const status = createStatus(mapping, bridge, officialFormatAvailable, customOverlay)

  return {
    handoffId: options.handoffId ?? `showdown-legality-format-handoff-${appFormat}`,
    appFormat,
    status,
    mapping,
    activeEngine,
    installedRegistry: createRegistryHandoff(bridge),
    officialFormatAvailable,
    customOverlay,
    runtimeFallback: createRuntimeFallback(status, mapping),
    safetyPolicy: showdownLegalityFormatHandoffSafetyPolicy,
    safety: createSafety(),
    boundaryNotes: [
      'Showdown legality format handoff is explicit async and does not import Pokemon Showdown on module import.',
      'Active app-managed Engine metadata is preferred when it is current and validated; installed package lookup remains the explicit fallback.',
      'Pokemon Showdown format IDs are the future legality runtime target; PokeAPI/catalog data remains enrichment-only.',
      'BattleLab custom formats require overlay support and must not mutate upstream Pokemon Showdown source.',
      'Unsupported or unavailable format registry states must preserve runtime-unavailable UI fallback.',
    ],
  }
}
