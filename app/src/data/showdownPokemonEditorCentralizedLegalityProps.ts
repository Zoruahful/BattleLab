import type { BattleFormat, BuildCatalogReference } from '../types'
import type {
  ShowdownFormatAwareLegalityPickerRow,
  ShowdownFormatAwarePickerLegalitySource,
  ShowdownFormatAwarePickerLegalityStatus,
} from './showdownFormatAwareLegalityReadModel'
import {
  createShowdownCentralizedLegalityReadModel,
  type ShowdownCentralizedLegalityFormatSource,
  type ShowdownCentralizedLegalityInput,
  type ShowdownCentralizedLegalityReadModel,
  type ShowdownCentralizedLegalityReadModelOptions,
  type ShowdownCentralizedLegalityStatus,
} from './showdownCentralizedLegalityReadModel'

export type ShowdownPokemonEditorCentralizedLegalityPropsStatus =
  | 'ready'
  | 'runtime-unavailable'
  | 'unsupported-format'
  | 'catalog-only-preview'

export interface ShowdownPokemonEditorCentralizedLegalityRowProps {
  field: ShowdownFormatAwareLegalityPickerRow['field']
  slotIndex?: ShowdownFormatAwareLegalityPickerRow['slotIndex']
  catalogKey: string
  showdownId: string
  displayName: string
  status: ShowdownFormatAwarePickerLegalityStatus
  source: ShowdownFormatAwarePickerLegalitySource
  label: string
  message: string
  format: BattleFormat
  targetShowdownFormatId: string
  legalityDefining: boolean
  selectable: true
}

export interface ShowdownPokemonEditorCentralizedLegalityCounts {
  legal: number
  illegal: number
  unknown: number
  catalogOnlyPreview: number
  moves: number
  abilities: number
}

export interface ShowdownPokemonEditorCentralizedLegalityFormatProps {
  selectedFormat: BattleFormat
  formatSource: ShowdownCentralizedLegalityFormatSource
  targetShowdownFormatId: string
  handoffStatus: ShowdownCentralizedLegalityReadModel['formatHandoffStatus']
  officialFormatAvailable: boolean
}

export interface ShowdownPokemonEditorCentralizedLegalityFallbackProps {
  runtimeUnavailable: boolean
  unsupportedFormat: boolean
  customOverlayRequired: boolean
  message: string
}

export interface ShowdownPokemonEditorCentralizedLegalitySafetyProps {
  explicitAsyncOnly: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noPokemonEditorFormatOverride: true
  noPokemonEditorCheckButton: true
  noCatalogOnlyFinalLegality: true
  noSimulationExecution: true
  noFileIo: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownPokemonEditorCentralizedLegalityProps {
  propsId: string
  status: ShowdownPokemonEditorCentralizedLegalityPropsStatus
  species: Pick<BuildCatalogReference, 'catalogKey' | 'showdownId' | 'displayName'>
  format: ShowdownPokemonEditorCentralizedLegalityFormatProps
  rows: ShowdownPokemonEditorCentralizedLegalityRowProps[]
  moveRows: ShowdownPokemonEditorCentralizedLegalityRowProps[]
  abilityRows: ShowdownPokemonEditorCentralizedLegalityRowProps[]
  counts: ShowdownPokemonEditorCentralizedLegalityCounts
  fallback: ShowdownPokemonEditorCentralizedLegalityFallbackProps
  safety: ShowdownPokemonEditorCentralizedLegalitySafetyProps
  boundaryNotes: string[]
}

export interface ShowdownPokemonEditorCentralizedLegalityPropsOptions
  extends ShowdownCentralizedLegalityReadModelOptions {
  readModel?: ShowdownCentralizedLegalityReadModel
}

const optionDisplayName = (option: Pick<BuildCatalogReference, 'catalogKey' | 'showdownId' | 'displayName'>) =>
  option.displayName || option.showdownId || option.catalogKey

const createSafety = (): ShowdownPokemonEditorCentralizedLegalitySafetyProps => ({
  explicitAsyncOnly: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noPokemonEditorFormatOverride: true,
  noPokemonEditorCheckButton: true,
  noCatalogOnlyFinalLegality: true,
  noSimulationExecution: true,
  noFileIo: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

const createStatus = (
  status: ShowdownCentralizedLegalityStatus,
): ShowdownPokemonEditorCentralizedLegalityPropsStatus => status

const createRowProps = (
  row: ShowdownFormatAwareLegalityPickerRow,
  targetShowdownFormatId: string,
): ShowdownPokemonEditorCentralizedLegalityRowProps => ({
  field: row.field,
  ...(row.slotIndex !== undefined ? { slotIndex: row.slotIndex } : {}),
  catalogKey: row.option.catalogKey,
  showdownId: row.option.showdownId ?? row.option.catalogKey,
  displayName: optionDisplayName(row.option),
  status: row.status,
  source: row.source,
  label: row.label,
  message: row.message,
  format: row.format,
  targetShowdownFormatId,
  legalityDefining: row.legalityDefining,
  selectable: true,
})

const createFallback = (
  readModel: ShowdownCentralizedLegalityReadModel,
): ShowdownPokemonEditorCentralizedLegalityFallbackProps => ({
  runtimeUnavailable: readModel.runtimeUnavailable,
  unsupportedFormat: readModel.unsupportedFormat,
  customOverlayRequired: readModel.formatHandoffStatus === 'custom-overlay-required',
  message:
    readModel.formatHandoff.runtimeFallback?.message ??
    (readModel.runtimeUnavailable
      ? 'Pokemon Showdown runtime is unavailable for the selected app/team format.'
      : 'Pokemon Showdown legality data is available only after an explicit centralized runtime check.'),
})

export function projectShowdownPokemonEditorCentralizedLegalityProps(
  readModel: ShowdownCentralizedLegalityReadModel,
): ShowdownPokemonEditorCentralizedLegalityProps {
  const rows = readModel.formatAwareReadModel.rows.map((row) =>
    createRowProps(row, readModel.targetShowdownFormatId),
  )
  const moveRows = rows.filter((row) => row.field === 'move')
  const abilityRows = rows.filter((row) => row.field === 'ability')

  return {
    propsId: `${readModel.readModelId}-pokemon-editor-props`,
    status: createStatus(readModel.status),
    species: readModel.formatAwareReadModel.species,
    format: {
      selectedFormat: readModel.selectedFormat,
      formatSource: readModel.formatSource,
      targetShowdownFormatId: readModel.targetShowdownFormatId,
      handoffStatus: readModel.formatHandoffStatus,
      officialFormatAvailable: readModel.officialFormatAvailable,
    },
    rows,
    moveRows,
    abilityRows,
    counts: {
      legal: readModel.legalCount,
      illegal: readModel.illegalCount,
      unknown: readModel.unknownCount,
      catalogOnlyPreview: readModel.catalogOnlyPreviewCount,
      moves: moveRows.length,
      abilities: abilityRows.length,
    },
    fallback: createFallback(readModel),
    safety: createSafety(),
    boundaryNotes: [
      'Pokemon Editor props consume centralized app/team-format legality results and do not choose or override format.',
      'These props do not require a Pokemon Editor-owned Check with Pokemon Showdown button.',
      'Legal and illegal statuses are passed through only from Pokemon Showdown-sourced evidence.',
      'Catalog and PokeAPI data remain enrichment-only labels and search metadata.',
    ],
  }
}

export async function createShowdownPokemonEditorCentralizedLegalityProps(
  input: ShowdownCentralizedLegalityInput,
  options: ShowdownPokemonEditorCentralizedLegalityPropsOptions = {},
): Promise<ShowdownPokemonEditorCentralizedLegalityProps> {
  const readModel = options.readModel ?? (await createShowdownCentralizedLegalityReadModel(input, options))

  return projectShowdownPokemonEditorCentralizedLegalityProps(readModel)
}
