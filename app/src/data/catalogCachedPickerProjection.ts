import type { CatalogPickerOption } from '../types/catalog'
import { readCatalogUpdateGeneratedCatalogCache } from './catalogUpdateCache'
import {
  toAbilityPickerOption,
  toItemPickerOption,
  toMovePickerOption,
  toNaturePickerOption,
  toPokemonPickerOption,
  toTypePickerOption,
} from './catalogSelectors'

export interface CatalogCachedPickerProjectionOptionSets {
  pokemon: CatalogPickerOption[]
  moves: CatalogPickerOption[]
  abilities: CatalogPickerOption[]
  items: CatalogPickerOption[]
  types: CatalogPickerOption[]
  natures: CatalogPickerOption[]
}

export interface CatalogCachedPickerProjection {
  source: 'catalog-update-cache'
  fetchedAt: string
  sourceVersion: string
  optionSets: CatalogCachedPickerProjectionOptionSets
  pokemonMoveIdsByShowdownId: Record<string, string[]>
}

export async function createCachedCatalogPickerProjection(): Promise<CatalogCachedPickerProjection | null> {
  const cacheEntry = await readCatalogUpdateGeneratedCatalogCache()

  if (!cacheEntry) return null

  return {
    source: 'catalog-update-cache',
    fetchedAt: cacheEntry.fetchedAt,
    sourceVersion: cacheEntry.sourceVersion,
    optionSets: {
      pokemon: cacheEntry.catalog.pokemon.map(toPokemonPickerOption),
      moves: cacheEntry.catalog.moves.map(toMovePickerOption),
      abilities: cacheEntry.catalog.abilities.map(toAbilityPickerOption),
      items: cacheEntry.catalog.items.map(toItemPickerOption),
      types: cacheEntry.catalog.types.map(toTypePickerOption),
      natures: cacheEntry.catalog.natures.map(toNaturePickerOption),
    },
    pokemonMoveIdsByShowdownId: cacheEntry.pokemonMoveIdsByShowdownId,
  }
}
