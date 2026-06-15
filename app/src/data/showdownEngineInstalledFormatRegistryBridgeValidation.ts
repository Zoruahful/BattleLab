import {
  createShowdownEngineInstalledFormatRegistryBridge,
  type ShowdownEngineInstalledFormatRegistryBridge,
} from './showdownEngineInstalledFormatRegistryBridge'

export type ShowdownEngineInstalledFormatRegistryBridgeValidationSeverity = 'error' | 'warning'

export type ShowdownEngineInstalledFormatRegistryBridgeValidationCode =
  | 'available-bridge-invalid'
  | 'unavailable-bridge-invalid'
  | 'format-summary-invalid'
  | 'aggregate-handoff-invalid'
  | 'fallback-invalid'
  | 'overlay-policy-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineInstalledFormatRegistryBridgeValidationIssue {
  code: ShowdownEngineInstalledFormatRegistryBridgeValidationCode
  severity: ShowdownEngineInstalledFormatRegistryBridgeValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineInstalledFormatRegistryBridgeValidationResult {
  isValid: boolean
  issues: ShowdownEngineInstalledFormatRegistryBridgeValidationIssue[]
  availableBridgeStatus: ShowdownEngineInstalledFormatRegistryBridge['status']
  availableOfficialFormatCount: number
  unavailableBridgeStatus: ShowdownEngineInstalledFormatRegistryBridge['status']
  sampleFormatCount: number
}

const createIssue = (
  code: ShowdownEngineInstalledFormatRegistryBridgeValidationCode,
  severity: ShowdownEngineInstalledFormatRegistryBridgeValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineInstalledFormatRegistryBridgeValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateCommonBridge = (
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
  issues: ShowdownEngineInstalledFormatRegistryBridgeValidationIssue[],
  path: string,
) => {
  if (
    bridge.customOverlay.modifiesUpstreamSourceInPlace ||
    bridge.customOverlay.overlayFolderKey !== 'battlelab-custom-overlays' ||
    bridge.customOverlay.mergeStrategy !== 'read-overlay-after-official-registry' ||
    bridge.customOverlay.status !== 'supported'
  ) {
    issues.push(
      createIssue(
        'overlay-policy-invalid',
        'error',
        `${path}.customOverlay`,
        'Installed format registry bridge must keep BattleLab custom formats as overlays.',
      ),
    )
  }

  if (
    !bridge.safety.explicitAsyncOnly ||
    !bridge.safety.noImportTimeExecution ||
    !bridge.safety.noAppLoadExecution ||
    !bridge.safety.noPanelOpenExecution ||
    !bridge.safety.noArchiveDownload ||
    !bridge.safety.noArchiveExtraction ||
    !bridge.safety.noFileIo ||
    !bridge.safety.noDynamicImportFromDownloadedCode ||
    !bridge.safety.noCatalogUpdatePanelWiring ||
    !bridge.safety.noSimulationExecution ||
    !bridge.safety.installedPackageMetadataReadOnly
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Installed format registry bridge must remain explicit-async, import-safe, UI-unwired, no-archive, no-file-IO, and no-simulation.',
      ),
    )
  }

  if (
    bridge.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    bridge.safety.catalogRole !== 'enrichment-only' ||
    !bridge.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Installed format registry bridge must preserve Pokemon Showdown authority and PokeAPI enrichment-only boundaries.',
      ),
    )
  }

  if (!bridge.runtimeUnavailableFallback.available || bridge.runtimeUnavailableFallback.status !== 'runtime-unavailable-fallback') {
    issues.push(
      createIssue(
        'fallback-invalid',
        'error',
        `${path}.runtimeUnavailableFallback`,
        'Installed format registry bridge must expose runtime-unavailable fallback metadata.',
      ),
    )
  }

  if (!bridge.aggregateHandoff.previousActivePreserved || !bridge.aggregateHandoff.metadataOnly) {
    issues.push(
      createIssue(
        'aggregate-handoff-invalid',
        'error',
        `${path}.aggregateHandoff`,
        'Installed format registry bridge aggregate handoff must preserve previous active Engine metadata and remain metadata-only.',
      ),
    )
  }

  if (
    !bridge.boundaryNotes.some((note) => note.includes('explicit async')) ||
    !bridge.boundaryNotes.some((note) => note.includes('does not run on module import'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Installed format registry bridge boundary notes must state explicit async and no module-import execution.',
      ),
    )
  }
}

const validateAvailableBridge = (
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
  issues: ShowdownEngineInstalledFormatRegistryBridgeValidationIssue[],
) => {
  validateCommonBridge(bridge, issues, 'availableBridge')

  if (
    bridge.status !== 'installed-registry-available' ||
    bridge.packageSummary.status !== 'available' ||
    bridge.packageSummary.packageName !== 'pokemon-showdown' ||
    bridge.officialFormatCount < 1 ||
    bridge.aggregateHandoff.aggregateStatus !== 'ready-preview' ||
    bridge.aggregateHandoff.activationGateStatus !== 'activation-ready'
  ) {
    issues.push(
      createIssue(
        'available-bridge-invalid',
        'error',
        'availableBridge',
        'Available installed registry bridge must report installed package availability, official formats, and ready aggregate handoff.',
      ),
    )
  }

  if (
    bridge.sampleOfficialFormats.length < 1 ||
    bridge.sampleOfficialFormats.some((format) => !format.formatId || !format.displayName || format.source !== 'official-pokemon-showdown')
  ) {
    issues.push(
      createIssue(
        'format-summary-invalid',
        'error',
        'availableBridge.sampleOfficialFormats',
        'Available installed registry bridge must expose sample official format summaries.',
      ),
    )
  }
}

const validateUnavailableBridge = (
  bridge: ShowdownEngineInstalledFormatRegistryBridge,
  issues: ShowdownEngineInstalledFormatRegistryBridgeValidationIssue[],
) => {
  validateCommonBridge(bridge, issues, 'unavailableBridge')

  if (
    bridge.status !== 'installed-registry-unavailable' ||
    bridge.packageSummary.status !== 'unavailable' ||
    !bridge.packageSummary.errorMessage ||
    bridge.officialFormatCount !== 0 ||
    bridge.sampleOfficialFormats.length !== 0 ||
    bridge.aggregateHandoff.aggregateStatus !== 'blocked-preview' ||
    bridge.aggregateHandoff.activationGateStatus !== 'blocked'
  ) {
    issues.push(
      createIssue(
        'unavailable-bridge-invalid',
        'error',
        'unavailableBridge',
        'Unavailable installed registry bridge must report blocked aggregate handoff and no official format summaries.',
      ),
    )
  }
}

export async function validateShowdownEngineInstalledFormatRegistryBridge(): Promise<ShowdownEngineInstalledFormatRegistryBridgeValidationResult> {
  const issues: ShowdownEngineInstalledFormatRegistryBridgeValidationIssue[] = []
  const availableBridge = await createShowdownEngineInstalledFormatRegistryBridge({
    bridgeId: 'installed-format-registry-bridge-validation-available',
    checkedAt: '2026-06-15T00:00:00.000Z',
    proofId: 'installed-format-registry-bridge-proof-available',
  })
  const unavailableBridge = await createShowdownEngineInstalledFormatRegistryBridge({
    bridgeId: 'installed-format-registry-bridge-validation-unavailable',
    checkedAt: '2026-06-15T00:00:00.000Z',
    proofId: 'installed-format-registry-bridge-proof-unavailable',
    loadRegistry: async () => {
      throw new Error('Injected installed format registry bridge unavailable fixture.')
    },
  })

  validateAvailableBridge(availableBridge, issues)
  validateUnavailableBridge(unavailableBridge, issues)

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    availableBridgeStatus: availableBridge.status,
    availableOfficialFormatCount: availableBridge.officialFormatCount,
    unavailableBridgeStatus: unavailableBridge.status,
    sampleFormatCount: availableBridge.sampleOfficialFormats.length,
  }
}
