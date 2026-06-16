import type { BattleFormat, BuildCatalogReference } from '../types'
import {
  createShowdownFormatAwareLegalityReadModel,
  type ShowdownFormatAwareLegalityCandidate,
  type ShowdownFormatAwareLegalityReadModel,
  type ShowdownFormatAwareLegalityReadModelOptions,
} from './showdownFormatAwareLegalityReadModel'
import {
  createShowdownLegalityFormatHandoff,
  type ShowdownLegalityFormatHandoff,
  type ShowdownLegalityFormatHandoffOptions,
} from './showdownLegalityFormatHandoff'

export type ShowdownCentralizedLegalityFormatSource = 'settings' | 'team-builder' | 'app-default'

export type ShowdownCentralizedLegalityStatus =
  | 'ready'
  | 'runtime-unavailable'
  | 'unsupported-format'
  | 'catalog-only-preview'

export interface ShowdownCentralizedLegalityInput {
  requestId?: string
  requestedAt?: string
  selectedFormat: BattleFormat
  formatSource: ShowdownCentralizedLegalityFormatSource
  species: BuildCatalogReference
  candidateMoves: ShowdownFormatAwareLegalityCandidate[]
  candidateAbilities: ShowdownFormatAwareLegalityCandidate[]
}

export interface ShowdownCentralizedLegalitySafety {
  explicitAsyncOnly: true
  noImportTimeExecution: true
  noAppLoadExecution: true
  noPanelOpenExecution: true
  noPokemonEditorFormatOverride: true
  noPokemonEditorCheckButtonRequired: true
  noCatalogOnlyFinalLegality: true
  noSimulationExecution: true
  noFileIo: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownCentralizedLegalityReadModel {
  readModelId: string
  status: ShowdownCentralizedLegalityStatus
  selectedFormat: BattleFormat
  formatSource: ShowdownCentralizedLegalityFormatSource
  targetShowdownFormatId: string
  formatHandoffStatus: ShowdownLegalityFormatHandoff['status']
  officialFormatAvailable: boolean
  runtimeUnavailable: boolean
  unsupportedFormat: boolean
  catalogOnlyPreviewCount: number
  legalCount: number
  illegalCount: number
  unknownCount: number
  formatHandoff: ShowdownLegalityFormatHandoff
  formatAwareReadModel: ShowdownFormatAwareLegalityReadModel
  safety: ShowdownCentralizedLegalitySafety
  boundaryNotes: string[]
}

export interface ShowdownCentralizedLegalityReadModelOptions
  extends ShowdownFormatAwareLegalityReadModelOptions,
    ShowdownLegalityFormatHandoffOptions {
  formatHandoff?: ShowdownLegalityFormatHandoff
}

const createSafety = (): ShowdownCentralizedLegalitySafety => ({
  explicitAsyncOnly: true,
  noImportTimeExecution: true,
  noAppLoadExecution: true,
  noPanelOpenExecution: true,
  noPokemonEditorFormatOverride: true,
  noPokemonEditorCheckButtonRequired: true,
  noCatalogOnlyFinalLegality: true,
  noSimulationExecution: true,
  noFileIo: true,
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
})

const createStatus = (
  handoff: ShowdownLegalityFormatHandoff,
  readModel: ShowdownFormatAwareLegalityReadModel,
): ShowdownCentralizedLegalityStatus => {
  if (handoff.status === 'unsupported-format') return 'unsupported-format'
  if (readModel.runtimeUnavailable || handoff.status === 'runtime-unavailable') return 'runtime-unavailable'
  if (readModel.legalCount || readModel.illegalCount) return 'ready'

  return 'catalog-only-preview'
}

export async function createShowdownCentralizedLegalityReadModel(
  input: ShowdownCentralizedLegalityInput,
  options: ShowdownCentralizedLegalityReadModelOptions = {},
): Promise<ShowdownCentralizedLegalityReadModel> {
  const handoff =
    options.formatHandoff ??
    (await createShowdownLegalityFormatHandoff(input.selectedFormat, {
      handoffId: options.handoffId,
      installedRegistryBridge: options.installedRegistryBridge,
      formatRegistry: options.formatRegistry,
      loadInstalledRegistryBridge: options.loadInstalledRegistryBridge,
      loadFormatRegistry: options.loadFormatRegistry,
    }))
  const formatAwareReadModel = await createShowdownFormatAwareLegalityReadModel(
    {
      requestId: input.requestId,
      requestedAt: input.requestedAt,
      format: input.selectedFormat,
      species: input.species,
      candidateMoves: input.candidateMoves,
      candidateAbilities: input.candidateAbilities,
    },
    {
      checkedAt: options.checkedAt,
      loadShowdown: options.loadShowdown,
      loadBrowserData: options.loadBrowserData,
      runtimeLoader: options.runtimeLoader,
      formatHandoff: handoff,
      response: options.response,
    },
  )
  const status = createStatus(handoff, formatAwareReadModel)

  return {
    readModelId: `${formatAwareReadModel.readModelId}-centralized`,
    status,
    selectedFormat: input.selectedFormat,
    formatSource: input.formatSource,
    targetShowdownFormatId: handoff.mapping.targetShowdownFormatId,
    formatHandoffStatus: handoff.status,
    officialFormatAvailable: handoff.officialFormatAvailable,
    runtimeUnavailable: status === 'runtime-unavailable',
    unsupportedFormat: status === 'unsupported-format',
    catalogOnlyPreviewCount: formatAwareReadModel.catalogOnlyPreviewCount,
    legalCount: formatAwareReadModel.legalCount,
    illegalCount: formatAwareReadModel.illegalCount,
    unknownCount: formatAwareReadModel.unknownCount,
    formatHandoff: handoff,
    formatAwareReadModel,
    safety: createSafety(),
    boundaryNotes: [
      'Centralized legality uses the selected app or team format; Pokemon Editor must not choose or override the format.',
      'Runtime checks are explicit async helper calls only and do not run on import, app load, panel open, typing, or picker open.',
      'Legal and illegal labels can only come from Pokemon Showdown adapter evidence.',
      'PokeAPI and catalog records remain enrichment-only labels and search metadata.',
    ],
  }
}
