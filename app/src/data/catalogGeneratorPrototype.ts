import type {
  BattleLabCatalog,
  CatalogAbility,
  CatalogAssetMetadata,
  CatalogItem,
  CatalogMove,
  CatalogMoveCategory,
  CatalogMoveTarget,
  CatalogNature,
  CatalogPokemon,
  CatalogSearchIndexEntry,
  CatalogSourceMetadata,
  CatalogType,
} from "../types/catalog";
import type { PokemonType, StatSpread } from "../types";
import {
  samplePokeApiCatalogGeneratorSnapshot,
  type PokeApiAbilityFixture,
  type PokeApiCatalogGeneratorSnapshot,
  type PokeApiItemFixture,
  type PokeApiMoveFixture,
  type PokeApiNatureFixture,
  type PokeApiPokemonFixture,
  type PokeApiTypeFixture,
} from "./catalogGeneratorFixtures";

const generatedAt = "2026-06-13T13:05:00.000Z";
const pokeApiSourceId = "source-pokeapi-generator-snapshot";

const pokemonTypes: PokemonType[] = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

const displayNameOverrides: Record<string, string> = {
  // Move display names
  "will-o-wisp": "Will-O-Wisp",
  // Pokemon form display names — hyphens preserved to match competitive convention
  "rotom-wash": "Rotom-Wash",
  "rotom-heat": "Rotom-Heat",
  "rotom-frost": "Rotom-Frost",
  "rotom-fan": "Rotom-Fan",
  "rotom-mow": "Rotom-Mow",
  "landorus-therian": "Landorus-Therian",
  "tornadus-therian": "Tornadus-Therian",
  "thundurus-therian": "Thundurus-Therian",
  "tornadus-incarnate": "Tornadus-Incarnate",
  "thundurus-incarnate": "Thundurus-Incarnate",
  "landorus-incarnate": "Landorus-Incarnate",
  "urshifu-rapid-strike": "Urshifu-Rapid-Strike",
  "urshifu-single-strike": "Urshifu-Single-Strike",
  "ogerpon-wellspring-mask": "Ogerpon-Wellspring-Mask",
  "ogerpon-hearthflame-mask": "Ogerpon-Hearthflame-Mask",
  "ogerpon-cornerstone-mask": "Ogerpon-Cornerstone-Mask",
  "palafin-hero": "Palafin-Hero",
  "basculegion-male": "Basculegion-M",
  "basculegion-female": "Basculegion-F",
  "indeedee-male": "Indeedee-M",
  "indeedee-female": "Indeedee-F",
  "ursaluna-bloodmoon": "Ursaluna-Bloodmoon",
  "tatsugiri-curly": "Tatsugiri-Curly",
  "tatsugiri-droopy": "Tatsugiri-Droopy",
  "tatsugiri-stretchy": "Tatsugiri-Stretchy",
  "maushold-family-of-four": "Maushold-Family-of-Four",
  "maushold-family-of-three": "Maushold-Family-of-Three",
  // Ability display names — lowercase conjunctions
  "vessel-of-ruin": "Vessel of Ruin",
  "sword-of-ruin": "Sword of Ruin",
  "tablets-of-ruin": "Tablets of Ruin",
  "beads-of-ruin": "Beads of Ruin",
  "well-baked-body": "Well-Baked Body",
};

const titleCase = (value: string) =>
  displayNameOverrides[value] ??
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const toShowdownId = (value: string) => value.replace(/[^a-z0-9]/g, "");

const toPokemonType = (value: string): PokemonType => {
  const normalized = titleCase(value) as PokemonType;

  if (!pokemonTypes.includes(normalized)) {
    throw new Error(`Unsupported Pokemon type "${value}" in generator fixture.`);
  }

  return normalized;
};

const toStatKey = (value: string): keyof StatSpread => {
  switch (value) {
    case "hp":
      return "hp";
    case "attack":
      return "atk";
    case "defense":
      return "def";
    case "special-attack":
      return "spa";
    case "special-defense":
      return "spd";
    case "speed":
      return "spe";
    default:
      throw new Error(`Unsupported stat "${value}" in generator fixture.`);
  }
};

const normalizeStats = (pokemon: PokeApiPokemonFixture): StatSpread =>
  pokemon.stats.reduce(
    (spread, entry) => ({
      ...spread,
      [toStatKey(entry.stat.name)]: entry.base_stat,
    }),
    { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as StatSpread,
  );

const getEnglishFlavorText = (
  entries: Array<{ flavor_text?: string; text?: string; language: { name: string } }>,
) => {
  const entry = entries.find((item) => item.language.name === "en");
  const text = entry?.flavor_text ?? entry?.text ?? "";

  return text.replace(/\s+/g, " ").trim();
};

const toMoveCategory = (value: string): CatalogMoveCategory => {
  if (value === "physical" || value === "special" || value === "status") return value;

  return "unknown";
};

const toMoveTarget = (value: string): CatalogMoveTarget => {
  switch (value) {
    case "user":
      return "self";
    case "selected-pokemon":
    case "specific-move":
      return "single";
    case "all-opponents":
      return "all-opponents";
    case "all-other-pokemon":
      return "all-adjacent";
    case "users-field":
    case "opponents-field":
      return "side";
    case "entire-field":
      return "field";
    default:
      return "unknown";
  }
};

const createPokemonAssets = (pokemon: PokeApiPokemonFixture): CatalogAssetMetadata[] => {
  const fallbackText = pokemon.name.slice(0, 2).toUpperCase();
  const assets: CatalogAssetMetadata[] = [];

  if (pokemon.sprites.front_default) {
    assets.push({
      assetKey: `asset-pokemon-${pokemon.name}-static`,
      kind: "pokemon-sprite",
      format: "png",
      sourceId: pokeApiSourceId,
      sourceName: "PokeAPI sprite metadata fixture",
      candidateSourceUrl: pokemon.sprites.front_default,
      localCacheKey: `pokemon/${pokemon.name}/static.png`,
      licenseReviewStatus: "needsReview",
      fallbackBehavior: "use-text",
      fallbackText,
    });
  }

  const animatedSprite = pokemon.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;
  if (animatedSprite) {
    assets.push({
      assetKey: `asset-pokemon-${pokemon.name}-animated`,
      kind: "pokemon-animated-sprite",
      format: "gif",
      sourceId: pokeApiSourceId,
      sourceName: "PokeAPI Generation V animated sprite metadata fixture",
      candidateSourceUrl: animatedSprite,
      localCacheKey: `pokemon/${pokemon.name}/animated.gif`,
      licenseReviewStatus: "needsReview",
      fallbackBehavior: "use-static",
      fallbackText,
    });
  }

  const artwork = pokemon.sprites.other?.["official-artwork"]?.front_default;
  if (artwork) {
    assets.push({
      assetKey: `asset-pokemon-${pokemon.name}-artwork`,
      kind: "pokemon-artwork",
      format: "png",
      sourceId: pokeApiSourceId,
      sourceName: "PokeAPI official artwork metadata fixture",
      candidateSourceUrl: artwork,
      localCacheKey: `pokemon/${pokemon.name}/artwork.png`,
      licenseReviewStatus: "needsReview",
      fallbackBehavior: "use-static",
      fallbackText,
    });
  }

  return assets;
};

const createItemAssets = (item: PokeApiItemFixture): CatalogAssetMetadata[] => {
  if (!item.sprites.default) return [];

  return [
    {
      assetKey: `asset-item-${item.name}-icon`,
      kind: "item-icon",
      format: "png",
      sourceId: pokeApiSourceId,
      sourceName: "PokeAPI item sprite metadata fixture",
      candidateSourceUrl: item.sprites.default,
      localCacheKey: `items/${item.name}/icon.png`,
      licenseReviewStatus: "needsReview",
      fallbackBehavior: "use-text",
      fallbackText: item.name.slice(0, 2).toUpperCase(),
    },
  ];
};

export const sampleCatalogGeneratorSourceMetadata: CatalogSourceMetadata = {
  sourceId: pokeApiSourceId,
  kind: "pokeapi",
  name: "PokeAPI checked-in generator snapshot fixture",
  baseUrl: "https://pokeapi.co/api/v2",
  documentationUrl: "https://pokeapi.co/docs/v2",
  version: samplePokeApiCatalogGeneratorSnapshot.sourceVersion,
  fetchedAt: samplePokeApiCatalogGeneratorSnapshot.fetchedAt,
  requiresAttribution: false,
};

export function normalizePokeApiPokemonFixture(pokemon: PokeApiPokemonFixture): CatalogPokemon {
  const types = pokemon.types
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => toPokemonType(entry.type.name));
  const baseStats = normalizeStats(pokemon);
  const displayName = titleCase(pokemon.name);
  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => {
      const abilityShowdownId = toShowdownId(entry.ability.name);

      return {
        catalogKey: `ability-${entry.ability.name}`,
        showdownId: abilityShowdownId,
        displayName: titleCase(entry.ability.name),
        slot: entry.slot,
        hidden: entry.is_hidden,
      };
    });
  const spriteKey = pokemon.sprites.front_default ? `asset-pokemon-${pokemon.name}-static` : undefined;
  const animatedSpriteKey = pokemon.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default
    ? `asset-pokemon-${pokemon.name}-animated`
    : undefined;
  const artworkKey = pokemon.sprites.other?.["official-artwork"]?.front_default
    ? `asset-pokemon-${pokemon.name}-artwork`
    : undefined;

  return {
    kind: "pokemon",
    catalogKey: `pokemon-${pokemon.name}`,
    showdownId: toShowdownId(pokemon.name),
    pokeApiId: pokemon.id,
    displayName,
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    nationalDexNumber: pokemon.id,
    defaultFormKey: `pokemon-${pokemon.name}-form-default`,
    forms: [
      {
        catalogKey: `pokemon-${pokemon.name}-form-default`,
        showdownId: toShowdownId(pokemon.name),
        displayName,
        aliases: [],
        isDefault: true,
        types,
        baseStats,
        spriteKey,
        animatedSpriteKey,
        artworkKey,
      },
    ],
    types,
    baseStats,
    spriteKey,
    animatedSpriteKey,
    artworkKey,
    abilities,
    preferredVisualModes: animatedSpriteKey ? ["static", "animated"] : ["static"],
  };
}

export function normalizePokeApiMoveFixture(move: PokeApiMoveFixture): CatalogMove {
  return {
    kind: "move",
    catalogKey: `move-${move.name}`,
    showdownId: toShowdownId(move.name),
    pokeApiId: move.id,
    displayName: titleCase(move.name),
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    type: toPokemonType(move.type.name),
    category: toMoveCategory(move.damage_class.name),
    ...(move.power !== null ? { power: move.power } : {}),
    ...(move.accuracy !== null ? { accuracy: move.accuracy } : {}),
    ...(move.priority !== 0 ? { priority: move.priority } : {}),
    ...(move.pp !== null ? { pp: move.pp } : {}),
    target: toMoveTarget(move.target.name),
    shortDescription: getEnglishFlavorText(move.flavor_text_entries),
  };
}

export function normalizePokeApiAbilityFixture(ability: PokeApiAbilityFixture): CatalogAbility {
  return {
    kind: "ability",
    catalogKey: `ability-${ability.name}`,
    showdownId: toShowdownId(ability.name),
    pokeApiId: ability.id,
    displayName: titleCase(ability.name),
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    shortDescription: getEnglishFlavorText(ability.flavor_text_entries),
  };
}

export function normalizePokeApiItemFixture(item: PokeApiItemFixture): CatalogItem {
  const iconKey = item.sprites.default ? `asset-item-${item.name}-icon` : undefined;

  return {
    kind: "item",
    catalogKey: `item-${item.name}`,
    showdownId: toShowdownId(item.name),
    pokeApiId: item.id,
    displayName: titleCase(item.name),
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    shortDescription: getEnglishFlavorText(item.flavor_text_entries),
    ...(iconKey ? { iconKey } : {}),
  };
}

export function normalizePokeApiTypeFixture(type: PokeApiTypeFixture): CatalogType {
  const pokemonType = toPokemonType(type.name);

  return {
    kind: "type",
    catalogKey: `type-${type.name}`,
    showdownId: toShowdownId(type.name),
    pokeApiId: type.id,
    displayName: pokemonType,
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    type: pokemonType,
    colorToken: `type-${type.name}`,
    matchupNotes: "Enrichment metadata only; Pokemon Showdown owns matchup and format legality.",
  };
}

export function normalizePokeApiNatureFixture(nature: PokeApiNatureFixture): CatalogNature {
  return {
    kind: "nature",
    catalogKey: `nature-${nature.name}`,
    showdownId: toShowdownId(nature.name),
    pokeApiId: nature.id,
    displayName: titleCase(nature.name),
    aliases: [],
    status: "available",
    sourceIds: [pokeApiSourceId],
    ...(nature.increased_stat ? { increasedStat: toStatKey(nature.increased_stat.name) } : {}),
    ...(nature.decreased_stat ? { decreasedStat: toStatKey(nature.decreased_stat.name) } : {}),
    shortDescription:
      nature.increased_stat && nature.decreased_stat
        ? `Raises ${titleCase(nature.increased_stat.name)} and lowers ${titleCase(nature.decreased_stat.name)}.`
        : "Neutral nature metadata from PokeAPI snapshot.",
  };
}

const createSearchIndexEntry = (
  record: {
    catalogKey: string;
    kind: CatalogSearchIndexEntry["kind"];
    displayName: string;
    aliases: string[];
    showdownId?: string;
    shortDescription?: string;
    type?: PokemonType;
    types?: PokemonType[];
  },
  asset?: CatalogSearchIndexEntry["asset"],
): CatalogSearchIndexEntry => ({
  catalogKey: record.catalogKey,
  kind: record.kind,
  displayName: record.displayName,
  aliases: record.aliases,
  tokens: [
    { value: record.displayName, weight: 10, source: "displayName" },
    ...record.aliases.map((alias) => ({ value: alias, weight: 7, source: "alias" as const })),
    ...(record.showdownId ? [{ value: record.showdownId, weight: 8, source: "showdownId" as const }] : []),
    ...(record.shortDescription
      ? [{ value: record.shortDescription, weight: 2, source: "description" as const }]
      : []),
    ...(record.type ? [{ value: record.type, weight: 4, source: "type" as const }] : []),
    ...(record.types?.map((type) => ({ value: type, weight: 4, source: "type" as const })) ?? []),
  ],
  ...(asset ? { asset } : {}),
});

export function generateCatalogFromPokeApiSnapshot(
  snapshot: PokeApiCatalogGeneratorSnapshot = samplePokeApiCatalogGeneratorSnapshot,
): BattleLabCatalog {
  const pokemon = snapshot.pokemon.map(normalizePokeApiPokemonFixture);
  const moves = snapshot.moves.map(normalizePokeApiMoveFixture);
  const abilities = snapshot.abilities.map(normalizePokeApiAbilityFixture);
  const items = snapshot.items.map(normalizePokeApiItemFixture);
  const types = snapshot.types.map(normalizePokeApiTypeFixture);
  const natures = snapshot.natures.map(normalizePokeApiNatureFixture);
  const assets = [
    ...snapshot.pokemon.flatMap(createPokemonAssets),
    ...snapshot.items.flatMap(createItemAssets),
  ];
  const searchIndex: CatalogSearchIndexEntry[] = [
    ...pokemon.map((record) =>
      createSearchIndexEntry(record, {
        spriteKey: record.spriteKey,
        animatedSpriteKey: record.animatedSpriteKey,
        artworkKey: record.artworkKey,
        fallbackText: record.displayName.slice(0, 2).toUpperCase(),
      }),
    ),
    ...moves.map((record) => createSearchIndexEntry(record)),
    ...abilities.map((record) => createSearchIndexEntry(record)),
    ...items.map((record) =>
      createSearchIndexEntry(
        record,
        record.iconKey ? { iconKey: record.iconKey, fallbackText: record.displayName.slice(0, 2).toUpperCase() } : undefined,
      ),
    ),
    ...types.map((record) => createSearchIndexEntry(record)),
    ...natures.map((record) => createSearchIndexEntry(record)),
  ];

  return {
    manifest: {
      schemaVersion: "catalog-generator-prototype-0.1",
      generatedAt,
      sources: [
        {
          ...sampleCatalogGeneratorSourceMetadata,
          version: snapshot.sourceVersion,
          fetchedAt: snapshot.fetchedAt,
        },
      ],
      recordCounts: {
        pokemon: pokemon.length,
        moves: moves.length,
        abilities: abilities.length,
        items: items.length,
        types: types.length,
        natures: natures.length,
        assets: assets.length,
        searchIndexEntries: searchIndex.length,
      },
      assetPolicy: {
        allowRemoteUrls: false,
        bundledAssetsPreferred: true,
        licenseReviewRequired: true,
      },
      showdownDataVersion: "future-showdown-authority-not-run",
      warnings: [
        "Generated from checked-in PokeAPI-shaped snapshot fixtures only; no live network fetch is performed.",
        "PokeAPI output is enrichment-only. Pokemon Showdown remains the legality and simulation source of truth.",
        "Sprite URLs are candidate metadata only and are not approved production sprite sources.",
      ],
    },
    pokemon,
    moves,
    abilities,
    items,
    types,
    natures,
    assets,
    searchIndex,
  };
}

export const sampleGeneratedPokeApiCatalog = generateCatalogFromPokeApiSnapshot();
