import type { PokemonType, StatSpread } from "../types";
import type {
  PokeApiAbilityFixture,
  PokeApiCatalogGeneratorSnapshot,
  PokeApiItemFixture,
  PokeApiMoveFixture,
  PokeApiNamedResourceFixture,
  PokeApiNatureFixture,
  PokeApiPokemonFixture,
} from "../types/pokeApiSource";

export type {
  PokeApiAbilityFixture,
  PokeApiCatalogGeneratorSnapshot,
  PokeApiItemFixture,
  PokeApiMoveFixture,
  PokeApiNamedResourceFixture,
  PokeApiNatureFixture,
  PokeApiPokemonFixture,
  PokeApiTypeFixture,
} from "../types/pokeApiSource";

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

const pokemonSprites = (id: number, name: string): PokeApiPokemonFixture["sprites"] => ({
  front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  other: {
    "official-artwork": {
      front_default:
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    },
  },
  versions: {
    "generation-v": {
      "black-white": {
        animated: {
          front_default:
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${name}.gif`,
        },
      },
    },
  },
});

const pokemon = (
  id: number,
  name: string,
  baseStats: StatSpread,
  types: PokemonType[],
): PokeApiPokemonFixture => ({
  id,
  name,
  sprites: pokemonSprites(id, name),
  stats: stats(baseStats),
  types: pokemonTypes(...types),
});

const move = (
  id: number,
  name: string,
  type: PokemonType,
  damageClass: "physical" | "special" | "status",
  target: string,
  description: string,
  options: {
    accuracy?: number | null;
    power?: number | null;
    pp?: number | null;
    priority?: number;
  } = {},
): PokeApiMoveFixture => ({
  id,
  name,
  accuracy: options.accuracy ?? null,
  power: options.power ?? null,
  pp: options.pp ?? null,
  priority: options.priority ?? 0,
  damage_class: named("move-damage-class", damageClass),
  flavor_text_entries: [englishFlavor(description)],
  target: named("move-target", target),
  type: named("type", type.toLowerCase()),
});

const ability = (id: number, name: string, description: string): PokeApiAbilityFixture => ({
  id,
  name,
  flavor_text_entries: [englishFlavor(description)],
});

const item = (id: number, name: string, description: string): PokeApiItemFixture => ({
  id,
  name,
  flavor_text_entries: [englishItemFlavor(description)],
  sprites: {
    default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`,
  },
});

const nature = (
  id: number,
  name: string,
  increasedStat: string,
  decreasedStat: string,
): PokeApiNatureFixture => ({
  id,
  name,
  increased_stat: named("stat", increasedStat),
  decreased_stat: named("stat", decreasedStat),
});

const typeFixtures: Array<{ id: number; name: string }> = [
  { id: 1, name: "normal" },
  { id: 10, name: "fire" },
  { id: 11, name: "water" },
  { id: 13, name: "electric" },
  { id: 12, name: "grass" },
  { id: 15, name: "ice" },
  { id: 2, name: "fighting" },
  { id: 4, name: "poison" },
  { id: 5, name: "ground" },
  { id: 3, name: "flying" },
  { id: 14, name: "psychic" },
  { id: 7, name: "bug" },
  { id: 6, name: "rock" },
  { id: 8, name: "ghost" },
  { id: 16, name: "dragon" },
  { id: 17, name: "dark" },
  { id: 9, name: "steel" },
  { id: 18, name: "fairy" },
];

export const samplePokeApiCatalogGeneratorSnapshot: PokeApiCatalogGeneratorSnapshot = {
  fetchedAt: "2026-06-13T13:00:00.000Z",
  sourceVersion: "pokeapi-snapshot-fixture-0.2",
  pokemon: [
    pokemon(248, "tyranitar", { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 }, ["Rock", "Dark"]),
    pokemon(530, "excadrill", { hp: 110, atk: 135, def: 60, spa: 50, spd: 65, spe: 88 }, ["Ground", "Steel"]),
    pokemon(591, "amoonguss", { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 }, ["Grass", "Poison"]),
    pokemon(663, "talonflame", { hp: 78, atk: 81, def: 71, spa: 74, spd: 69, spe: 126 }, ["Fire", "Flying"]),
    pokemon(10008, "rotom-wash", { hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86 }, ["Electric", "Water"]),
    pokemon(445, "garchomp", { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 }, ["Dragon", "Ground"]),
    pokemon(700, "sylveon", { hp: 95, atk: 65, def: 65, spa: 110, spd: 130, spe: 60 }, ["Fairy"]),
  ],
  moves: [
    move(157, "rock-slide", "Rock", "physical", "all-opponents", "Large boulders are hurled at opposing Pokemon.", {
      accuracy: 90,
      power: 75,
      pp: 10,
    }),
    move(282, "knock-off", "Dark", "physical", "selected-pokemon", "The user slaps down the target item.", {
      accuracy: 100,
      power: 65,
      pp: 20,
    }),
    move(67, "low-kick", "Fighting", "physical", "selected-pokemon", "A low kick that inflicts greater damage on heavier targets.", {
      accuracy: 100,
      pp: 20,
    }),
    move(851, "tera-blast", "Normal", "special", "selected-pokemon", "If the user has Terastallized, this move changes type.", {
      accuracy: 100,
      power: 80,
      pp: 10,
    }),
    move(667, "high-horsepower", "Ground", "physical", "selected-pokemon", "The user fiercely attacks the target using its body.", {
      accuracy: 95,
      power: 95,
      pp: 10,
    }),
    move(442, "iron-head", "Steel", "physical", "selected-pokemon", "The user slams the target with its steel-hard head.", {
      accuracy: 100,
      power: 80,
      pp: 15,
    }),
    move(182, "protect", "Normal", "status", "user", "Enables the user to protect itself from attacks.", {
      pp: 10,
      priority: 4,
    }),
    move(14, "swords-dance", "Normal", "status", "user", "A frenetic dance sharply raises the user's Attack stat.", {
      pp: 20,
    }),
    move(366, "tailwind", "Flying", "status", "users-field", "The user whips up turbulent winds that boost ally Speed.", {
      pp: 15,
    }),
    move(413, "brave-bird", "Flying", "physical", "selected-pokemon", "The user tucks in its wings and charges from a low altitude.", {
      accuracy: 100,
      power: 120,
      pp: 15,
    }),
    move(261, "will-o-wisp", "Fire", "status", "selected-pokemon", "The user shoots a sinister flame that burns the target.", {
      accuracy: 85,
      pp: 15,
    }),
    move(147, "spore", "Grass", "status", "selected-pokemon", "The user scatters bursts of spores that induce sleep.", {
      accuracy: 100,
      pp: 15,
    }),
    move(476, "rage-powder", "Bug", "status", "user", "The user scatters powder to draw attention to itself.", {
      pp: 20,
      priority: 2,
    }),
    move(676, "pollen-puff", "Bug", "special", "selected-pokemon", "The user attacks with a pollen puff that can also heal allies.", {
      accuracy: 100,
      power: 90,
      pp: 15,
    }),
  ],
  abilities: [
    ability(45, "sand-stream", "The Pokemon summons a sandstorm when it enters battle."),
    ability(146, "sand-rush", "Boosts Speed in a sandstorm."),
    ability(144, "regenerator", "Restores HP when the Pokemon switches out."),
    ability(177, "gale-wings", "Gives priority to Flying-type moves when HP is full."),
    ability(26, "levitate", "Gives immunity to Ground-type moves."),
    ability(24, "rough-skin", "Damages attackers that make contact."),
    ability(182, "pixilate", "Turns Normal-type moves into Fairy-type moves and boosts them."),
  ],
  items: [
    item(640, "assault-vest", "Raises Sp. Def but prevents the use of status moves."),
    item(1882, "clear-amulet", "Protects the holder from having its stats lowered by opponents."),
    item(1885, "covert-cloak", "Conceals the holder and protects it from additional effects of moves."),
    item(158, "sitrus-berry", "Restores HP when the holder's HP gets low."),
    item(234, "leftovers", "Restores a little HP to the holder every turn."),
    item(275, "focus-sash", "Lets the holder endure one potential knockout hit from full HP."),
  ],
  types: typeFixtures,
  natures: [
    nature(4, "adamant", "attack", "special-attack"),
    nature(13, "jolly", "speed", "special-attack"),
    nature(7, "relaxed", "defense", "speed"),
    nature(15, "modest", "special-attack", "attack"),
    nature(14, "timid", "speed", "attack"),
    nature(22, "calm", "special-defense", "attack"),
  ],
};
