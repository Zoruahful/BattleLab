import type {
  BuildCatalogReference,
  PokemonEditorLegalityFieldReadModel,
  PokemonEditorLegalityReadModel,
  ShowdownLegalityFieldResult,
  ShowdownLegalityResult,
} from '../types'
import { runPokemonEditorShowdownLegalityRuntimeProof } from './showdownLegalityRuntimeProof'

type MoveSlot = 0 | 1 | 2 | 3

export type PokemonEditorLegalityPreviewInput = {
  format?: 'vgc-regulation-h' | 'vgc-regulation-g' | 'custom'
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

const optionPreview = (option?: BuildCatalogReference | null) =>
  option
    ? {
        catalogKey: option.catalogKey,
        showdownId: option.showdownId,
        displayName: option.displayName,
      }
    : undefined

const fieldLabel = (field: ShowdownLegalityFieldResult) => {
  if (field.field === 'move') return `Move ${(field.slotIndex ?? 0) + 1}`
  if (field.field === 'ability') return 'Ability'
  if (field.field === 'item') return 'Item'
  if (field.field === 'teraType') return 'Tera type'
  if (field.field === 'nature') return 'Nature'
  return 'Species'
}

const fieldOptionKind = (field: ShowdownLegalityFieldResult) => {
  if (field.field === 'teraType') return 'type'
  if (field.field === 'move' || field.field === 'ability' || field.field === 'item' || field.field === 'nature') {
    return field.field
  }
  return undefined
}

const fieldResultToReadModel = (field: ShowdownLegalityFieldResult): PokemonEditorLegalityFieldReadModel => ({
  field: field.field,
  ...(field.slotIndex !== undefined ? { slotIndex: field.slotIndex } : {}),
  status: field.status,
  label: fieldLabel(field),
  message: field.messages.map((message) => message.message).join(' '),
  selectable: field.selectable,
  legalityDefining: field.legalityDefining,
  optionKind: fieldOptionKind(field),
  option: optionPreview(field.value),
})

const runtimeResultToReadModel = (
  input: PokemonEditorLegalityPreviewInput,
  result: ShowdownLegalityResult,
): PokemonEditorLegalityReadModel => ({
  status: result.status,
  format: input.format ?? 'custom',
  species: input.species,
  fieldResults: result.fields.map(fieldResultToReadModel),
  runtimeUnavailableFallback:
    result.status === 'runtime-unavailable'
      ? {
          status: 'runtime-unavailable',
          reason: result.runtimeMetadata.runtimeUnavailableReason ?? 'runtime-not-implemented',
          preserveCurrentUiBehavior: true,
          allowCatalogSelection: true,
          markLegalityAsUnknown: true,
          blockSimulationStart: true,
          message: 'Pokemon Showdown legality runtime is not wired yet. Local signals are preview-only.',
        }
      : undefined,
  notes: [
    'Pokemon Showdown remains the legality and simulation source of truth.',
    'PokeAPI and catalog data are enrichment only.',
  ],
})

const toMovePreviewField = (
  move: BuildCatalogReference | null,
  slotIndex: MoveSlot,
  previewLearnsetMoveIds: Set<string>,
): PokemonEditorLegalityFieldReadModel => {
  if (!move) {
    return {
      field: 'move',
      slotIndex,
      status: 'not-checked',
      label: `Move ${slotIndex + 1}`,
      message: 'No move selected.',
      selectable: true,
      legalityDefining: true,
      optionKind: 'move',
    }
  }

  const moveId = move.showdownId ?? move.catalogKey.replace(/^move-/, '')
  const foundInPreview = previewLearnsetMoveIds.has(moveId)

  return {
    field: 'move',
    slotIndex,
    status: 'warning',
    label: `Move ${slotIndex + 1}`,
    message: foundInPreview
      ? 'Appears in the local learnset preview. Pokemon Showdown must confirm final legality.'
      : 'Not found in the local learnset preview. Pokemon Showdown must confirm final legality.',
    selectable: true,
    legalityDefining: true,
    optionKind: 'move',
    option: optionPreview(move),
  }
}

const toAbilityPreviewMessage = (ability?: BuildCatalogReference | null, previewAbilityIds: Set<string> = new Set()) => {
  if (!ability) return 'No ability selected.'

  const abilityId = ability.showdownId ?? ability.catalogKey.replace(/^ability-/, '')
  const abilityListSignal = previewAbilityIds.size
    ? previewAbilityIds.has(abilityId)
      ? 'Appears in catalog ability list.'
      : 'Not found in catalog ability list.'
    : 'Catalog ability list is unavailable for this Pokemon/form.'

  return `${abilityListSignal} Pokemon Showdown must confirm final legality.`
}

export function createPokemonEditorLegalityPreviewReadModel(
  input: PokemonEditorLegalityPreviewInput,
): PokemonEditorLegalityReadModel {
  const runtimeResult = runPokemonEditorShowdownLegalityRuntimeProof(input)

  if (runtimeResult.fields.length) {
    return runtimeResultToReadModel(input, runtimeResult)
  }

  const previewLearnsetMoveIds = new Set(input.previewLearnsetMoveIds ?? [])
  const previewAbilityIds = new Set(input.previewAbilityIds ?? [])
  const moveResults = input.moves.map((move, index) =>
    toMovePreviewField(move, index as MoveSlot, previewLearnsetMoveIds),
  )

  const fieldResults: PokemonEditorLegalityFieldReadModel[] = [
    ...moveResults,
    {
      field: 'ability',
      status: input.ability ? 'runtime-unavailable' : 'not-checked',
      label: 'Ability',
      message: toAbilityPreviewMessage(input.ability, previewAbilityIds),
      selectable: true,
      legalityDefining: true,
      optionKind: 'ability',
      option: optionPreview(input.ability),
    },
    {
      field: 'item',
      status: input.item ? 'unknown' : 'not-checked',
      label: 'Item',
      message: input.item
        ? 'Items are catalog-selectable here, but this preview does not treat the item as legality-defining.'
        : 'No held item selected.',
      selectable: true,
      legalityDefining: false,
      optionKind: 'item',
      option: optionPreview(input.item),
    },
    {
      field: 'teraType',
      status: input.teraType ? 'runtime-unavailable' : 'not-checked',
      label: 'Tera type',
      message: input.teraType
        ? 'Tera types remain catalog-selectable; format legality is Pokemon Showdown-owned.'
        : 'No Tera type selected.',
      selectable: true,
      legalityDefining: true,
      optionKind: 'type',
      option: optionPreview(input.teraType),
    },
  ]

  return {
    status: 'runtime-unavailable',
    format: 'custom',
    species: input.species,
    fieldResults,
    runtimeUnavailableFallback: {
      status: 'runtime-unavailable',
      reason: 'runtime-not-implemented',
      preserveCurrentUiBehavior: true,
      allowCatalogSelection: true,
      markLegalityAsUnknown: true,
      blockSimulationStart: true,
      message: 'Pokemon Showdown legality runtime is not wired yet. Local signals are preview-only.',
    },
    notes: [
      'Local catalog and learnset data are enrichment only.',
      'Pokemon Showdown remains the legality and simulation source of truth.',
    ],
  }
}
