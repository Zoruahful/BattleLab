import type {
  BattleFormat,
  BuildCatalogReference,
  CatalogPickerKind,
  PokemonEditorLegalityFieldReadModel,
  PokemonEditorLegalityReadModel,
  ShowdownLegalityFieldKind,
  ShowdownLegalityFieldResult,
  ShowdownLegalityStatus,
} from '../types'
import type {
  ShowdownRuntimeAdapterFieldEvidence,
  ShowdownRuntimeAdapterResponse,
} from '../types/showdownRuntime'

type MoveSlot = 0 | 1 | 2 | 3

export interface ShowdownPokemonEditorLegalityAdapterInput {
  response: ShowdownRuntimeAdapterResponse
  format?: BattleFormat
  species?: BuildCatalogReference | null
}

export interface ShowdownPokemonEditorLegalityAdapterSummary {
  responseStatus: ShowdownRuntimeAdapterResponse['status']
  fieldCount: number
  legalCount: number
  illegalCount: number
  runtimeUnavailable: boolean
  catalogHintDisagreementCount: number
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownPokemonEditorLegalityAdapterResult {
  readModel: PokemonEditorLegalityReadModel
  summary: ShowdownPokemonEditorLegalityAdapterSummary
  boundaryNotes: string[]
}

const optionPreview = (option?: BuildCatalogReference | null) =>
  option
    ? {
        catalogKey: option.catalogKey,
        showdownId: option.showdownId,
        displayName: option.displayName,
      }
    : undefined

const fieldLabel = (field: ShowdownLegalityFieldKind, slotIndex?: MoveSlot) => {
  if (field === 'move') return `Move ${(slotIndex ?? 0) + 1}`
  if (field === 'ability') return 'Ability'
  if (field === 'item') return 'Item'
  if (field === 'teraType') return 'Tera type'
  if (field === 'nature') return 'Nature'
  return 'Species'
}

const fieldOptionKind = (field: ShowdownLegalityFieldKind): CatalogPickerKind | undefined => {
  if (field === 'teraType') return 'type'
  if (field === 'move' || field === 'ability' || field === 'item' || field === 'nature') return field
  if (field === 'species') return 'pokemon'
  return undefined
}

const fieldResultToReadModel = (field: ShowdownLegalityFieldResult): PokemonEditorLegalityFieldReadModel => ({
  field: field.field,
  ...(field.slotIndex !== undefined ? { slotIndex: field.slotIndex } : {}),
  status: field.status,
  label: fieldLabel(field.field, field.slotIndex),
  message: field.messages.map((message) => message.message).join(' '),
  selectable: field.selectable,
  legalityDefining: field.legalityDefining,
  optionKind: fieldOptionKind(field.field),
  option: optionPreview(field.value),
})

const evidenceStatusToReadModelStatus = (
  evidence: ShowdownRuntimeAdapterFieldEvidence,
): ShowdownLegalityStatus => {
  if (evidence.source === 'catalog-preview' || evidence.catalogHintDisagrees) return 'unknown'

  return evidence.status
}

const evidenceMessage = (evidence: ShowdownRuntimeAdapterFieldEvidence) => {
  if (evidence.catalogHintDisagrees) {
    return 'Catalog hint disagrees, but Pokemon Showdown must confirm final legality.'
  }

  if (evidence.source === 'catalog-preview') {
    return 'Catalog hint is preview-only; Pokemon Showdown must confirm final legality.'
  }

  if (evidence.status === 'legal') {
    return `Pokemon Showdown allows ${evidence.value.displayName ?? evidence.value.showdownId ?? evidence.value.catalogKey}.`
  }

  if (evidence.status === 'illegal') {
    return `Pokemon Showdown rejects ${evidence.value.displayName ?? evidence.value.showdownId ?? evidence.value.catalogKey}.`
  }

  return evidence.showdownDetail ?? 'Pokemon Showdown runtime did not produce final field legality.'
}

const evidenceToReadModel = (evidence: ShowdownRuntimeAdapterFieldEvidence): PokemonEditorLegalityFieldReadModel => ({
  field: evidence.field,
  ...(evidence.slotIndex !== undefined ? { slotIndex: evidence.slotIndex } : {}),
  status: evidenceStatusToReadModelStatus(evidence),
  label: fieldLabel(evidence.field, evidence.slotIndex),
  message: evidenceMessage(evidence),
  selectable: true,
  legalityDefining: evidence.field === 'move' || evidence.field === 'ability',
  optionKind: fieldOptionKind(evidence.field),
  option: optionPreview(evidence.value),
})

const createRuntimeUnavailableFallback = (response: ShowdownRuntimeAdapterResponse) => ({
  status: 'runtime-unavailable' as const,
  reason: response.unavailableResult?.reason ?? response.runtimeMetadata.runtimeUnavailableReason ?? 'runtime-start-failed',
  preserveCurrentUiBehavior: true as const,
  allowCatalogSelection: true as const,
  markLegalityAsUnknown: true as const,
  blockSimulationStart: true as const,
  message:
    response.unavailableResult?.messages.map((message) => message.message).join(' ') ||
    'Pokemon Showdown runtime is unavailable; legality remains unknown.',
})

const uniqueEvidenceFields = (
  response: ShowdownRuntimeAdapterResponse,
  existingFields: PokemonEditorLegalityFieldReadModel[],
) => {
  const existingKeys = new Set(
    existingFields.map((field) => `${field.field}:${field.slotIndex ?? 'none'}:${field.option?.catalogKey ?? 'none'}`),
  )

  return response.fieldEvidence
    .filter((evidence) => {
      const key = `${evidence.field}:${evidence.slotIndex ?? 'none'}:${evidence.value.catalogKey}`
      return !existingKeys.has(key)
    })
    .map(evidenceToReadModel)
}

const createStatus = (
  response: ShowdownRuntimeAdapterResponse,
  fieldResults: PokemonEditorLegalityFieldReadModel[],
): ShowdownLegalityStatus => {
  if (response.status === 'runtime-unavailable') return 'runtime-unavailable'
  if (fieldResults.some((field) => field.status === 'illegal')) return 'illegal'
  if (fieldResults.some((field) => field.status === 'legal')) return 'legal'
  if (fieldResults.some((field) => field.status === 'unknown' || field.status === 'warning')) return 'unknown'

  return response.legalityResult?.status ?? 'not-checked'
}

export function createShowdownPokemonEditorLegalityReadModel(
  input: ShowdownPokemonEditorLegalityAdapterInput,
): ShowdownPokemonEditorLegalityAdapterResult {
  const fieldResults = input.response.legalityResult?.fields.map(fieldResultToReadModel) ?? []
  const evidenceFields = uniqueEvidenceFields(input.response, fieldResults)
  const combinedFields = [...fieldResults, ...evidenceFields]
  const catalogHintDisagreementCount = input.response.fieldEvidence.filter((evidence) => evidence.catalogHintDisagrees).length
  const runtimeUnavailable = input.response.status === 'runtime-unavailable'
  const status = createStatus(input.response, combinedFields)

  return {
    readModel: {
      status,
      format: input.format ?? 'custom',
      species: input.species ?? null,
      fieldResults: combinedFields,
      ...(runtimeUnavailable ? { runtimeUnavailableFallback: createRuntimeUnavailableFallback(input.response) } : {}),
      notes: [
        'Pokemon Showdown remains the legality and simulation source of truth.',
        'PokeAPI and catalog data remain enrichment-only.',
        'Catalog hints are non-authoritative and cannot produce final legal or illegal results.',
      ],
    },
    summary: {
      responseStatus: input.response.status,
      fieldCount: combinedFields.length,
      legalCount: combinedFields.filter((field) => field.status === 'legal').length,
      illegalCount: combinedFields.filter((field) => field.status === 'illegal').length,
      runtimeUnavailable,
      catalogHintDisagreementCount,
      pokemonShowdownAuthority: input.response.safetyPolicy.pokemonShowdownAuthority,
      catalogRole: input.response.safetyPolicy.catalogRole,
    },
    boundaryNotes: [
      'Pokemon Editor legality adapter bridge is data-only and React-free.',
      'Only Pokemon Showdown-sourced adapter results can map to final legal or illegal field status.',
      'Runtime-unavailable responses preserve current UI behavior and keep legality unknown.',
    ],
  }
}
