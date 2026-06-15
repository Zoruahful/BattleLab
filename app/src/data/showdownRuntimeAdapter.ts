import type {
  BattleFormat,
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

type MoveSlot = 0 | 1 | 2 | 3

type ShowdownValidatorProblem = string

interface ShowdownTeamValidator {
  validateSet: (set: ShowdownRuntimeSet) => ShowdownValidatorProblem[] | null | undefined
}

interface ShowdownDexApi {
  formats: {
    get: (formatId: string) => unknown
  }
  species: {
    get: (speciesId: string) => {
      id: string
      name: string
      abilities?: Record<string, string>
      exists?: boolean
    }
  }
}

interface ShowdownPackageApi {
  Dex: ShowdownDexApi
  TeamValidator: new (format: unknown) => ShowdownTeamValidator
}

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

export interface ShowdownRuntimeAdapterRunOptions {
  checkedAt?: string
  loadShowdown?: () => Promise<ShowdownPackageApi>
}

const runtimeMetadataAvailable: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'future-child-process',
  contractVersion: 'phase3-showdown-legality-v1',
  showdownVersion: 'pokemon-showdown-package',
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

const getDisplayName = (value: BuildCatalogReference) => value.displayName || value.showdownId || value.catalogKey

const getFormatId = (format: BattleFormat) => {
  if (format === 'custom') return 'gen9doublesou'

  return 'gen9doublesou'
}

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

const loadOfficialPokemonShowdown = async (): Promise<ShowdownPackageApi> => {
  const packageName = 'pokemon-showdown'
  const importedPackage = (await import(/* @vite-ignore */ packageName)) as
    | ShowdownPackageApi
    | { default?: ShowdownPackageApi }
  const showdown =
    'Dex' in importedPackage && 'TeamValidator' in importedPackage
      ? importedPackage
      : importedPackage.default

  if (!showdown?.Dex || !showdown.TeamValidator) {
    throw new Error('pokemon-showdown did not expose Dex and TeamValidator.')
  }

  return showdown
}

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

  let showdown: ShowdownPackageApi
  try {
    showdown = await (options.loadShowdown ?? loadOfficialPokemonShowdown)()
  } catch (error) {
    return createShowdownRuntimeUnavailableResponse(
      request,
      'runtime-start-failed',
      error instanceof Error ? error.message : 'Unknown Pokemon Showdown import failure.',
      checkedAt,
    )
  }

  try {
    const format = showdown.Dex.formats.get(getFormatId(request.format))
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
