export interface PokeApiNamedResource {
  name: string;
  url: string;
}

export interface PokeApiLanguageTextEntry {
  text: string;
  language: PokeApiNamedResource;
}

export interface PokeApiFlavorTextEntry {
  flavor_text: string;
  language: PokeApiNamedResource;
}

export interface PokeApiPokemonSprites {
  front_default?: string | null;
  other?: {
    "official-artwork"?: {
      front_default?: string | null;
    };
  };
  versions?: {
    "generation-v"?: {
      "black-white"?: {
        animated?: {
          front_default?: string | null;
        };
      };
    };
  };
}

export interface PokeApiPokemonResource {
  id: number;
  name: string;
  sprites: PokeApiPokemonSprites;
  stats: Array<{
    base_stat: number;
    stat: PokeApiNamedResource;
  }>;
  types: Array<{
    slot: number;
    type: PokeApiNamedResource;
  }>;
}

export interface PokeApiMoveResource {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  priority: number;
  damage_class: PokeApiNamedResource;
  flavor_text_entries: PokeApiFlavorTextEntry[];
  target: PokeApiNamedResource;
  type: PokeApiNamedResource;
}

export interface PokeApiAbilityResource {
  id: number;
  name: string;
  flavor_text_entries: PokeApiFlavorTextEntry[];
}

export interface PokeApiItemSprites {
  default?: string | null;
}

export interface PokeApiItemResource {
  id: number;
  name: string;
  flavor_text_entries: PokeApiLanguageTextEntry[];
  sprites: PokeApiItemSprites;
}

export interface PokeApiTypeResource {
  id: number;
  name: string;
}

export interface PokeApiNatureResource {
  id: number;
  name: string;
  increased_stat: PokeApiNamedResource | null;
  decreased_stat: PokeApiNamedResource | null;
}

export interface PokeApiCatalogSourceSnapshot {
  fetchedAt: string;
  sourceVersion: string;
  pokemon: PokeApiPokemonResource[];
  moves: PokeApiMoveResource[];
  abilities: PokeApiAbilityResource[];
  items: PokeApiItemResource[];
  types: PokeApiTypeResource[];
  natures: PokeApiNatureResource[];
}

export type PokeApiNamedResourceFixture = PokeApiNamedResource;
export type PokeApiPokemonFixture = PokeApiPokemonResource;
export type PokeApiMoveFixture = PokeApiMoveResource;
export type PokeApiAbilityFixture = PokeApiAbilityResource;
export type PokeApiItemFixture = PokeApiItemResource;
export type PokeApiTypeFixture = PokeApiTypeResource;
export type PokeApiNatureFixture = PokeApiNatureResource;
export type PokeApiCatalogGeneratorSnapshot = PokeApiCatalogSourceSnapshot;
