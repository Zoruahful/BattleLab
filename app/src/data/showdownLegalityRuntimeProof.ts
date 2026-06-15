import type {
  BattleFormat,
  BuildCatalogReference,
  ShowdownLegalityFieldRequest,
  ShowdownLegalityFieldResult,
  ShowdownLegalityMessage,
  ShowdownLegalityRequest,
  ShowdownLegalityResult,
  ShowdownLegalityRuntimeMetadata,
} from '../types'

type MoveSlot = 0 | 1 | 2 | 3

export interface PokemonEditorShowdownLegalityRuntimeProofInput {
  format?: BattleFormat
  species: BuildCatalogReference | null
  ability?: BuildCatalogReference | null
  item?: BuildCatalogReference | null
  nature?: BuildCatalogReference | null
  teraType?: BuildCatalogReference | null
  moves: [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ]
  previewLearnsetMoveIds?: string[]
  previewAbilityIds?: string[]
  requestedAt?: string
}

const runtimeMetadata: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'runtime-contract-only',
  contractVersion: 'phase3-showdown-legality-v1',
  runtimeUnavailableReason: 'runtime-not-implemented',
}

const source = {
  catalogRole: 'enrichment-only' as const,
  showdownAuthority: 'pokemon-showdown-legality-source-of-truth' as const,
}

const optionId = (option: BuildCatalogReference, prefix: string) =>
  option.showdownId ?? option.catalogKey.replace(new RegExp(`^${prefix}-`), '')

const previewSignalMessage = (
  option: BuildCatalogReference | null,
  previewIds: Set<string>,
  prefix: string,
  matchText: string,
  mismatchText: string,
  unavailableText: string,
) => {
  if (!option) return 'No value selected.'

  if (!previewIds.size) {
    return unavailableText
  }

  return previewIds.has(optionId(option, prefix)) ? matchText : mismatchText
}

const createMessage = (
  code: string,
  field: ShowdownLegalityFieldRequest['field'],
  message: string,
  slotIndex?: MoveSlot,
): ShowdownLegalityMessage => ({
  code,
  severity: 'warning',
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  message,
  showdownDetail: 'Pokemon Showdown runtime is not installed or wired in this browser build.',
})

const createUnavailableFieldResult = (
  fieldRequest: ShowdownLegalityFieldRequest,
  messages: ShowdownLegalityMessage[],
): ShowdownLegalityFieldResult => ({
  requestFieldId: fieldRequest.id,
  field: fieldRequest.field,
  ...(fieldRequest.slotIndex !== undefined ? { slotIndex: fieldRequest.slotIndex } : {}),
  value: fieldRequest.value,
  status: fieldRequest.value ? 'runtime-unavailable' : 'not-checked',
  behavior: fieldRequest.behavior,
  selectable: true,
  legalityDefining: fieldRequest.behavior === 'legality-defining',
  messages,
})

export function createPokemonEditorShowdownLegalityRequest(
  input: PokemonEditorShowdownLegalityRuntimeProofInput,
): ShowdownLegalityRequest {
  const format = input.format ?? 'custom'
  const requestedAt = input.requestedAt ?? new Date().toISOString()
  const moveFields: ShowdownLegalityFieldRequest[] = input.moves.map((move, index) => ({
    id: `move-${index + 1}`,
    field: 'move',
    slotIndex: index as MoveSlot,
    value: move,
    behavior: 'legality-defining',
  }))
  const fields: ShowdownLegalityFieldRequest[] = [
    ...moveFields,
    {
      id: 'ability',
      field: 'ability',
      value: input.ability ?? null,
      behavior: 'legality-defining',
    },
    {
      id: 'item',
      field: 'item',
      value: input.item ?? null,
      behavior: 'not-legality-defining',
    },
    {
      id: 'tera-type',
      field: 'teraType',
      value: input.teraType ?? null,
      behavior: 'catalog-selectable',
    },
  ]

  return {
    requestId: `pokemon-editor-legality-${requestedAt}`,
    requestedAt,
    kind: 'pokemon-build',
    format,
    build: {
      format,
      species: input.species,
      ability: input.ability ?? null,
      item: input.item ?? null,
      nature: input.nature ?? null,
      teraType: input.teraType ?? null,
      moves: input.moves,
    },
    fields,
    source,
  }
}

export function runPokemonEditorShowdownLegalityRuntimeProof(
  input: PokemonEditorShowdownLegalityRuntimeProofInput,
): ShowdownLegalityResult {
  const request = createPokemonEditorShowdownLegalityRequest(input)
  const previewLearnsetMoveIds = new Set(input.previewLearnsetMoveIds ?? [])
  const previewAbilityIds = new Set(input.previewAbilityIds ?? [])

  const fields = request.fields.map((fieldRequest) => {
    const messages: ShowdownLegalityMessage[] = []

    if (fieldRequest.field === 'move') {
      messages.push(
        createMessage(
          'showdown-runtime-unavailable-move',
          'move',
          previewSignalMessage(
            fieldRequest.value,
            previewLearnsetMoveIds,
            'move',
            'Local preview lists this move for the selected Pokemon, but Pokemon Showdown must confirm final legality.',
            'Local preview does not list this move for the selected Pokemon; Pokemon Showdown must confirm final legality.',
            'Local learnset preview is unavailable; Pokemon Showdown must confirm final legality.',
          ),
          fieldRequest.slotIndex,
        ),
      )
    } else if (fieldRequest.field === 'ability') {
      messages.push(
        createMessage(
          'showdown-runtime-unavailable-ability',
          'ability',
          previewSignalMessage(
            fieldRequest.value,
            previewAbilityIds,
            'ability',
            'Catalog ability metadata lists this ability for the selected Pokemon/form, but Pokemon Showdown must confirm final legality.',
            'Catalog ability metadata does not list this ability for the selected Pokemon/form; Pokemon Showdown must confirm final legality.',
            'Catalog ability metadata is unavailable; Pokemon Showdown must confirm final legality.',
          ),
        ),
      )
    } else if (fieldRequest.field === 'item') {
      messages.push(
        createMessage(
          'showdown-runtime-unavailable-item',
          'item',
          fieldRequest.value
            ? 'Item is selectable in the catalog; this proof does not treat item selection as a legality-defining check.'
            : 'No held item selected.',
        ),
      )
    } else if (fieldRequest.field === 'teraType') {
      messages.push(
        createMessage(
          'showdown-runtime-unavailable-tera-type',
          'teraType',
          fieldRequest.value
            ? 'Tera type remains catalog-selectable; format legality is Pokemon Showdown-owned.'
            : 'No Tera type selected.',
        ),
      )
    }

    return createUnavailableFieldResult(fieldRequest, messages)
  })

  return {
    requestId: request.requestId,
    status: 'runtime-unavailable',
    checkedAt: request.requestedAt,
    runtimeMetadata,
    fields,
    messages: [
      {
        code: 'showdown-runtime-unavailable',
        severity: 'warning',
        message:
          'Pokemon Showdown legality runtime is not installed or wired yet. Local catalog signals are non-authoritative.',
        showdownDetail: 'Install and wire a Showdown runtime boundary before marking legality as final.',
      },
    ],
  }
}
