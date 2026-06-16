import type {
  BuildCatalogReference,
  ShowdownLegalityFieldResult,
  ShowdownLegalityMessage,
  ShowdownLegalityResult,
  ShowdownLegalityRuntimeMetadata,
  ShowdownLegalityStatus,
} from '../types'
import type {
  ShowdownRuntimeAdapterEvent,
  ShowdownRuntimeAdapterFieldEvidence,
  ShowdownRuntimeAdapterRequest,
  ShowdownRuntimeAdapterResponse,
  ShowdownRuntimeUnavailableResult,
} from '../types/showdownRuntime'
import {
  createShowdownLegalityFormatHandoff,
  type ShowdownLegalityFormatHandoff,
} from './showdownLegalityFormatHandoff'

type MoveSlot = 0 | 1 | 2 | 3

type ShowdownValidatorProblem = string

interface ShowdownTeamValidator {
  validateSet: (set: ShowdownRuntimeSet) => ShowdownValidatorProblem[] | null | undefined
}

interface ShowdownDexApi {
  formats: {
    get: (formatId: string) => unknown
    load?: () => unknown
  }
  species: {
    get: (speciesId: string) => {
      id: string
      name: string
      abilities?: Record<string, string>
      exists?: boolean
    }
  }
  dataCache?: ShowdownDexDataCache
  modsLoaded?: boolean
  gen?: number
  data?: ShowdownDexDataCache
  dexes?: Record<string, ShowdownDexApi>
  Format?: new (format: ShowdownFormatRecord) => ShowdownFormatRecord
  toID?: (value: string) => string
  includeMods?: () => ShowdownDexApi
  includeFormats?: () => ShowdownDexApi
  includeData?: () => ShowdownDexApi
  loadData?: () => ShowdownDexDataCache
  loadDataFile?: (_basePath: string, dataType: ShowdownDexDataType | 'Aliases') => unknown
}

interface ShowdownPackageApi {
  Dex: ShowdownDexApi
  TeamValidator: new (format: unknown) => ShowdownTeamValidator
}

interface ShowdownBrowserDataSpecies {
  abilities?: Record<string, string>
  baseSpecies?: string
  exists?: boolean
  name?: string
}

interface ShowdownBrowserDataLearnset {
  learnset?: Record<string, string[]>
}

interface ShowdownBrowserDataApi {
  kind: 'browser-data'
  aliases: Record<string, string>
  learnsets: Record<string, ShowdownBrowserDataLearnset>
  pokedex: Record<string, ShowdownBrowserDataSpecies>
}

type ShowdownRuntimeApi = ShowdownPackageApi | ShowdownBrowserDataApi
type ShowdownRuntimeAdapterLoaderKind = 'auto' | 'package' | 'browser-data'

interface ShowdownRuntimeSet {
  species: string
  name: string
  ability: string
  item: string
  moves: string[]
  nature: string
  evs: Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>
  ivs: Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>
  level: number
}

type ShowdownDexDataType =
  | 'Abilities'
  | 'Rulesets'
  | 'FormatsData'
  | 'Items'
  | 'Learnsets'
  | 'Moves'
  | 'Natures'
  | 'Pokedex'
  | 'Scripts'
  | 'Conditions'
  | 'TypeChart'
  | 'PokemonGoData'

type ShowdownDexDataCache = Record<ShowdownDexDataType | 'Aliases', Record<string, unknown>>

interface ShowdownFormatRecord {
  id?: string
  name?: string
  section?: string
  column?: number
  mod?: string
  effectType?: string
  baseRuleset?: string[]
  ruleset?: string[]
  challengeShow?: boolean
  searchShow?: boolean
  tournamentShow?: boolean
  bestOfDefault?: boolean
  teraPreviewDefault?: boolean
}

export interface ShowdownRuntimeAdapterRunOptions {
  checkedAt?: string
  loadShowdown?: () => Promise<ShowdownPackageApi>
  loadBrowserData?: () => Promise<ShowdownBrowserDataApi>
  runtimeLoader?: ShowdownRuntimeAdapterLoaderKind
  formatHandoff?: ShowdownLegalityFormatHandoff
  loadFormatHandoff?: () => Promise<ShowdownLegalityFormatHandoff>
}

const runtimeMetadataAvailable: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'future-child-process',
  contractVersion: 'phase3-showdown-legality-v1',
  showdownVersion: 'pokemon-showdown-package',
}

const browserDataRuntimeMetadata: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'future-child-process',
  contractVersion: 'phase3-showdown-legality-v1',
  showdownVersion: 'pokemon-showdown-browser-data',
}

const createRuntimeMetadataUnavailable = (
  reason: ShowdownRuntimeUnavailableResult['reason'],
): ShowdownLegalityRuntimeMetadata => ({
  boundaryKind: 'runtime-contract-only',
  contractVersion: 'phase3-showdown-legality-v1',
  runtimeUnavailableReason: reason,
})

const toShowdownId = (value: BuildCatalogReference) =>
  (value.showdownId ?? value.catalogKey).toLowerCase().replace(/[^a-z0-9]+/g, '')

const toShowdownIdFromName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const getDisplayName = (value: BuildCatalogReference) => value.displayName || value.showdownId || value.catalogKey

const createEvent = (
  request: ShowdownRuntimeAdapterRequest,
  kind: ShowdownRuntimeAdapterEvent['kind'],
  status: ShowdownRuntimeAdapterEvent['status'],
  message: string,
  emittedAt: string,
): ShowdownRuntimeAdapterEvent => ({
  eventId: `${request.requestId}-${kind}-${emittedAt}`,
  requestId: request.requestId,
  kind,
  status,
  emittedAt,
  message,
})

const createMessage = (
  code: string,
  severity: ShowdownLegalityMessage['severity'],
  message: string,
  field?: ShowdownLegalityMessage['field'],
  slotIndex?: ShowdownLegalityMessage['slotIndex'],
  showdownDetail?: string,
): ShowdownLegalityMessage => ({
  code,
  severity,
  ...(field ? { field } : {}),
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  message,
  ...(showdownDetail ? { showdownDetail } : {}),
})

const createSmokeSet = (
  species: BuildCatalogReference,
  abilityName: string,
  moveName: string,
): ShowdownRuntimeSet => ({
  species: getDisplayName(species),
  name: getDisplayName(species),
  ability: abilityName,
  item: 'Leftovers',
  moves: [moveName],
  nature: 'Adamant',
  evs: { hp: 1, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  level: 100,
})

const getDefaultAbility = (showdown: ShowdownPackageApi, species: BuildCatalogReference) => {
  const showdownSpecies = showdown.Dex.species.get(toShowdownId(species))
  const ability = showdownSpecies.abilities?.['0'] ?? Object.values(showdownSpecies.abilities ?? {})[0]

  if (!ability) {
    throw new Error(`Pokemon Showdown did not provide a default ability for ${getDisplayName(species)}.`)
  }

  return ability
}

const getShowdownProblems = (validator: ShowdownTeamValidator, set: ShowdownRuntimeSet) =>
  validator.validateSet(set) ?? []

const problemsToDetail = (problems: ShowdownValidatorProblem[]) =>
  problems.length ? problems.join(' ') : 'Pokemon Showdown accepted this legality smoke check.'

const createFieldEvidence = (
  field: ShowdownRuntimeAdapterFieldEvidence['field'],
  value: BuildCatalogReference,
  status: Extract<ShowdownLegalityStatus, 'legal' | 'illegal'>,
  showdownDetail: string,
  slotIndex?: MoveSlot,
): ShowdownRuntimeAdapterFieldEvidence => ({
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  value,
  status,
  source: 'pokemon-showdown',
  showdownDetail,
})

const createFieldResult = (
  requestFieldId: string,
  field: ShowdownLegalityFieldResult['field'],
  value: BuildCatalogReference,
  status: Extract<ShowdownLegalityStatus, 'legal' | 'illegal'>,
  message: ShowdownLegalityMessage,
  slotIndex?: MoveSlot,
): ShowdownLegalityFieldResult => ({
  requestFieldId,
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  value,
  status,
  behavior: 'legality-defining',
  selectable: true,
  legalityDefining: true,
  messages: [message],
})

const toInstalledShowdownData = <T extends object>(
  module: T,
  exportName: keyof T,
): Record<string, unknown> => {
  const value = module as Record<string, unknown>
  const defaultValue = value.default as Record<string, unknown> | undefined
  const commonJsValue = value['module.exports'] as Record<string, unknown> | undefined

  return (
    (value[exportName as string] as Record<string, unknown> | undefined) ??
    (defaultValue?.[exportName as string] as Record<string, unknown> | undefined) ??
    (commonJsValue?.[exportName as string] as Record<string, unknown> | undefined) ??
    {}
  )
}

const unwrapShowdownDataModule = <T extends object>(module: unknown, exportName: string): T => {
  const value = module as Record<string, unknown>
  const defaultValue = value.default as Record<string, unknown> | undefined
  const commonJsValue = value['module.exports'] as Record<string, unknown> | undefined
  const named = value[exportName] ?? defaultValue?.[exportName] ?? commonJsValue?.[exportName]

  if (!named) {
    throw new Error(`pokemon-showdown data module did not expose ${exportName}.`)
  }

  return named as T
}

export const loadBrowserPokemonShowdownData = async (): Promise<ShowdownBrowserDataApi> => {
  const [aliasesModule, learnsetsModule, pokedexModule] = await Promise.all([
    import('pokemon-showdown/dist/data/aliases.js'),
    import('pokemon-showdown/dist/data/learnsets.js'),
    import('pokemon-showdown/dist/data/pokedex.js'),
  ])

  return {
    kind: 'browser-data',
    aliases: unwrapShowdownDataModule<Record<string, string>>(aliasesModule, 'Aliases'),
    learnsets: unwrapShowdownDataModule<Record<string, ShowdownBrowserDataLearnset>>(learnsetsModule, 'Learnsets'),
    pokedex: unwrapShowdownDataModule<Record<string, ShowdownBrowserDataSpecies>>(pokedexModule, 'Pokedex'),
  }
}

const hydrateBrowserShowdownDex = (showdown: ShowdownPackageApi, formats: ShowdownFormatRecord[], dataCache: ShowdownDexDataCache) => {
  const dex = showdown.Dex
  const formatConstructor = dex.Format
  const toFormatId = dex.toID ?? ((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ''))

  dex.dataCache = dataCache
  dex.modsLoaded = true
  dex.gen = 9
  dex.loadData = () => dataCache
  dex.includeData = () => dex
  dex.includeMods = () => dex
  dex.loadDataFile = (_basePath, dataType) => dataCache[dataType] ?? {}

  if (dex.dexes) {
    dex.dexes.base = dex
    dex.dexes.gen9 = dex
  }

  const hydratedFormats = formats
    .filter((format) => format.name)
    .map((format) => {
      const id = toFormatId(format.name ?? '')
      const formatRecord: ShowdownFormatRecord = {
        ...format,
        id,
        effectType: 'Format',
        baseRuleset: format.ruleset ? [...format.ruleset] : [],
        challengeShow: format.challengeShow ?? true,
        searchShow: format.searchShow ?? true,
        tournamentShow: format.tournamentShow ?? true,
        bestOfDefault: format.bestOfDefault ?? false,
        teraPreviewDefault: format.teraPreviewDefault ?? false,
        mod: format.mod ?? 'gen9',
      }

      return formatConstructor ? new formatConstructor(formatRecord) : formatRecord
    })

  const rulesetCache = new Map<string, unknown>()
  hydratedFormats.forEach((format) => {
    if (format.id) {
      rulesetCache.set(format.id, format)
      dataCache.Rulesets[format.id] = { ...format, ruleTable: null }
    }
  })

  Object.assign(dex.formats, {
    formatsListCache: hydratedFormats,
    rulesetCache,
    load: () => dex.formats,
  })
  dex.includeFormats = () => {
    dex.formats.load?.()
    return dex
  }
}

const loadOfficialPokemonShowdown = async (): Promise<ShowdownPackageApi> => {
  const dexModuleName = 'pokemon-showdown/dist/sim/dex'
  const teamValidatorModuleName = 'pokemon-showdown/dist/sim/team-validator'
  const formatsModuleName = 'pokemon-showdown/dist/config/formats.js'
  const abilitiesModuleName = 'pokemon-showdown/dist/data/abilities.js'
  const aliasesModuleName = 'pokemon-showdown/dist/data/aliases.js'
  const rulesetsModuleName = 'pokemon-showdown/dist/data/rulesets.js'
  const formatsDataModuleName = 'pokemon-showdown/dist/data/formats-data.js'
  const itemsModuleName = 'pokemon-showdown/dist/data/items.js'
  const learnsetsModuleName = 'pokemon-showdown/dist/data/learnsets.js'
  const movesModuleName = 'pokemon-showdown/dist/data/moves.js'
  const naturesModuleName = 'pokemon-showdown/dist/data/natures.js'
  const pokedexModuleName = 'pokemon-showdown/dist/data/pokedex.js'
  const scriptsModuleName = 'pokemon-showdown/dist/data/scripts.js'
  const conditionsModuleName = 'pokemon-showdown/dist/data/conditions.js'
  const typeChartModuleName = 'pokemon-showdown/dist/data/typechart.js'
  const pokemonGoModuleName = 'pokemon-showdown/dist/data/pokemongo.js'
  const [
    dexModule,
    teamValidatorModule,
    formatsModule,
    abilitiesModule,
    aliasesModule,
    rulesetsModule,
    formatsDataModule,
    itemsModule,
    learnsetsModule,
    movesModule,
    naturesModule,
    pokedexModule,
    scriptsModule,
    conditionsModule,
    typeChartModule,
    pokemonGoModule,
  ] = ((await Promise.all([
    import(/* @vite-ignore */ dexModuleName),
    import(/* @vite-ignore */ teamValidatorModuleName),
    import(/* @vite-ignore */ formatsModuleName),
    import(/* @vite-ignore */ abilitiesModuleName),
    import(/* @vite-ignore */ aliasesModuleName),
    import(/* @vite-ignore */ rulesetsModuleName),
    import(/* @vite-ignore */ formatsDataModuleName),
    import(/* @vite-ignore */ itemsModuleName),
    import(/* @vite-ignore */ learnsetsModuleName),
    import(/* @vite-ignore */ movesModuleName),
    import(/* @vite-ignore */ naturesModuleName),
    import(/* @vite-ignore */ pokedexModuleName),
    import(/* @vite-ignore */ scriptsModuleName),
    import(/* @vite-ignore */ conditionsModuleName),
    import(/* @vite-ignore */ typeChartModuleName),
    import(/* @vite-ignore */ pokemonGoModuleName),
  ])) as unknown as [
    { Dex?: ShowdownDexApi },
    { TeamValidator?: ShowdownPackageApi['TeamValidator'] },
    { Formats?: ShowdownFormatRecord[] },
    { Abilities?: Record<string, unknown> },
    { Aliases?: Record<string, unknown> },
    { Rulesets?: Record<string, unknown> },
    { FormatsData?: Record<string, unknown> },
    { Items?: Record<string, unknown> },
    { Learnsets?: Record<string, unknown> },
    { Moves?: Record<string, unknown> },
    { Natures?: Record<string, unknown> },
    { Pokedex?: Record<string, unknown> },
    { Scripts?: Record<string, unknown> },
    { Conditions?: Record<string, unknown> },
    { TypeChart?: Record<string, unknown> },
    { PokemonGoData?: Record<string, unknown> },
  ])
  const showdown =
    dexModule.Dex && teamValidatorModule.TeamValidator
      ? { Dex: dexModule.Dex, TeamValidator: teamValidatorModule.TeamValidator }
      : undefined

  if (!showdown?.Dex || !showdown.TeamValidator) {
    throw new Error('pokemon-showdown did not expose Dex and TeamValidator.')
  }

  hydrateBrowserShowdownDex(showdown, formatsModule.Formats ?? [], {
    Abilities: toInstalledShowdownData(abilitiesModule, 'Abilities'),
    Aliases: toInstalledShowdownData(aliasesModule, 'Aliases'),
    Rulesets: toInstalledShowdownData(rulesetsModule, 'Rulesets'),
    FormatsData: toInstalledShowdownData(formatsDataModule, 'FormatsData'),
    Items: toInstalledShowdownData(itemsModule, 'Items'),
    Learnsets: toInstalledShowdownData(learnsetsModule, 'Learnsets'),
    Moves: toInstalledShowdownData(movesModule, 'Moves'),
    Natures: toInstalledShowdownData(naturesModule, 'Natures'),
    Pokedex: toInstalledShowdownData(pokedexModule, 'Pokedex'),
    Scripts: toInstalledShowdownData(scriptsModule, 'Scripts'),
    Conditions: toInstalledShowdownData(conditionsModule, 'Conditions'),
    TypeChart: toInstalledShowdownData(typeChartModule, 'TypeChart'),
    PokemonGoData: toInstalledShowdownData(pokemonGoModule, 'PokemonGoData'),
  })

  return showdown
}

const isBrowserRuntime = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const isBrowserDataRuntime = (showdown: ShowdownRuntimeApi): showdown is ShowdownBrowserDataApi =>
  'kind' in showdown && showdown.kind === 'browser-data'

const loadShowdownRuntime = async (options: ShowdownRuntimeAdapterRunOptions): Promise<ShowdownRuntimeApi> => {
  if (options.loadShowdown) {
    return options.loadShowdown()
  }

  const loaderKind = options.runtimeLoader ?? 'auto'

  if (loaderKind === 'browser-data' || (loaderKind === 'auto' && isBrowserRuntime())) {
    return (options.loadBrowserData ?? loadBrowserPokemonShowdownData)()
  }

  return loadOfficialPokemonShowdown()
}

const canAttemptBrowserRuntimeForMappedFormat = (
  request: ShowdownRuntimeAdapterRequest,
  handoff: ShowdownLegalityFormatHandoff,
) =>
  request.format === 'vgc-regulation-g' &&
  handoff.mapping.source === 'official-pokemon-showdown' &&
  handoff.mapping.targetShowdownFormatId === 'gen9vgc2025regg'

const resolveBrowserSpeciesId = (showdown: ShowdownBrowserDataApi, species: BuildCatalogReference) => {
  const requestedId = toShowdownId(species)
  const aliasId = showdown.aliases[requestedId] ? toShowdownIdFromName(showdown.aliases[requestedId]) : requestedId

  if (!showdown.pokedex[aliasId]) {
    throw new Error(`Pokemon Showdown Pokedex data did not include ${getDisplayName(species)}.`)
  }

  return aliasId
}

const getBrowserDefaultAbility = (showdown: ShowdownBrowserDataApi, speciesId: string, speciesName: string) => {
  const species = showdown.pokedex[speciesId]
  const ability = species?.abilities?.['0'] ?? Object.values(species?.abilities ?? {})[0]

  if (!ability) {
    throw new Error(`Pokemon Showdown Pokedex data did not provide a default ability for ${speciesName}.`)
  }

  return ability
}

const getBrowserLearnset = (showdown: ShowdownBrowserDataApi, speciesId: string) => {
  const species = showdown.pokedex[speciesId]
  const baseSpeciesId = species?.baseSpecies ? toShowdownIdFromName(species.baseSpecies) : undefined

  return showdown.learnsets[speciesId]?.learnset ?? (baseSpeciesId ? showdown.learnsets[baseSpeciesId]?.learnset : undefined)
}

const runBrowserDataShowdownChecks = (
  request: ShowdownRuntimeAdapterRequest,
  showdown: ShowdownBrowserDataApi,
  checkedAt: string,
): ShowdownRuntimeAdapterResponse => {
  const fieldEvidence: ShowdownRuntimeAdapterFieldEvidence[] = []
  const fields: ShowdownLegalityFieldResult[] = []
  const messages: ShowdownLegalityMessage[] = []
  const species = request.moveCheck?.species ?? request.abilityCheck?.species ?? request.legalityRequest.build.species

  if (!species) {
    throw new Error('Showdown runtime adapter request did not include a Pokemon species.')
  }

  const speciesId = resolveBrowserSpeciesId(showdown, species)
  const learnset = getBrowserLearnset(showdown, speciesId)
  const defaultAbility = getBrowserDefaultAbility(showdown, speciesId, getDisplayName(species))

  request.moveCheck?.candidateMoves.forEach((move, index) => {
    const slotIndex = index as MoveSlot
    const moveId = toShowdownId(move)
    const status = learnset?.[moveId] ? 'legal' : 'illegal'
    const detail =
      status === 'legal'
        ? `Pokemon Showdown installed learnset data lists ${getDisplayName(move)} for ${getDisplayName(species)}.`
        : `Pokemon Showdown installed learnset data does not list ${getDisplayName(move)} for ${getDisplayName(species)}.`
    const message = createMessage(
      status === 'legal' ? 'showdown-move-legal' : 'showdown-move-illegal',
      status === 'legal' ? 'info' : 'error',
      status === 'legal'
        ? `Pokemon Showdown allows ${getDisplayName(species)} to learn ${getDisplayName(move)}.`
        : `Pokemon Showdown rejects ${getDisplayName(move)} for ${getDisplayName(species)}.`,
      'move',
      slotIndex,
      detail,
    )

    fieldEvidence.push(createFieldEvidence('move', move, status, detail, slotIndex))
    fields.push(createFieldResult(`move-${index + 1}`, 'move', move, status, message, slotIndex))
    messages.push(message)
  })

  request.abilityCheck?.candidateAbilities.forEach((ability) => {
    const abilityId = toShowdownId(ability)
    const allowedAbilityIds = Object.values(showdown.pokedex[speciesId]?.abilities ?? {}).map(toShowdownIdFromName)
    const status = allowedAbilityIds.includes(abilityId) ? 'legal' : 'illegal'
    const detail =
      status === 'legal'
        ? `Pokemon Showdown installed Pokedex data lists ${getDisplayName(ability)} for ${getDisplayName(species)}.`
        : `Pokemon Showdown installed Pokedex data does not list ${getDisplayName(ability)} for ${getDisplayName(species)}.`
    const message = createMessage(
      status === 'legal' ? 'showdown-ability-legal' : 'showdown-ability-illegal',
      status === 'legal' ? 'info' : 'error',
      status === 'legal'
        ? `Pokemon Showdown allows ${getDisplayName(species)} to use ${getDisplayName(ability)}.`
        : `Pokemon Showdown rejects ${getDisplayName(ability)} for ${getDisplayName(species)}.`,
      'ability',
      undefined,
      detail,
    )

    fieldEvidence.push(createFieldEvidence('ability', ability, status, detail))
    fields.push(createFieldResult('ability', 'ability', ability, status, message))
    messages.push(message)
  })

  const legalityResult: ShowdownLegalityResult = {
    requestId: request.requestId,
    status: fields.some((field) => field.status === 'illegal') ? 'illegal' : 'legal',
    checkedAt,
    runtimeMetadata: browserDataRuntimeMetadata,
    fields,
    messages,
  }

  return {
    requestId: request.requestId,
    status: 'complete',
    checkedAt,
    runtimeMetadata: browserDataRuntimeMetadata,
    legalityResult,
    fieldEvidence,
    events: [
      createEvent(request, 'adapter-started', 'starting', 'Showdown runtime adapter smoke proof started.', checkedAt),
      createEvent(
        request,
        'runtime-available',
        'available',
        `Pokemon Showdown browser-safe data loaded for ${defaultAbility} fallback checks.`,
        checkedAt,
      ),
      createEvent(request, 'check-complete', 'complete', 'Pokemon Showdown move and ability checks completed.', checkedAt),
    ],
    messages,
    safetyPolicy: request.safetyPolicy,
  }
}

const createFormatHandoffUnavailableResponse = (
  request: ShowdownRuntimeAdapterRequest,
  handoff: ShowdownLegalityFormatHandoff,
  checkedAt: string,
) =>
  createShowdownRuntimeUnavailableResponse(
    request,
    handoff.runtimeFallback?.reason === 'unsupported-format' ? 'unsupported-format' : 'runtime-start-failed',
    handoff.runtimeFallback?.message ??
      `${handoff.mapping.displayName} is not available as an executable Pokemon Showdown format for this adapter.`,
    checkedAt,
  )

export function createShowdownRuntimeUnavailableResponse(
  request: ShowdownRuntimeAdapterRequest,
  reason: ShowdownRuntimeUnavailableResult['reason'] = 'runtime-start-failed',
  detail = 'Pokemon Showdown runtime could not be loaded for the smoke proof.',
  checkedAt = new Date().toISOString(),
): ShowdownRuntimeAdapterResponse {
  const runtimeMetadata = createRuntimeMetadataUnavailable(reason)
  const message = createMessage(
    'showdown-runtime-unavailable',
    'warning',
    'Pokemon Showdown runtime is unavailable; legality remains unknown and current UI behavior should be preserved.',
    undefined,
    undefined,
    detail,
  )
  const unavailableResult: ShowdownRuntimeUnavailableResult = {
    status: 'runtime-unavailable',
    reason,
    runtimeMetadata,
    messages: [message],
  }

  return {
    requestId: request.requestId,
    status: 'runtime-unavailable',
    checkedAt,
    runtimeMetadata,
    unavailableResult,
    fieldEvidence: [],
    events: [
      createEvent(request, 'adapter-started', 'starting', 'Showdown runtime adapter smoke proof started.', checkedAt),
      createEvent(request, 'runtime-unavailable', 'runtime-unavailable', detail, checkedAt),
    ],
    messages: [message],
    safetyPolicy: request.safetyPolicy,
  }
}

export async function runShowdownRuntimeAdapter(
  request: ShowdownRuntimeAdapterRequest,
  options: ShowdownRuntimeAdapterRunOptions = {},
): Promise<ShowdownRuntimeAdapterResponse> {
  const checkedAt = options.checkedAt ?? new Date().toISOString()

  let formatHandoff: ShowdownLegalityFormatHandoff
  try {
    formatHandoff =
      options.formatHandoff ??
      (await (options.loadFormatHandoff ?? (() => createShowdownLegalityFormatHandoff(request.format)))())
  } catch (error) {
    return createShowdownRuntimeUnavailableResponse(
      request,
      'runtime-start-failed',
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown format handoff failure.',
      checkedAt,
    )
  }

  if (
    formatHandoff.status !== 'official-format-available' &&
    !canAttemptBrowserRuntimeForMappedFormat(request, formatHandoff)
  ) {
    return createFormatHandoffUnavailableResponse(request, formatHandoff, checkedAt)
  }

  let showdown: ShowdownRuntimeApi
  try {
    showdown = await loadShowdownRuntime(options)
  } catch (error) {
    return createShowdownRuntimeUnavailableResponse(
      request,
      'runtime-start-failed',
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown import failure.',
      checkedAt,
    )
  }

  try {
    if (isBrowserDataRuntime(showdown)) {
      return runBrowserDataShowdownChecks(request, showdown, checkedAt)
    }

    const format = showdown.Dex.formats.get(formatHandoff.mapping.targetShowdownFormatId)
    const validator = new showdown.TeamValidator(format)
    const fieldEvidence: ShowdownRuntimeAdapterFieldEvidence[] = []
    const fields: ShowdownLegalityFieldResult[] = []
    const messages: ShowdownLegalityMessage[] = []

    const species = request.moveCheck?.species ?? request.abilityCheck?.species ?? request.legalityRequest.build.species
    if (!species) {
      throw new Error('Showdown runtime adapter request did not include a Pokemon species.')
    }

    const defaultAbility = getDefaultAbility(showdown, species)

    request.moveCheck?.candidateMoves.forEach((move, index) => {
      const slotIndex = index as MoveSlot
      const problems = getShowdownProblems(validator, createSmokeSet(species, defaultAbility, getDisplayName(move)))
      const status = problems.some((problem) => problem.toLowerCase().includes("can't learn")) ? 'illegal' : 'legal'
      const detail = problemsToDetail(problems)
      const message = createMessage(
        status === 'legal' ? 'showdown-move-legal' : 'showdown-move-illegal',
        status === 'legal' ? 'info' : 'error',
        status === 'legal'
          ? `Pokemon Showdown allows ${getDisplayName(species)} to learn ${getDisplayName(move)}.`
          : `Pokemon Showdown rejects ${getDisplayName(move)} for ${getDisplayName(species)}.`,
        'move',
        slotIndex,
        detail,
      )

      fieldEvidence.push(createFieldEvidence('move', move, status, detail, slotIndex))
      fields.push(createFieldResult(`move-${index + 1}`, 'move', move, status, message, slotIndex))
      messages.push(message)
    })

    request.abilityCheck?.candidateAbilities.forEach((ability) => {
      const problems = getShowdownProblems(validator, createSmokeSet(species, getDisplayName(ability), 'Rock Slide'))
      const status = problems.some((problem) => problem.toLowerCase().includes("can't have")) ? 'illegal' : 'legal'
      const detail = problemsToDetail(problems)
      const message = createMessage(
        status === 'legal' ? 'showdown-ability-legal' : 'showdown-ability-illegal',
        status === 'legal' ? 'info' : 'error',
        status === 'legal'
          ? `Pokemon Showdown allows ${getDisplayName(species)} to use ${getDisplayName(ability)}.`
          : `Pokemon Showdown rejects ${getDisplayName(ability)} for ${getDisplayName(species)}.`,
        'ability',
        undefined,
        detail,
      )

      fieldEvidence.push(createFieldEvidence('ability', ability, status, detail))
      fields.push(createFieldResult('ability', 'ability', ability, status, message))
      messages.push(message)
    })

    const legalityResult: ShowdownLegalityResult = {
      requestId: request.requestId,
      status: fields.some((field) => field.status === 'illegal') ? 'illegal' : 'legal',
      checkedAt,
      runtimeMetadata: runtimeMetadataAvailable,
      fields,
      messages,
    }

    return {
      requestId: request.requestId,
      status: 'complete',
      checkedAt,
      runtimeMetadata: runtimeMetadataAvailable,
      legalityResult,
      fieldEvidence,
      events: [
        createEvent(request, 'adapter-started', 'starting', 'Showdown runtime adapter smoke proof started.', checkedAt),
        createEvent(request, 'runtime-available', 'available', 'Pokemon Showdown package loaded for smoke proof.', checkedAt),
        createEvent(request, 'check-complete', 'complete', 'Pokemon Showdown move and ability checks completed.', checkedAt),
      ],
      messages,
      safetyPolicy: request.safetyPolicy,
    }
  } catch (error) {
    return createShowdownRuntimeUnavailableResponse(
      request,
      'runtime-start-failed',
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown runtime check failure.',
      checkedAt,
    )
  }
}
