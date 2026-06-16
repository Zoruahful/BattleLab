import type {
  BattleFormat,
  BuildCatalogReference,
  ShowdownLegalityFieldKind,
  ShowdownLegalityStatus,
} from '../types'
import type {
  ShowdownRuntimeAdapterFieldEvidence,
  ShowdownRuntimeAdapterResponse,
} from '../types/showdownRuntime'
import {
  sampleShowdownRuntimeAdapterEnvironment,
  sampleShowdownRuntimeAdapterSafetyPolicy,
} from './showdownLegalityRuntimeAdapterFixtures'
import { createPokemonEditorShowdownLegalityRequest } from './showdownLegalityRuntimeProof'
import {
  runShowdownRuntimeAdapter,
  type ShowdownRuntimeAdapterRunOptions,
} from './showdownRuntimeAdapter'

export type ShowdownFormatAwarePickerLegalityStatus =
  | 'legal-in-selected-format'
  | 'illegal-in-selected-format'
  | 'unknown-runtime-unavailable'
  | 'catalog-only-preview'

export type ShowdownFormatAwarePickerLegalitySource =
  | 'pokemon-showdown'
  | 'runtime-unavailable'
  | 'catalog-preview'

export interface ShowdownFormatAwareLegalityCandidate {
  option: BuildCatalogReference
  previewOnly?: boolean
}

export interface ShowdownFormatAwareLegalityReadModelInput {
  requestId?: string
  requestedAt?: string
  format: BattleFormat
  species: BuildCatalogReference
  candidateMoves: ShowdownFormatAwareLegalityCandidate[]
  candidateAbilities: ShowdownFormatAwareLegalityCandidate[]
}

export interface ShowdownFormatAwareLegalityPickerRow {
  field: Extract<ShowdownLegalityFieldKind, 'move' | 'ability'>
  slotIndex?: 0 | 1 | 2 | 3
  option: Pick<BuildCatalogReference, 'catalogKey' | 'showdownId' | 'displayName'>
  status: ShowdownFormatAwarePickerLegalityStatus
  source: ShowdownFormatAwarePickerLegalitySource
  label: string
  message: string
  showdownDetail?: string
  format: BattleFormat
  legalityDefining: boolean
}

export interface ShowdownFormatAwareLegalitySafety {
  explicitAsyncOnly: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noCatalogOnlyFinalLegality: true
  noSimulationExecution: true
  noFileIo: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownFormatAwareLegalityReadModel {
  readModelId: string
  status: ShowdownLegalityStatus
  format: BattleFormat
  species: Pick<BuildCatalogReference, 'catalogKey' | 'showdownId' | 'displayName'>
  rows: ShowdownFormatAwareLegalityPickerRow[]
  runtimeResponseStatus: ShowdownRuntimeAdapterResponse['status']
  runtimeUnavailable: boolean
  legalCount: number
  illegalCount: number
  unknownCount: number
  catalogOnlyPreviewCount: number
  safety: ShowdownFormatAwareLegalitySafety
  boundaryNotes: string[]
}

export interface ShowdownFormatAwareLegalityReadModelOptions extends ShowdownRuntimeAdapterRunOptions {
  response?: ShowdownRuntimeAdapterResponse
}

const optionPreview = (option: BuildCatalogReference) => ({
  catalogKey: option.catalogKey,
  showdownId: option.showdownId,
  displayName: option.displayName,
})

const createSafety = (): ShowdownFormatAwareLegalitySafety => ({
  explicitAsyncOnly: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noCatalogOnlyFinalLegality: true,
  noSimulationExecution: true,
  noFileIo: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

const labelForStatus = (status: ShowdownFormatAwarePickerLegalityStatus) => {
  if (status === 'legal-in-selected-format') return 'Legal in selected format'
  if (status === 'illegal-in-selected-format') return 'Illegal in selected format'
  if (status === 'catalog-only-preview') return 'Catalog-only preview'
  return 'Unknown / runtime unavailable'
}

const statusFromEvidence = (
  evidence?: ShowdownRuntimeAdapterFieldEvidence,
): ShowdownFormatAwarePickerLegalityStatus => {
  if (!evidence) return 'unknown-runtime-unavailable'
  if (evidence.source !== 'pokemon-showdown') return 'catalog-only-preview'
  if (evidence.status === 'legal') return 'legal-in-selected-format'
  if (evidence.status === 'illegal') return 'illegal-in-selected-format'

  return 'unknown-runtime-unavailable'
}

const sourceFromStatus = (
  status: ShowdownFormatAwarePickerLegalityStatus,
): ShowdownFormatAwarePickerLegalitySource => {
  if (status === 'legal-in-selected-format' || status === 'illegal-in-selected-format') return 'pokemon-showdown'
  if (status === 'catalog-only-preview') return 'catalog-preview'
  return 'runtime-unavailable'
}

const createMessage = (
  status: ShowdownFormatAwarePickerLegalityStatus,
  field: 'move' | 'ability',
  option: BuildCatalogReference,
  format: BattleFormat,
  evidence?: ShowdownRuntimeAdapterFieldEvidence,
) => {
  if (evidence?.source === 'pokemon-showdown' && evidence.showdownDetail) {
    return evidence.showdownDetail
  }

  const displayName = option.displayName ?? option.showdownId ?? option.catalogKey

  if (status === 'legal-in-selected-format') {
    return `Pokemon Showdown allows ${displayName} in ${format}.`
  }

  if (status === 'illegal-in-selected-format') {
    return `Pokemon Showdown rejects ${displayName} in ${format}.`
  }

  if (status === 'catalog-only-preview') {
    return `${displayName} is visible from catalog metadata only; Pokemon Showdown has not confirmed ${field} legality.`
  }

  return `Pokemon Showdown runtime is unavailable for ${displayName}; legality remains unknown.`
}

const createCatalogPreviewRow = (
  field: 'move' | 'ability',
  option: BuildCatalogReference,
  format: BattleFormat,
  slotIndex?: 0 | 1 | 2 | 3,
): ShowdownFormatAwareLegalityPickerRow => ({
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  option: optionPreview(option),
  status: 'catalog-only-preview',
  source: 'catalog-preview',
  label: labelForStatus('catalog-only-preview'),
  message: createMessage('catalog-only-preview', field, option, format),
  format,
  legalityDefining: true,
})

const createRuntimeRow = (
  field: 'move' | 'ability',
  option: BuildCatalogReference,
  format: BattleFormat,
  evidence?: ShowdownRuntimeAdapterFieldEvidence,
  slotIndex?: 0 | 1 | 2 | 3,
): ShowdownFormatAwareLegalityPickerRow => {
  const status = statusFromEvidence(evidence)

  return {
    field,
    ...(slotIndex !== undefined ? { slotIndex } : {}),
    option: optionPreview(option),
    status,
    source: sourceFromStatus(status),
    label: labelForStatus(status),
    message: createMessage(status, field, option, format, evidence),
    ...(evidence?.showdownDetail ? { showdownDetail: evidence.showdownDetail } : {}),
    format,
    legalityDefining: true,
  }
}

const findEvidence = (
  response: ShowdownRuntimeAdapterResponse,
  field: 'move' | 'ability',
  option: BuildCatalogReference,
  slotIndex?: 0 | 1 | 2 | 3,
) =>
  response.fieldEvidence.find(
    (evidence) =>
      evidence.field === field &&
      evidence.value.catalogKey === option.catalogKey &&
      (slotIndex === undefined || evidence.slotIndex === slotIndex),
  )

const createRequest = (input: ShowdownFormatAwareLegalityReadModelInput) => {
  const requestedAt = input.requestedAt ?? new Date().toISOString()
  const moves: [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ] = input.candidateMoves
    .filter((candidate) => !candidate.previewOnly)
    .slice(0, 4)
    .map((candidate) => candidate.option) as [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ]

  while (moves.length < 4) {
    moves.push(null)
  }

  const legalityRequest = createPokemonEditorShowdownLegalityRequest({
    requestedAt,
    format: input.format,
    species: input.species,
    ability: input.candidateAbilities.find((candidate) => !candidate.previewOnly)?.option ?? null,
    item: null,
    teraType: null,
    moves,
  })

  return {
    requestId: input.requestId ?? `showdown-format-aware-legality-${requestedAt}`,
    requestedAt,
    checkKind: 'pokemon-editor-move-ability' as const,
    format: input.format,
    legalityRequest,
    moveCheck: {
      species: input.species,
      candidateMoves: input.candidateMoves.filter((candidate) => !candidate.previewOnly).map((candidate) => candidate.option),
      format: input.format,
    },
    abilityCheck: {
      species: input.species,
      candidateAbilities: input.candidateAbilities
        .filter((candidate) => !candidate.previewOnly)
        .map((candidate) => candidate.option),
      format: input.format,
    },
    environment: sampleShowdownRuntimeAdapterEnvironment,
    safetyPolicy: sampleShowdownRuntimeAdapterSafetyPolicy,
  }
}

export async function createShowdownFormatAwareLegalityReadModel(
  input: ShowdownFormatAwareLegalityReadModelInput,
  options: ShowdownFormatAwareLegalityReadModelOptions = {},
): Promise<ShowdownFormatAwareLegalityReadModel> {
  const request = createRequest(input)
  const response = options.response ?? (await runShowdownRuntimeAdapter(request, options))
  const rows: ShowdownFormatAwareLegalityPickerRow[] = []

  input.candidateMoves.forEach((candidate, index) => {
    if (candidate.previewOnly) {
      rows.push(createCatalogPreviewRow('move', candidate.option, input.format, index as 0 | 1 | 2 | 3))
      return
    }

    rows.push(createRuntimeRow('move', candidate.option, input.format, findEvidence(response, 'move', candidate.option, index as 0 | 1 | 2 | 3), index as 0 | 1 | 2 | 3))
  })

  input.candidateAbilities.forEach((candidate) => {
    if (candidate.previewOnly) {
      rows.push(createCatalogPreviewRow('ability', candidate.option, input.format))
      return
    }

    rows.push(createRuntimeRow('ability', candidate.option, input.format, findEvidence(response, 'ability', candidate.option)))
  })

  const legalCount = rows.filter((row) => row.status === 'legal-in-selected-format').length
  const illegalCount = rows.filter((row) => row.status === 'illegal-in-selected-format').length
  const catalogOnlyPreviewCount = rows.filter((row) => row.status === 'catalog-only-preview').length
  const unknownCount = rows.filter((row) => row.status === 'unknown-runtime-unavailable').length

  return {
    readModelId: `${request.requestId}-read-model`,
    status: response.status === 'runtime-unavailable' ? 'runtime-unavailable' : illegalCount ? 'illegal' : legalCount ? 'legal' : 'unknown',
    format: input.format,
    species: optionPreview(input.species),
    rows,
    runtimeResponseStatus: response.status,
    runtimeUnavailable: response.status === 'runtime-unavailable',
    legalCount,
    illegalCount,
    unknownCount,
    catalogOnlyPreviewCount,
    safety: createSafety(),
    boundaryNotes: [
      'Format-aware legality read-model is created only through explicit async helper calls.',
      'Legal and illegal picker statuses are assigned only from Pokemon Showdown adapter evidence.',
      'Catalog and PokeAPI metadata can provide labels and preview rows, but cannot decide legality.',
    ],
  }
}
