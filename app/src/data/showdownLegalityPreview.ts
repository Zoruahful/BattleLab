import type {
  BattleFormat,
  BuildCatalogReference,
  PokemonEditorLegalityReadModel,
  ShowdownLegalityRequest,
} from '../types'
import type {
  ShowdownRuntimeAdapterEvent,
  ShowdownRuntimeAdapterFieldEvidence,
  ShowdownRuntimeAdapterResponse,
  ShowdownRuntimeAdapterSafetyPolicy,
  ShowdownRuntimeUnavailableResult,
} from '../types/showdownRuntime'
import { createPokemonEditorShowdownLegalityRequest } from './showdownLegalityRuntimeProof'
import { createShowdownPokemonEditorLegalityReadModel } from './showdownPokemonEditorLegalityAdapter'

type MoveSlot = 0 | 1 | 2 | 3

export type PokemonEditorLegalityPreviewInput = {
  format?: BattleFormat
  species: BuildCatalogReference | null
  ability?: BuildCatalogReference | null
  previewAbilityIds?: string[]
  item?: BuildCatalogReference | null
  teraType?: BuildCatalogReference | null
  moves: [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ]
  previewLearnsetMoveIds?: string[]
}

const safetyPolicy: ShowdownRuntimeAdapterSafetyPolicy = {
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
  allowCatalogOnlyFinalLegality: false,
  allowSimulationExecution: false,
  allowPersistentStorage: false,
  allowNetworkFetch: false,
  preserveRuntimeUnavailableFallback: true,
}

const optionId = (option: BuildCatalogReference, prefix: string) =>
  option.showdownId ?? option.catalogKey.replace(new RegExp(`^${prefix}-`), '')

const previewSignalMessage = (
  option: BuildCatalogReference,
  previewIds: Set<string>,
  prefix: string,
  matchText: string,
  mismatchText: string,
  unavailableText: string,
) => {
  if (!previewIds.size) {
    return unavailableText
  }

  return previewIds.has(optionId(option, prefix)) ? matchText : mismatchText
}

const createEvent = (
  request: ShowdownLegalityRequest,
  kind: ShowdownRuntimeAdapterEvent['kind'],
  status: ShowdownRuntimeAdapterEvent['status'],
  message: string,
): ShowdownRuntimeAdapterEvent => ({
  eventId: `${request.requestId}-${kind}`,
  requestId: request.requestId,
  kind,
  status,
  emittedAt: request.requestedAt,
  message,
})

const createCatalogEvidence = (
  field: ShowdownRuntimeAdapterFieldEvidence['field'],
  value: BuildCatalogReference,
  showdownDetail: string,
  slotIndex?: MoveSlot,
  catalogHintDisagrees = false,
): ShowdownRuntimeAdapterFieldEvidence => ({
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  value,
  status: 'unknown',
  source: 'catalog-preview',
  showdownDetail,
  ...(catalogHintDisagrees ? { catalogHintDisagrees } : {}),
})

const createCatalogPreviewEvidence = (
  input: PokemonEditorLegalityPreviewInput,
): ShowdownRuntimeAdapterFieldEvidence[] => {
  const previewLearnsetMoveIds = new Set(input.previewLearnsetMoveIds ?? [])
  const previewAbilityIds = new Set(input.previewAbilityIds ?? [])
  const evidence: ShowdownRuntimeAdapterFieldEvidence[] = []

  input.moves.forEach((move, index) => {
    if (!move) return

    const message = previewSignalMessage(
      move,
      previewLearnsetMoveIds,
      'move',
      'Appears in the local learnset preview. Pokemon Showdown must confirm final legality.',
      'Not found in the local learnset preview. Pokemon Showdown must confirm final legality.',
      'Local learnset preview is unavailable; Pokemon Showdown must confirm final legality.',
    )

    evidence.push(createCatalogEvidence('move', move, message, index as MoveSlot, message.startsWith('Not found')))
  })

  if (input.ability) {
    const message = previewSignalMessage(
      input.ability,
      previewAbilityIds,
      'ability',
      'Appears in catalog ability list. Pokemon Showdown must confirm final legality.',
      'Not found in catalog ability list. Pokemon Showdown must confirm final legality.',
      'Catalog ability list is unavailable for this Pokemon/form. Pokemon Showdown must confirm final legality.',
    )

    evidence.push(createCatalogEvidence('ability', input.ability, message, undefined, message.startsWith('Not found')))
  }

  if (input.item) {
    evidence.push(
      createCatalogEvidence(
        'item',
        input.item,
        'Item is selectable in the catalog; this preview does not treat item selection as a legality-defining check.',
      ),
    )
  }

  if (input.teraType) {
    evidence.push(
      createCatalogEvidence(
        'teraType',
        input.teraType,
        'Tera type remains catalog-selectable; format legality is Pokemon Showdown-owned.',
      ),
    )
  }

  return evidence
}

const createRuntimeUnavailableResult = (): ShowdownRuntimeUnavailableResult => ({
  status: 'runtime-unavailable',
  reason: 'runtime-not-implemented',
  runtimeMetadata: {
    boundaryKind: 'runtime-contract-only',
    contractVersion: 'phase3-showdown-legality-v1',
    runtimeUnavailableReason: 'runtime-not-implemented',
  },
  messages: [
    {
      code: 'showdown-runtime-unavailable',
      severity: 'warning',
      message: 'Pokemon Showdown legality runtime is not wired yet. Local signals are preview-only.',
      showdownDetail: 'Wire a Showdown runtime adapter before marking legality as final.',
    },
  ],
})

const createRuntimeUnavailableAdapterResponse = (
  input: PokemonEditorLegalityPreviewInput,
): ShowdownRuntimeAdapterResponse => {
  const request = createPokemonEditorShowdownLegalityRequest({
    ...input,
    format: input.format ?? 'custom',
    requestedAt: new Date().toISOString(),
  })
  const unavailableResult = createRuntimeUnavailableResult()

  return {
    requestId: request.requestId,
    status: 'runtime-unavailable',
    checkedAt: request.requestedAt,
    runtimeMetadata: unavailableResult.runtimeMetadata,
    unavailableResult,
    fieldEvidence: createCatalogPreviewEvidence(input),
    events: [
      createEvent(request, 'adapter-planned', 'not-started', 'Pokemon Editor legality preview prepared a safe adapter fallback.'),
      createEvent(
        request,
        'runtime-unavailable',
        'runtime-unavailable',
        'Pokemon Showdown runtime is unavailable in this UI surface; local catalog hints remain non-authoritative.',
      ),
    ],
    messages: unavailableResult.messages,
    safetyPolicy,
  }
}

export function createPokemonEditorLegalityPreviewReadModel(
  input: PokemonEditorLegalityPreviewInput,
): PokemonEditorLegalityReadModel {
  const response = createRuntimeUnavailableAdapterResponse(input)
  const adapterResult = createShowdownPokemonEditorLegalityReadModel({
    response,
    format: input.format ?? 'custom',
    species: input.species,
  })

  return {
    ...adapterResult.readModel,
    notes: [
      ...adapterResult.readModel.notes,
      'Pokemon Editor preview is currently using the runtime-unavailable adapter bridge.',
    ],
  }
}
