import type { ShowdownEngineInstalledFormatRegistryBridge } from './showdownEngineInstalledFormatRegistryBridge'
import {
  createShowdownLegalityFormatHandoff,
  showdownLegalityFormatMappings,
  type ShowdownLegalityFormatHandoff,
} from './showdownLegalityFormatHandoff'

export type ShowdownLegalityFormatHandoffValidationSeverity = 'error' | 'warning'

export type ShowdownLegalityFormatHandoffValidationCode =
  | 'official-format-invalid'
  | 'custom-overlay-invalid'
  | 'runtime-unavailable-invalid'
  | 'fallback-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownLegalityFormatHandoffValidationIssue {
  code: ShowdownLegalityFormatHandoffValidationCode
  severity: ShowdownLegalityFormatHandoffValidationSeverity
  path: string
  message: string
}

export interface ShowdownLegalityFormatHandoffValidationResult {
  isValid: boolean
  issues: ShowdownLegalityFormatHandoffValidationIssue[]
  mappedFormats: Record<
    string,
    {
      targetShowdownFormatId: string
      status: ShowdownLegalityFormatHandoff['status']
      officialFormatAvailable: boolean
      customOverlayRequired: boolean
    }
  >
  casesCovered: string[]
}

const checkedAt = '2026-06-16T00:00:00.000Z'

const createIssue = (
  code: ShowdownLegalityFormatHandoffValidationCode,
  severity: ShowdownLegalityFormatHandoffValidationSeverity,
  path: string,
  message: string,
): ShowdownLegalityFormatHandoffValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createBridgeFixture = (
  status: ShowdownEngineInstalledFormatRegistryBridge['status'],
  formatIds: string[],
): ShowdownEngineInstalledFormatRegistryBridge => ({
  bridgeId: `showdown-legality-format-handoff-${status}`,
  status,
  message:
    status === 'installed-registry-available'
      ? 'Installed Pokemon Showdown registry is available.'
      : 'Installed Pokemon Showdown registry is unavailable.',
  checkedAt,
  packageSummary: {
    packageName: 'pokemon-showdown',
    status: status === 'installed-registry-available' ? 'available' : 'unavailable',
    importStrategy: 'explicit-async-installed-package-import',
    errorMessage: status === 'installed-registry-available' ? null : 'Injected unavailable registry fixture.',
  },
  officialFormatCount: formatIds.length,
  sampleOfficialFormats: formatIds.map((formatId) => ({
    formatId,
    displayName: formatId,
    source: 'official-pokemon-showdown',
    gameType: 'doubles',
    generation: 9,
    section: 'S/V Doubles',
  })),
  customOverlay: {
    overlayFolderKey: 'battlelab-custom-overlays',
    mergeStrategy: 'read-overlay-after-official-registry',
    modifiesUpstreamSourceInPlace: false,
    status: 'supported',
    placeholderFormatCount: 1,
    message: 'BattleLab custom formats remain overlays and do not mutate upstream Pokemon Showdown source.',
  },
  aggregateHandoff: {
    aggregateReadModelId: 'showdown-legality-format-handoff-aggregate-fixture',
    aggregateStatus: status === 'installed-registry-available' ? 'ready-preview' : 'blocked-preview',
    activationGateStatus: status === 'installed-registry-available' ? 'activation-ready' : 'blocked',
    previousActivePreserved: true,
    metadataOnly: true,
  },
  runtimeUnavailableFallback: {
    available: true,
    status: 'runtime-unavailable-fallback',
    message: 'Runtime-unavailable fallback remains available.',
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
    'Installed format registry bridge is explicit async and does not run on module import.',
    'BattleLab custom formats remain overlays.',
  ],
})

const availableBridge = createBridgeFixture('installed-registry-available', [
  showdownLegalityFormatMappings['vgc-regulation-h'].targetShowdownFormatId,
  showdownLegalityFormatMappings['vgc-regulation-g'].targetShowdownFormatId,
])

const unavailableBridge = createBridgeFixture('installed-registry-unavailable', [])

const validateCommonBoundary = (
  handoff: ShowdownLegalityFormatHandoff,
  issues: ShowdownLegalityFormatHandoffValidationIssue[],
  path: string,
) => {
  if (
    !handoff.safety.explicitAsyncOnly ||
    !handoff.safety.noImportTimeExecution ||
    !handoff.safety.noAppLoadExecution ||
    !handoff.safety.noPanelOpenExecution ||
    !handoff.safety.noArchiveDownload ||
    !handoff.safety.noArchiveExtraction ||
    !handoff.safety.noFileIo ||
    !handoff.safety.noDynamicImportFromDownloadedCode ||
    !handoff.safety.noCatalogUpdatePanelWiring ||
    !handoff.safety.noSimulationExecution ||
    handoff.safety.allowCatalogOnlyFinalLegality
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Format handoff must remain explicit-async, UI-unwired, no-archive, no-file-IO, no-simulation, and no catalog-only final legality.',
      ),
    )
  }

  if (
    handoff.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    handoff.safety.catalogRole !== 'enrichment-only' ||
    handoff.safetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    handoff.safetyPolicy.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Format handoff must preserve Pokemon Showdown authority and PokeAPI/catalog enrichment-only boundaries.',
      ),
    )
  }

  if (
    !handoff.boundaryNotes.some((note) => note.includes('explicit async')) ||
    !handoff.boundaryNotes.some((note) => note.includes('does not import Pokemon Showdown on module import'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Format handoff boundary notes must state explicit async behavior and no module-import Pokemon Showdown import.',
      ),
    )
  }
}

const validateOfficialHandoff = (
  handoff: ShowdownLegalityFormatHandoff,
  issues: ShowdownLegalityFormatHandoffValidationIssue[],
  path: string,
) => {
  validateCommonBoundary(handoff, issues, path)

  if (
    handoff.status !== 'official-format-available' ||
    !handoff.officialFormatAvailable ||
    handoff.mapping.source !== 'official-pokemon-showdown' ||
    handoff.mapping.requiresCustomOverlay ||
    handoff.runtimeFallback !== null
  ) {
    issues.push(
      createIssue(
        'official-format-invalid',
        'error',
        path,
        'Official BattleLab formats must map to available Pokemon Showdown format IDs without requiring custom overlays.',
      ),
    )
  }
}

const validateCustomHandoff = (
  handoff: ShowdownLegalityFormatHandoff,
  issues: ShowdownLegalityFormatHandoffValidationIssue[],
  path: string,
) => {
  validateCommonBoundary(handoff, issues, path)

  if (
    handoff.status !== 'custom-overlay-required' ||
    handoff.mapping.source !== 'battlelab-custom-overlay' ||
    !handoff.customOverlay.required ||
    !handoff.customOverlay.supported ||
    handoff.customOverlay.modifiesUpstreamSourceInPlace ||
    handoff.runtimeFallback !== null
  ) {
    issues.push(
      createIssue(
        'custom-overlay-invalid',
        'error',
        path,
        'Custom BattleLab format must require overlay handoff without mutating upstream Pokemon Showdown source.',
      ),
    )
  }
}

const validateUnavailableHandoff = (
  handoff: ShowdownLegalityFormatHandoff,
  issues: ShowdownLegalityFormatHandoffValidationIssue[],
) => {
  validateCommonBoundary(handoff, issues, 'runtimeUnavailable')

  if (
    handoff.status !== 'runtime-unavailable' ||
    handoff.installedRegistry.status !== 'installed-registry-unavailable' ||
    !handoff.runtimeFallback ||
    handoff.runtimeFallback.reason !== 'runtime-unavailable' ||
    !handoff.runtimeFallback.preserveCurrentUiBehavior
  ) {
    issues.push(
      createIssue(
        'runtime-unavailable-invalid',
        'error',
        'runtimeUnavailable',
        'Unavailable installed registry must map to runtime-unavailable fallback and preserve current UI behavior.',
      ),
    )
  }
}

const validateFallbacks = (
  handoffs: ShowdownLegalityFormatHandoff[],
  issues: ShowdownLegalityFormatHandoffValidationIssue[],
) => {
  handoffs.forEach((handoff) => {
    if (
      handoff.runtimeFallback &&
      (!handoff.runtimeFallback.available || !handoff.runtimeFallback.preserveCurrentUiBehavior)
    ) {
      issues.push(
        createIssue(
          'fallback-invalid',
          'error',
          `${handoff.handoffId}.runtimeFallback`,
          'Runtime fallback must be explicit and preserve current UI behavior.',
        ),
      )
    }
  })
}

export async function validateShowdownLegalityFormatHandoff(): Promise<ShowdownLegalityFormatHandoffValidationResult> {
  const issues: ShowdownLegalityFormatHandoffValidationIssue[] = []
  const regulationH = await createShowdownLegalityFormatHandoff('vgc-regulation-h', {
    handoffId: 'showdown-legality-format-handoff-validation-reg-h',
    installedRegistryBridge: availableBridge,
  })
  const regulationG = await createShowdownLegalityFormatHandoff('vgc-regulation-g', {
    handoffId: 'showdown-legality-format-handoff-validation-reg-g',
    installedRegistryBridge: availableBridge,
  })
  const custom = await createShowdownLegalityFormatHandoff('custom', {
    handoffId: 'showdown-legality-format-handoff-validation-custom',
    installedRegistryBridge: availableBridge,
  })
  const runtimeUnavailable = await createShowdownLegalityFormatHandoff('vgc-regulation-h', {
    handoffId: 'showdown-legality-format-handoff-validation-unavailable',
    installedRegistryBridge: unavailableBridge,
  })
  const handoffs = [regulationH, regulationG, custom, runtimeUnavailable]

  validateOfficialHandoff(regulationH, issues, 'regulationH')
  validateOfficialHandoff(regulationG, issues, 'regulationG')
  validateCustomHandoff(custom, issues, 'custom')
  validateUnavailableHandoff(runtimeUnavailable, issues)
  validateFallbacks(handoffs, issues)

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    mappedFormats: {
      'vgc-regulation-h': {
        targetShowdownFormatId: regulationH.mapping.targetShowdownFormatId,
        status: regulationH.status,
        officialFormatAvailable: regulationH.officialFormatAvailable,
        customOverlayRequired: regulationH.customOverlay.required,
      },
      'vgc-regulation-g': {
        targetShowdownFormatId: regulationG.mapping.targetShowdownFormatId,
        status: regulationG.status,
        officialFormatAvailable: regulationG.officialFormatAvailable,
        customOverlayRequired: regulationG.customOverlay.required,
      },
      custom: {
        targetShowdownFormatId: custom.mapping.targetShowdownFormatId,
        status: custom.status,
        officialFormatAvailable: custom.officialFormatAvailable,
        customOverlayRequired: custom.customOverlay.required,
      },
    },
    casesCovered: [
      'VGC Regulation H official format handoff',
      'VGC Regulation G official format handoff',
      'BattleLab custom format overlay handoff',
      'runtime-unavailable fallback',
    ],
  }
}
