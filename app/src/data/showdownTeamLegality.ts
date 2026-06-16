import type { BattleFormat, BuildCatalogReference, PokemonBuild, SubmittedTeam } from '../types'
import type { ShowdownEngineInstalledFormatRegistryBridge } from './showdownEngineInstalledFormatRegistryBridge'
import {
  createShowdownFormatAwareLegalityReadModel,
  type ShowdownFormatAwareLegalityReadModel,
  type ShowdownFormatAwareLegalityReadModelOptions,
} from './showdownFormatAwareLegalityReadModel'
import { createShowdownLegalityFormatHandoff } from './showdownLegalityFormatHandoff'

export type ShowdownTeamLegalityStatus =
  | 'not-checked'
  | 'checking'
  | 'complete'
  | 'runtime-unavailable'
  | 'failed'

export interface ShowdownTeamLegalitySlotResult {
  slot: PokemonBuild['slot']
  pokemon: Pick<PokemonBuild, 'id' | 'species'>
  readModel: ShowdownFormatAwareLegalityReadModel
}

export interface ShowdownTeamLegalityReadModel {
  readModelId: string
  status: ShowdownTeamLegalityStatus
  format: BattleFormat
  checkedAt: string
  slotResults: ShowdownTeamLegalitySlotResult[]
  legalCount: number
  illegalCount: number
  unknownCount: number
  runtimeUnavailable: boolean
  message: string
  boundaryNotes: string[]
}

export interface CreateShowdownTeamLegalityReadModelOptions extends ShowdownFormatAwareLegalityReadModelOptions {
  checkedAt?: string
}

const toShowdownId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const createFallbackRef = (prefix: string, value: string): BuildCatalogReference => ({
  catalogKey: `${prefix}-${toShowdownId(value)}`,
  showdownId: toShowdownId(value),
  displayName: value,
})

const createSpeciesRef = (pokemon: PokemonBuild): BuildCatalogReference =>
  pokemon.speciesRef ?? createFallbackRef('pokemon', pokemon.species)

const createAbilityRef = (pokemon: PokemonBuild): BuildCatalogReference | null =>
  pokemon.abilityRef ?? (pokemon.ability ? createFallbackRef('ability', pokemon.ability) : null)

const createMoveRefs = (pokemon: PokemonBuild): BuildCatalogReference[] =>
  pokemon.moves
    .map((move, index) => pokemon.moveRefs?.[index] ?? (move ? createFallbackRef('move', move) : null))
    .filter((move): move is BuildCatalogReference => Boolean(move))

const createBrowserDataFormatRegistryBridge = (
  format: BattleFormat,
  checkedAt: string,
): ShowdownEngineInstalledFormatRegistryBridge => {
  const regulationGAvailable = format === 'vgc-regulation-g'

  return {
    bridgeId: `showdown-team-legality-browser-data-${format}`,
    status: regulationGAvailable ? 'installed-registry-available' : 'installed-registry-unavailable',
    message: regulationGAvailable
      ? 'Pokemon Showdown browser-data format handoff is available for VGC Regulation G.'
      : 'Pokemon Showdown browser-data format handoff is unavailable for this BattleLab format.',
    checkedAt,
    packageSummary: {
      packageName: 'pokemon-showdown',
      status: regulationGAvailable ? 'available' : 'unavailable',
      importStrategy: 'explicit-async-installed-package-import',
      errorMessage: regulationGAvailable ? null : 'Browser-data legality only supports the installed Regulation G mapping in this checkpoint.',
    },
    officialFormatCount: regulationGAvailable ? 1 : 0,
    sampleOfficialFormats: regulationGAvailable
      ? [
          {
            formatId: 'gen9vgc2025regg',
            displayName: '[Gen 9] VGC 2025 Reg G',
            source: 'official-pokemon-showdown',
            gameType: 'doubles',
            generation: 9,
            section: 'S/V Doubles',
          },
        ]
      : [],
    customOverlay: {
      overlayFolderKey: 'battlelab-custom-overlays',
      mergeStrategy: 'read-overlay-after-official-registry',
      modifiesUpstreamSourceInPlace: false,
      status: 'supported',
      placeholderFormatCount: 1,
      message: 'BattleLab custom formats remain overlays and do not mutate upstream Pokemon Showdown source.',
    },
    aggregateHandoff: {
      aggregateReadModelId: `showdown-team-legality-browser-data-aggregate-${format}`,
      aggregateStatus: regulationGAvailable ? 'ready-preview' : 'blocked-preview',
      activationGateStatus: regulationGAvailable ? 'activation-ready' : 'blocked',
      previousActivePreserved: true,
      metadataOnly: true,
    },
    runtimeUnavailableFallback: {
      available: true,
      status: 'runtime-unavailable-fallback',
      message: 'Unsupported formats preserve runtime-unavailable fallback.',
    },
    safety: {
      explicitAsyncOnly: true,
      noImportTimeExecution: true,
      noAppLoadExecution: true,
      noPanelOpenExecution: true,
      noArchiveDownload: true,
      noArchiveExtraction: true,
      noFileIo: true,
      noDynamicImportFromDownloadedCode: true,
      noCatalogUpdatePanelWiring: true,
      noSimulationExecution: true,
      installedPackageMetadataReadOnly: true,
      customFormatsOverlayOnly: true,
      pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
      catalogRole: 'enrichment-only',
    },
    boundaryNotes: [
      'Browser-data format handoff runs only through explicit team-level legality action.',
      'BattleLab custom formats remain overlays.',
    ],
  }
}

const createMessage = (
  status: ShowdownTeamLegalityStatus,
  format: BattleFormat,
  legalCount: number,
  illegalCount: number,
  unknownCount: number,
) => {
  if (status === 'runtime-unavailable') {
    return `Pokemon Showdown runtime or selected format is unavailable for ${format}; legality remains unknown.`
  }

  if (status === 'failed') {
    return 'Pokemon Showdown legality check failed before producing a team result.'
  }

  if (illegalCount > 0) {
    return `Pokemon Showdown found ${illegalCount} illegal move or ability result${illegalCount === 1 ? '' : 's'}.`
  }

  if (legalCount > 0 && unknownCount === 0) {
    return 'Pokemon Showdown accepted the checked team move and ability results.'
  }

  return 'Pokemon Showdown completed the team check with unknown results still present.'
}

export async function createShowdownTeamLegalityReadModel(
  team: SubmittedTeam,
  options: CreateShowdownTeamLegalityReadModelOptions = {},
): Promise<ShowdownTeamLegalityReadModel> {
  const checkedAt = options.checkedAt ?? new Date().toISOString()
  const formatHandoff =
    options.runtimeLoader === 'browser-data' && !options.formatHandoff && !options.loadFormatHandoff
      ? await createShowdownLegalityFormatHandoff(team.format, {
          handoffId: `showdown-team-legality-browser-data-handoff-${team.format}`,
          installedRegistryBridge: createBrowserDataFormatRegistryBridge(team.format, checkedAt),
        })
      : options.formatHandoff
  const slotResults: ShowdownTeamLegalitySlotResult[] = []

  for (const slot of team.slots) {
    if (!slot.pokemon) continue

    const pokemon = slot.pokemon
    const readModel = await createShowdownFormatAwareLegalityReadModel(
      {
        requestId: `showdown-team-legality-${team.id}-slot-${slot.slot}-${checkedAt}`,
        requestedAt: checkedAt,
        format: team.format,
        species: createSpeciesRef(pokemon),
        candidateMoves: createMoveRefs(pokemon).map((option) => ({ option })),
        candidateAbilities: createAbilityRef(pokemon) ? [{ option: createAbilityRef(pokemon) as BuildCatalogReference }] : [],
      },
      {
        ...options,
        ...(formatHandoff ? { formatHandoff } : {}),
      },
    )

    slotResults.push({
      slot: pokemon.slot,
      pokemon: {
        id: pokemon.id,
        species: pokemon.species,
      },
      readModel,
    })
  }

  const legalCount = slotResults.reduce((total, slot) => total + slot.readModel.legalCount, 0)
  const illegalCount = slotResults.reduce((total, slot) => total + slot.readModel.illegalCount, 0)
  const unknownCount = slotResults.reduce((total, slot) => total + slot.readModel.unknownCount, 0)
  const runtimeUnavailable = slotResults.length > 0 && slotResults.every((slot) => slot.readModel.runtimeUnavailable)
  const status: ShowdownTeamLegalityStatus = runtimeUnavailable ? 'runtime-unavailable' : 'complete'

  return {
    readModelId: `showdown-team-legality-${team.id}-${checkedAt}`,
    status,
    format: team.format,
    checkedAt,
    slotResults,
    legalCount,
    illegalCount,
    unknownCount,
    runtimeUnavailable,
    message: createMessage(status, team.format, legalCount, illegalCount, unknownCount),
    boundaryNotes: [
      'Team-level legality checks are created only by explicit user action.',
      'The selected team format is the only format source for Pokemon Showdown checks.',
      'Legal and illegal move or ability labels come only from Pokemon Showdown evidence.',
      'Catalog and PokeAPI data remain enrichment-only.',
    ],
  }
}
