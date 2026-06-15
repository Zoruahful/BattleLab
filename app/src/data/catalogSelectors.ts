import type {
  CatalogAbility,
  CatalogAssetMetadata,
  CatalogAssetReference,
  CatalogItem,
  CatalogKey,
  CatalogMove,
  CatalogNature,
  CatalogPickerKind,
  CatalogPickerOption,
  CatalogPokemon,
  CatalogRecordStatus,
  CatalogSearchIndexEntry,
  CatalogType,
  ShowdownId,
} from '../types/catalog'
import {
  localCatalogSeed,
  localCatalogSeedAbilities,
  localCatalogSeedAssets,
  localCatalogSeedItems,
  localCatalogSeedMoves,
  localCatalogSeedNatures,
  localCatalogSeedPokemon,
  localCatalogSeedSearchIndex,
  localCatalogSeedTypes,
} from './catalogSeed'

export type LocalCatalogRecord =
  | CatalogPokemon
  | CatalogMove
  | CatalogAbility
  | CatalogItem
  | CatalogType
  | CatalogNature

export interface LocalCatalogSearchQuery {
  searchText: string
  kind?: CatalogPickerKind
  limit?: number
}

export interface ResolvedCatalogAssetReference {
  icon?: CatalogAssetMetadata
  sprite?: CatalogAssetMetadata
  animatedSprite?: CatalogAssetMetadata
  artwork?: CatalogAssetMetadata
  fallbackText?: string
}

const localCatalogRecords: LocalCatalogRecord[] = [
  ...localCatalogSeedPokemon,
  ...localCatalogSeedMoves,
  ...localCatalogSeedAbilities,
  ...localCatalogSeedItems,
  ...localCatalogSeedTypes,
  ...localCatalogSeedNatures,
]

const normalizeSearchValue = (value: string) => value.trim().toLowerCase()

const statusToAvailability = (status: CatalogRecordStatus): CatalogPickerOption['availability'] => {
  if (status === 'available' || status === 'showdownOnly') {
    return 'selectable'
  }

  if (status === 'hidden') {
    return 'hidden'
  }

  return 'warning'
}

const scoreSearchEntry = (entry: CatalogSearchIndexEntry, searchText: string) => {
  const normalizedSearch = normalizeSearchValue(searchText)

  if (!normalizedSearch) {
    return 1
  }

  return entry.tokens.reduce((score, token) => {
    const normalizedToken = normalizeSearchValue(token.value)

    if (normalizedToken === normalizedSearch) {
      return score + token.weight * 4
    }

    if (normalizedToken.startsWith(normalizedSearch)) {
      return score + token.weight * 2
    }

    if (normalizedToken.includes(normalizedSearch)) {
      return score + token.weight
    }

    return score
  }, 0)
}

export function findCatalogRecordByKey(catalogKey: CatalogKey) {
  return localCatalogRecords.find((record) => record.catalogKey === catalogKey)
}

export function findCatalogRecordByShowdownId(showdownId: ShowdownId) {
  return localCatalogRecords.find((record) => record.showdownId === showdownId)
}

export function findCatalogPokemonByKey(catalogKey: CatalogKey) {
  return localCatalogSeedPokemon.find((pokemon) => pokemon.catalogKey === catalogKey)
}

export function findCatalogPokemonByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedPokemon.find((pokemon) => pokemon.showdownId === showdownId)
}

export function findCatalogMoveByKey(catalogKey: CatalogKey) {
  return localCatalogSeedMoves.find((move) => move.catalogKey === catalogKey)
}

export function findCatalogMoveByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedMoves.find((move) => move.showdownId === showdownId)
}

export function findCatalogAbilityByKey(catalogKey: CatalogKey) {
  return localCatalogSeedAbilities.find((ability) => ability.catalogKey === catalogKey)
}

export function findCatalogAbilityByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedAbilities.find((ability) => ability.showdownId === showdownId)
}

export function findCatalogItemByKey(catalogKey: CatalogKey) {
  return localCatalogSeedItems.find((item) => item.catalogKey === catalogKey)
}

export function findCatalogItemByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedItems.find((item) => item.showdownId === showdownId)
}

export function findCatalogTypeByKey(catalogKey: CatalogKey) {
  return localCatalogSeedTypes.find((type) => type.catalogKey === catalogKey)
}

export function findCatalogTypeByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedTypes.find((type) => type.showdownId === showdownId)
}

export function findCatalogNatureByKey(catalogKey: CatalogKey) {
  return localCatalogSeedNatures.find((nature) => nature.catalogKey === catalogKey)
}

export function findCatalogNatureByShowdownId(showdownId: ShowdownId) {
  return localCatalogSeedNatures.find((nature) => nature.showdownId === showdownId)
}

export function findCatalogAssetByKey(assetKey: CatalogKey) {
  return localCatalogSeedAssets.find((asset) => asset.assetKey === assetKey)
}

export function resolveCatalogAssetReference(asset?: CatalogAssetReference): ResolvedCatalogAssetReference {
  return {
    icon: asset?.iconKey ? findCatalogAssetByKey(asset.iconKey) : undefined,
    sprite: asset?.spriteKey ? findCatalogAssetByKey(asset.spriteKey) : undefined,
    animatedSprite: asset?.animatedSpriteKey ? findCatalogAssetByKey(asset.animatedSpriteKey) : undefined,
    artwork: asset?.artworkKey ? findCatalogAssetByKey(asset.artworkKey) : undefined,
    fallbackText: asset?.fallbackText,
  }
}

export function toPokemonPickerOption(pokemon: CatalogPokemon): CatalogPickerOption {
  return {
    catalogKey: pokemon.catalogKey,
    kind: 'pokemon',
    displayName: pokemon.displayName,
    showdownId: pokemon.showdownId,
    aliases: pokemon.aliases,
    description: pokemon.generationIntroduced
      ? `${pokemon.types.join(' / ')} Pokemon introduced in ${pokemon.generationIntroduced}.`
      : `${pokemon.types.join(' / ')} Pokemon.`,
    tags: [...pokemon.types.map((type) => type.toLowerCase()), 'pokemon'],
    asset: {
      iconKey: pokemon.iconKey,
      spriteKey: pokemon.spriteKey,
      animatedSpriteKey: pokemon.animatedSpriteKey,
      artworkKey: pokemon.artworkKey,
      fallbackText: pokemon.displayName.slice(0, 2).toUpperCase(),
    },
    primaryType: pokemon.types[0],
    secondaryType: pokemon.types[1],
    availability: statusToAvailability(pokemon.status),
    validationStatus: 'unknown',
  }
}

export function toMovePickerOption(move: CatalogMove): CatalogPickerOption {
  return {
    catalogKey: move.catalogKey,
    kind: 'move',
    displayName: move.displayName,
    showdownId: move.showdownId,
    aliases: move.aliases,
    description: move.shortDescription,
    tags: [move.type.toLowerCase(), move.category],
    primaryType: move.type,
    availability: statusToAvailability(move.status),
    validationStatus: 'unknown',
  }
}

export function toAbilityPickerOption(ability: CatalogAbility): CatalogPickerOption {
  return {
    catalogKey: ability.catalogKey,
    kind: 'ability',
    displayName: ability.displayName,
    showdownId: ability.showdownId,
    aliases: ability.aliases,
    description: ability.shortDescription,
    tags: ['ability'],
    availability: statusToAvailability(ability.status),
    validationStatus: 'unknown',
  }
}

export function toItemPickerOption(item: CatalogItem): CatalogPickerOption {
  return {
    catalogKey: item.catalogKey,
    kind: 'item',
    displayName: item.displayName,
    showdownId: item.showdownId,
    aliases: item.aliases,
    description: item.shortDescription,
    tags: ['item'],
    asset: item.iconKey
      ? {
          iconKey: item.iconKey,
          fallbackText: item.displayName.slice(0, 2).toUpperCase(),
        }
      : undefined,
    availability: statusToAvailability(item.status),
    validationStatus: 'unknown',
  }
}

export function toTypePickerOption(type: CatalogType): CatalogPickerOption {
  return {
    catalogKey: type.catalogKey,
    kind: 'type',
    displayName: type.displayName,
    showdownId: type.showdownId,
    aliases: type.aliases,
    description: type.matchupNotes,
    tags: ['type', type.type.toLowerCase()],
    asset: type.iconKey
      ? {
          iconKey: type.iconKey,
          fallbackText: type.displayName.slice(0, 2).toUpperCase(),
        }
      : undefined,
    primaryType: type.type,
    availability: statusToAvailability(type.status),
    validationStatus: 'unknown',
  }
}

export function toNaturePickerOption(nature: CatalogNature): CatalogPickerOption {
  return {
    catalogKey: nature.catalogKey,
    kind: 'nature',
    displayName: nature.displayName,
    showdownId: nature.showdownId,
    aliases: nature.aliases,
    description: nature.shortDescription,
    tags: ['nature'],
    increasedStat: nature.increasedStat,
    decreasedStat: nature.decreasedStat,
    availability: statusToAvailability(nature.status),
    validationStatus: 'unknown',
  }
}

export function getPokemonPickerOptions() {
  return localCatalogSeedPokemon.map(toPokemonPickerOption)
}

export function getMovePickerOptions() {
  return localCatalogSeedMoves.map(toMovePickerOption)
}

export function getAbilityPickerOptions() {
  return localCatalogSeedAbilities.map(toAbilityPickerOption)
}

export function getItemPickerOptions() {
  return localCatalogSeedItems.map(toItemPickerOption)
}

export function getTypePickerOptions() {
  return localCatalogSeedTypes.map(toTypePickerOption)
}

export function getNaturePickerOptions() {
  return localCatalogSeedNatures.map(toNaturePickerOption)
}

export function getCatalogPickerOptions(kind: CatalogPickerKind): CatalogPickerOption[] {
  if (kind === 'pokemon') return getPokemonPickerOptions()
  if (kind === 'move') return getMovePickerOptions()
  if (kind === 'ability') return getAbilityPickerOptions()
  if (kind === 'item') return getItemPickerOptions()
  if (kind === 'type') return getTypePickerOptions()
  return getNaturePickerOptions()
}

export function getCatalogPickerSearchText(option: CatalogPickerOption) {
  return [
    option.displayName,
    option.showdownId,
    ...option.aliases,
    option.description,
    option.primaryType,
    option.secondaryType,
    ...option.tags,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
}

export function searchLocalCatalog(query: LocalCatalogSearchQuery): CatalogSearchIndexEntry[] {
  const limit = query.limit ?? 20
  const scoredEntries = localCatalogSeedSearchIndex
    .filter((entry) => !query.kind || entry.kind === query.kind)
    .map((entry) => ({
      entry,
      score: scoreSearchEntry(entry, query.searchText),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.entry.displayName.localeCompare(right.entry.displayName)
    })

  return scoredEntries.slice(0, limit).map(({ entry }) => entry)
}

export function validateLocalCatalogSeedCounts() {
  const expected = localCatalogSeed.manifest.recordCounts

  return {
    pokemon: expected.pokemon === localCatalogSeedPokemon.length,
    moves: expected.moves === localCatalogSeedMoves.length,
    abilities: expected.abilities === localCatalogSeedAbilities.length,
    items: expected.items === localCatalogSeedItems.length,
    types: expected.types === localCatalogSeedTypes.length,
    natures: expected.natures === localCatalogSeedNatures.length,
    assets: expected.assets === localCatalogSeedAssets.length,
    searchIndexEntries: expected.searchIndexEntries === localCatalogSeedSearchIndex.length,
  }
}
