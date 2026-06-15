export type ShowdownEngineUpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'preparing'
  | 'validating'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineUpdateStatus =
  | 'not-started'
  | 'checking'
  | 'downloading'
  | 'extracting-preparing'
  | 'validating'
  | 'current'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

export type ShowdownEngineUpdateTrigger = 'future-user-triggered-catalog-update'

export type ShowdownEngineFormatSource = 'official-pokemon-showdown' | 'battlelab-custom'

export interface ShowdownEngineUpdateSafetyPolicy {
  trigger: ShowdownEngineUpdateTrigger
  explicitUserActionRequired: true
  allowImportTimeExecution: false
  allowAppLoadExecution: false
  allowPanelOpenExecution: false
  allowHiddenExecutableInstall: false
  allowDownloadedScriptExecution: false
  allowObfuscation: false
  allowWritesOutsideApprovedEngineStorage: false
  allowSimulationExecution: false
  preservePreviousValidEngineOnFailure: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineStorageBoundary {
  storageKey: string
  storageKind: 'app-managed-engine-storage-preview'
  approvedForWrites: false
  note: string
}

export interface ShowdownEngineFormatAvailability {
  formatId: string
  displayName: string
  source: ShowdownEngineFormatSource
  gameType?: string
  generation?: number
  section?: string
  available: boolean
}

export interface ShowdownEngineFormatRegistryReadModel {
  status: 'not-checked' | 'available' | 'unavailable'
  officialFormatCount: number
  battleLabCustomFormatCount: number
  formats: ShowdownEngineFormatAvailability[]
  checkedAt?: string
  message: string
}

export interface ShowdownEngineDataSnapshot {
  snapshotId: string
  source: 'official-pokemon-showdown-package'
  version: string
  preparedAt: string
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  validationStatus: 'valid' | 'warning' | 'invalid'
}

export interface ShowdownEngineUpdateProgressEvent {
  eventId: string
  phase: ShowdownEngineUpdatePhase
  status: ShowdownEngineUpdateStatus
  progressPercent: number
  message: string
  emittedAt: string
}

export interface ShowdownEngineUpdateReadModel {
  updateId: string
  status: ShowdownEngineUpdateStatus
  phase: ShowdownEngineUpdatePhase
  requestedAt: string
  completedAt?: string
  progressPercent: number
  message: string
  previousValidEngine: ShowdownEngineDataSnapshot | null
  candidateEngine: ShowdownEngineDataSnapshot | null
  activeEngine: ShowdownEngineDataSnapshot | null
  formatRegistry: ShowdownEngineFormatRegistryReadModel
  safetyPolicy: ShowdownEngineUpdateSafetyPolicy
  storageBoundary: ShowdownEngineStorageBoundary
  events: ShowdownEngineUpdateProgressEvent[]
  warnings: string[]
  errors: string[]
}

export interface ShowdownEngineUpdateServiceOptions {
  requestedAt?: string
  updateId?: string
  mode?: 'current' | 'complete' | 'warning' | 'failed' | 'cancelled'
  previousValidEngine?: ShowdownEngineDataSnapshot | null
  candidateEngine?: ShowdownEngineDataSnapshot | null
  formatRegistry?: ShowdownEngineFormatRegistryReadModel
}

interface ShowdownFormatRecord {
  id: string
  name: string
  exists?: boolean
  gameType?: string
  gen?: number
  section?: string
}

interface PokemonShowdownFormatApi {
  Dex: {
    formats: {
      all: () => ShowdownFormatRecord[]
    }
  }
}

export const showdownEngineUpdateSafetyPolicy: ShowdownEngineUpdateSafetyPolicy = {
  trigger: 'future-user-triggered-catalog-update',
  explicitUserActionRequired: true,
  allowImportTimeExecution: false,
  allowAppLoadExecution: false,
  allowPanelOpenExecution: false,
  allowHiddenExecutableInstall: false,
  allowDownloadedScriptExecution: false,
  allowObfuscation: false,
  allowWritesOutsideApprovedEngineStorage: false,
  allowSimulationExecution: false,
  preservePreviousValidEngineOnFailure: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
}

export const showdownEngineStorageBoundary: ShowdownEngineStorageBoundary = {
  storageKey: 'battlelab.showdown-engine.preview',
  storageKind: 'app-managed-engine-storage-preview',
  approvedForWrites: false,
  note: 'Preview boundary only. Future implementation must write only inside approved app-managed Engine storage.',
}

export const battleLabCustomFormatPlaceholders: ShowdownEngineFormatAvailability[] = [
  {
    formatId: 'battlelab-custom-vgc-preview',
    displayName: 'BattleLab Custom VGC Preview',
    source: 'battlelab-custom',
    gameType: 'doubles',
    available: false,
  },
]

export const sampleShowdownEngineFormatRegistry: ShowdownEngineFormatRegistryReadModel = {
  status: 'available',
  officialFormatCount: 2,
  battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
  formats: [
    {
      formatId: 'gen9doublesou',
      displayName: '[Gen 9] Doubles OU',
      source: 'official-pokemon-showdown',
      gameType: 'doubles',
      generation: 9,
      section: 'S/V Doubles',
      available: true,
    },
    {
      formatId: 'gen9vgc2024regg',
      displayName: '[Gen 9] VGC 2024 Regulation G',
      source: 'official-pokemon-showdown',
      gameType: 'doubles',
      generation: 9,
      section: 'S/V Doubles',
      available: true,
    },
    ...battleLabCustomFormatPlaceholders,
  ],
  checkedAt: '2026-06-15T18:00:00.000Z',
  message: 'Official Pokemon Showdown format availability is represented for future Engine update surfaces.',
}

export const sampleCurrentShowdownEngineData: ShowdownEngineDataSnapshot = {
  snapshotId: 'showdown-engine-current-valid-preview',
  source: 'official-pokemon-showdown-package',
  version: 'installed-package-preview',
  preparedAt: '2026-06-15T18:00:00.000Z',
  formatRegistry: sampleShowdownEngineFormatRegistry,
  validationStatus: 'valid',
}

const createEvent = (
  updateId: string,
  phase: ShowdownEngineUpdatePhase,
  status: ShowdownEngineUpdateStatus,
  progressPercent: number,
  message: string,
  emittedAt: string,
): ShowdownEngineUpdateProgressEvent => ({
  eventId: `${updateId}-${phase}-${status}`,
  phase,
  status,
  progressPercent,
  message,
  emittedAt,
})

const createEvents = (
  updateId: string,
  status: ShowdownEngineUpdateStatus,
  requestedAt: string,
): ShowdownEngineUpdateProgressEvent[] => {
  const baseEvents = [
    createEvent(updateId, 'checking', 'checking', 10, 'Checking Pokemon Showdown Engine metadata.', requestedAt),
  ]

  if (status === 'current') {
    return [
      ...baseEvents,
      createEvent(updateId, 'current', 'current', 100, 'Current Pokemon Showdown Engine data is up to date.', requestedAt),
    ]
  }

  if (status === 'cancelled') {
    return [
      ...baseEvents,
      createEvent(updateId, 'cancelled', 'cancelled', 10, 'Pokemon Showdown Engine update was cancelled.', requestedAt),
    ]
  }

  if (status === 'failed') {
    return [
      ...baseEvents,
      createEvent(updateId, 'failed', 'failed', 25, 'Pokemon Showdown Engine update failed before replacement.', requestedAt),
    ]
  }

  return [
    ...baseEvents,
    createEvent(updateId, 'downloading', 'downloading', 35, 'Downloading Pokemon Showdown Engine source data.', requestedAt),
    createEvent(updateId, 'preparing', 'extracting-preparing', 60, 'Extracting and preparing Engine data in a safe staging area.', requestedAt),
    createEvent(updateId, 'validating', 'validating', 85, 'Validating prepared Engine data before replacement.', requestedAt),
    createEvent(
      updateId,
      status === 'warning' ? 'warning' : 'complete',
      status,
      100,
      status === 'warning'
        ? 'Pokemon Showdown Engine update completed with warnings.'
        : 'Pokemon Showdown Engine update completed.',
      requestedAt,
    ),
  ]
}

const getPhaseForStatus = (status: ShowdownEngineUpdateStatus): ShowdownEngineUpdatePhase => {
  if (status === 'extracting-preparing') return 'preparing'
  if (status === 'not-started') return 'idle'

  return status
}

const createUnavailableFormatRegistry = (message: string, checkedAt: string): ShowdownEngineFormatRegistryReadModel => ({
  status: 'unavailable',
  officialFormatCount: 0,
  battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
  formats: [...battleLabCustomFormatPlaceholders],
  checkedAt,
  message,
})

const loadOfficialPokemonShowdownFormats = async (): Promise<PokemonShowdownFormatApi> => {
  const packageName = 'pokemon-showdown'
  const importedPackage = (await import(/* @vite-ignore */ packageName)) as
    | PokemonShowdownFormatApi
    | { default?: PokemonShowdownFormatApi }
  const showdown = 'Dex' in importedPackage ? importedPackage : importedPackage.default

  if (!showdown?.Dex.formats.all) {
    throw new Error('pokemon-showdown did not expose Dex.formats.all().')
  }

  return showdown
}

export async function createShowdownEngineFormatRegistryReadModel(
  checkedAt = new Date().toISOString(),
): Promise<ShowdownEngineFormatRegistryReadModel> {
  try {
    const showdown = await loadOfficialPokemonShowdownFormats()
    const officialFormats = showdown.Dex.formats
      .all()
      .filter((format) => format.exists && format.id && format.name)
      .map<ShowdownEngineFormatAvailability>((format) => ({
        formatId: format.id,
        displayName: format.name,
        source: 'official-pokemon-showdown',
        ...(format.gameType ? { gameType: format.gameType } : {}),
        ...(format.gen ? { generation: format.gen } : {}),
        ...(format.section ? { section: format.section } : {}),
        available: true,
      }))

    return {
      status: 'available',
      officialFormatCount: officialFormats.length,
      battleLabCustomFormatCount: battleLabCustomFormatPlaceholders.length,
      formats: [...officialFormats, ...battleLabCustomFormatPlaceholders],
      checkedAt,
      message: 'Official Pokemon Showdown formats are available from the installed package.',
    }
  } catch (error) {
    return createUnavailableFormatRegistry(
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown format registry failure.',
      checkedAt,
    )
  }
}

export function createShowdownEngineUpdateReadModel(
  options: ShowdownEngineUpdateServiceOptions = {},
): ShowdownEngineUpdateReadModel {
  const requestedAt = options.requestedAt ?? new Date().toISOString()
  const updateId = options.updateId ?? `showdown-engine-update-${requestedAt}`
  const mode = options.mode ?? 'current'
  const status: ShowdownEngineUpdateStatus = mode
  const previousValidEngine = options.previousValidEngine ?? sampleCurrentShowdownEngineData
  const candidateEngine =
    options.candidateEngine ??
    (mode === 'complete' || mode === 'warning'
      ? {
          ...sampleCurrentShowdownEngineData,
          snapshotId: `showdown-engine-candidate-${mode}`,
          preparedAt: requestedAt,
          validationStatus: mode === 'warning' ? ('warning' as const) : ('valid' as const),
        }
      : null)
  const activeEngine =
    mode === 'complete' || mode === 'warning' || mode === 'current'
      ? candidateEngine ?? previousValidEngine
      : previousValidEngine
  const progressPercent =
    status === 'complete' || status === 'warning' || status === 'current'
      ? 100
      : status === 'failed'
        ? 25
        : status === 'cancelled'
          ? 10
          : 0

  return {
    updateId,
    status,
    phase: getPhaseForStatus(status),
    requestedAt,
    ...(status === 'complete' || status === 'warning' || status === 'current' || status === 'failed' || status === 'cancelled'
      ? { completedAt: requestedAt }
      : {}),
    progressPercent,
    message:
      status === 'current'
        ? 'Pokemon Showdown Engine data is current.'
        : status === 'failed'
          ? 'Pokemon Showdown Engine update failed; previous valid Engine data remains active.'
          : status === 'cancelled'
            ? 'Pokemon Showdown Engine update was cancelled; previous valid Engine data remains active.'
            : status === 'warning'
              ? 'Pokemon Showdown Engine update completed with warnings.'
              : 'Pokemon Showdown Engine update completed.',
    previousValidEngine,
    candidateEngine,
    activeEngine,
    formatRegistry: options.formatRegistry ?? candidateEngine?.formatRegistry ?? previousValidEngine?.formatRegistry ?? sampleShowdownEngineFormatRegistry,
    safetyPolicy: showdownEngineUpdateSafetyPolicy,
    storageBoundary: showdownEngineStorageBoundary,
    events: createEvents(updateId, status, requestedAt),
    warnings: status === 'warning' ? ['Prepared Engine data is valid, but future implementation should review warnings before promotion.'] : [],
    errors: status === 'failed' ? ['Prepared Engine data was not validated and did not replace the active Engine snapshot.'] : [],
  }
}

export const sampleShowdownEngineUpdateReadModels = {
  current: createShowdownEngineUpdateReadModel({ mode: 'current', updateId: 'showdown-engine-current' }),
  complete: createShowdownEngineUpdateReadModel({ mode: 'complete', updateId: 'showdown-engine-complete' }),
  warning: createShowdownEngineUpdateReadModel({ mode: 'warning', updateId: 'showdown-engine-warning' }),
  failed: createShowdownEngineUpdateReadModel({ mode: 'failed', updateId: 'showdown-engine-failed' }),
  cancelled: createShowdownEngineUpdateReadModel({ mode: 'cancelled', updateId: 'showdown-engine-cancelled' }),
}
