import type { BattleFormat } from '../types'
import type { ShowdownRuntimeAdapterSafetyPolicy } from '../types/showdownRuntime'
import {
  createShowdownEngineInstalledFormatRegistryBridge,
  type ShowdownEngineInstalledFormatRegistryBridge,
} from './showdownEngineInstalledFormatRegistryBridge'

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
  fallbackShowdownFormatId?: string
}

export interface ShowdownLegalityFormatInstalledRegistryHandoff {
  status: ShowdownEngineInstalledFormatRegistryBridge['status']
  officialFormatCount: number
  packageStatus: ShowdownEngineInstalledFormatRegistryBridge['packageSummary']['status']
  checkedAt: string
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
  loadInstalledRegistryBridge?: () => Promise<ShowdownEngineInstalledFormatRegistryBridge>
}

export const showdownLegalityFormatMappings: Record<BattleFormat, ShowdownLegalityFormatMapping> = {
  'vgc-regulation-h': {
    appFormat: 'vgc-regulation-h',
    displayName: 'VGC Regulation H',
    targetShowdownFormatId: 'gen9vgc2024regh',
    source: 'official-pokemon-showdown',
    requiresOfficialFormat: true,
    requiresCustomOverlay: false,
    fallbackShowdownFormatId: 'gen9doublesou',
  },
  'vgc-regulation-g': {
    appFormat: 'vgc-regulation-g',
    displayName: 'VGC Regulation G',
    targetShowdownFormatId: 'gen9vgc2024regg',
    source: 'official-pokemon-showdown',
    requiresOfficialFormat: true,
    requiresCustomOverlay: false,
    fallbackShowdownFormatId: 'gen9doublesou',
  },
  custom: {
    appFormat: 'custom',
    displayName: 'BattleLab Custom Format',
    targetShowdownFormatId: 'battlelab-custom-vgc-preview',
    source: 'battlelab-custom-overlay',
    requiresOfficialFormat: false,
    requiresCustomOverlay: true,
    fallbackShowdownFormatId: 'gen9doublesou',
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

const isOfficialFormatAvailable = (
  mapping: ShowdownLegalityFormatMapping,
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
) =>
  bridge.status === 'installed-registry-available' &&
  bridge.sampleOfficialFormats.some((format) => format.formatId === mapping.targetShowdownFormatId)

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
        ? `${mapping.displayName} is not mapped to an available Pokemon Showdown format yet.`
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

export async function createShowdownLegalityFormatHandoff(
  appFormat: BattleFormat,
  options: ShowdownLegalityFormatHandoffOptions = {},
): Promise<ShowdownLegalityFormatHandoff> {
  const mapping = showdownLegalityFormatMappings[appFormat]
  const bridge =
    options.installedRegistryBridge ??
    (await (options.loadInstalledRegistryBridge ?? createShowdownEngineInstalledFormatRegistryBridge)())
  const officialFormatAvailable = isOfficialFormatAvailable(mapping, bridge)
  const customOverlay = createCustomOverlay(mapping, bridge)
  const status = createStatus(mapping, bridge, officialFormatAvailable, customOverlay)

  return {
    handoffId: options.handoffId ?? `showdown-legality-format-handoff-${appFormat}`,
    appFormat,
    status,
    mapping,
    installedRegistry: createRegistryHandoff(bridge),
    officialFormatAvailable,
    customOverlay,
    runtimeFallback: createRuntimeFallback(status, mapping),
    safetyPolicy: showdownLegalityFormatHandoffSafetyPolicy,
    safety: createSafety(),
    boundaryNotes: [
      'Showdown legality format handoff is explicit async and does not import Pokemon Showdown on module import.',
      'Pokemon Showdown format IDs are the future legality runtime target; PokeAPI/catalog data remains enrichment-only.',
      'BattleLab custom formats require overlay support and must not mutate upstream Pokemon Showdown source.',
      'Unsupported or unavailable format registry states must preserve runtime-unavailable UI fallback.',
    ],
  }
}
