import type { PokemonType, StatSpread } from "../types";

export interface PokeApiNamedResourceFixture {
  name: string;
  url: string;
}

export interface PokeApiPokemonFixture {
  id: number;
  name: string;
  sprites: {
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
  };
  stats: Array<{
    base_stat: number;
    stat: PokeApiNamedResourceFixture;
  }>;
  types: Array<{
    slot: number;
    type: PokeApiNamedResourceFixture;
  }>;
}

export interface PokeApiMoveFixture {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  priority: number;
  damage_class: PokeApiNamedResourceFixture;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: PokeApiNamedResourceFixture;
  }>;
  target: PokeApiNamedResourceFixture;
  type: PokeApiNamedResourceFixture;
}

export interface PokeApiAbilityFixture {
  id: number;
  name: string;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: PokeApiNamedResourceFixture;
  }>;
}

export interface PokeApiItemFixture {
  id: number;
  name: string;
  flavor_text_entries: Array<{
    text: string;
    language: PokeApiNamedResourceFixture;
  }>;
  sprites: {
    default?: string | null;
  };
}

export interface PokeApiTypeFixture {
  id: number;
  name: string;
}

export interface PokeApiNatureFixture {
  id: number;
  name: string;
  increased_stat: PokeApiNamedResourceFixture | null;
  decreased_stat: PokeApiNamedResourceFixture | null;
}

export interface PokeApiCatalogGeneratorSnapshot {
  fetchedAt: string;
  sourceVersion: string;
  pokemon: PokeApiPokemonFixture[];
  moves: PokeApiMoveFixture[];
  abilities: PokeApiAbilityFixture[];
  items: PokeApiItemFixture[];
  types: PokeApiTypeFixture[];
  natures: PokeApiNatureFixture[];
}

const apiUrl = (resource: string, idOrName: string | number) =>
  `https://pokeapi.co/api/v2/${resource}/${idOrName}/`;

const named = (resource: string, name: string, idOrName: string | number = name): PokeApiNamedResourceFixture => ({
  name,
  url: apiUrl(resource, idOrName),
});

const stats = (values: StatSpread): PokeApiPokemonFixture["stats"] => [
  { base_stat: values.hp, stat: named("stat", "hp", 1) },
  { base_stat: values.atk, stat: named("stat", "attack", 2) },
  { base_stat: values.def, stat: named("stat", "defense", 3) },
  { base_stat: values.spa, stat: named("stat", "special-attack", 4) },
  { base_stat: values.spd, stat: named("stat", "special-defense", 5) },
  { base_stat: values.spe, stat: named("stat", "speed", 6) },
];

const pokemonTypes = (...types: PokemonType[]): PokeApiPokemonFixture["types"] =>
  types.map((type, index) => ({
    slot: index + 1,
    type: named("type", type.toLowerCase(), index + 1),
  }));

const englishFlavor = (text: string) => ({
  flavor_text: text,
  language: named("language", "en", 9),
});

const englishItemFlavor = (text: string) => ({
  text,
  language: named("language", "en", 9),
});

export const samplePokeApiCatalogGeneratorSnapshot: PokeApiCatalogGeneratorSnapshot = {
  fetchedAt: "2026-06-13T13:00:00.000Z",
  sourceVersion: "pokeapi-snapshot-fixture-0.1",
  pokemon: [
    {
      id: 248,
      name: "tyranitar",
      sprites: {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/248.png",
        other: {
          "official-artwork": {
            front_default:
              "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/248.png",
          },
        },
        versions: {
          "generation-v": {
            "black-white": {
              animated: {
                front_default:
                  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/248.gif",
              },
            },
          },
        },
      },
      stats: stats({ hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 }),
      types: pokemonTypes("Rock", "Dark"),
    },
    {
      id: 530,
      name: "excadrill",
      sprites: {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/530.png",
        other: {
          "official-artwork": {
            front_default:
              "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/530.png",
          },
        },
        versions: {
          "generation-v": {
            "black-white": {
              animated: {
                front_default:
                  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/530.gif",
              },
            },
          },
        },
      },
      stats: stats({ hp: 110, atk: 135, def: 60, spa: 50, spd: 65, spe: 88 }),
      types: pokemonTypes("Ground", "Steel"),
    },
  ],
  moves: [
    {
      id: 157,
      name: "rock-slide",
      accuracy: 90,
      power: 75,
      pp: 10,
      priority: 0,
      damage_class: named("move-damage-class", "physical", 2),
      flavor_text_entries: [englishFlavor("Large boulders are hurled at opposing Pokemon.")],
      target: named("move-target", "all-opponents", 11),
      type: named("type", "rock", 6),
    },
    {
      id: 667,
      name: "high-horsepower",
      accuracy: 95,
      power: 95,
      pp: 10,
      priority: 0,
      damage_class: named("move-damage-class", "physical", 2),
      flavor_text_entries: [englishFlavor("The user fiercely attacks the target using its body.")],
      target: named("move-target", "selected-pokemon", 10),
      type: named("type", "ground", 5),
    },
  ],
  abilities: [
    {
      id: 45,
      name: "sand-stream",
      flavor_text_entries: [englishFlavor("The Pokemon summons a sandstorm when it enters battle.")],
    },
    {
      id: 146,
      name: "sand-rush",
      flavor_text_entries: [englishFlavor("Boosts Speed in a sandstorm.")],
    },
  ],
  items: [
    {
      id: 640,
      name: "assault-vest",
      flavor_text_entries: [englishItemFlavor("Raises Sp. Def but prevents status moves.")],
      sprites: {
        default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/assault-vest.png",
      },
    },
  ],
  types: [
    { id: 6, name: "rock" },
    { id: 5, name: "ground" },
    { id: 17, name: "dark" },
    { id: 9, name: "steel" },
  ],
  natures: [
    {
      id: 4,
      name: "adamant",
      increased_stat: named("stat", "attack", 2),
      decreased_stat: named("stat", "special-attack", 4),
    },
    {
      id: 13,
      name: "jolly",
      increased_stat: named("stat", "speed", 6),
      decreased_stat: named("stat", "special-attack", 4),
    },
  ],
};
