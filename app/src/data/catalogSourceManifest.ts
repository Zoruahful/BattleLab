import type { CatalogPipelineSourceRole } from "../types/catalogPipeline";

export type CatalogSourceManifestSection =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures";

export type CatalogSourceCoverageTier =
  | "current-team-builder-editor"
  | "complete-type-picker"
  | "broad-catalog-foundation"
  | "complete-nature-picker";

export type CatalogSourceResourceSetMode =
  | "curated-resource-ids"
  | "complete-static-list"
  | "paginated-source-discovery";

export type CatalogSourceExpansionApprovalStatus =
  | "active-approved-sample"
  | "planned-lead-review"
  | "blocked-until-lead-approval";

export interface CatalogSourceManifestExpansionPolicy {
  targetCoverageTier: CatalogSourceCoverageTier;
  resourceSetMode: CatalogSourceResourceSetMode;
  approvalStatus: CatalogSourceExpansionApprovalStatus;
  plannedResourceIds: readonly string[];
  expectedMinimumCount?: number;
  discoveryEndpoint?: string;
  notes: string[];
}

export interface CatalogSourceManifestSectionEntry {
  section: CatalogSourceManifestSection;
  sourceRole: Extract<CatalogPipelineSourceRole, "enrichment">;
  coverageTier: CatalogSourceCoverageTier;
  resourceSetMode: CatalogSourceResourceSetMode;
  resourceIds: readonly string[];
  expectedCount: number;
  expansionPolicy: CatalogSourceManifestExpansionPolicy;
  notes: string[];
}

export interface CatalogSourceManifest {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceRole: Extract<CatalogPipelineSourceRole, "enrichment">;
  legalityAuthority: "pokemon-showdown";
  simulationAuthority: "pokemon-showdown";
  spriteMetadataPolicy: "candidate-review-gated";
  sections: Record<CatalogSourceManifestSection, CatalogSourceManifestSectionEntry>;
  notes: string[];
}

const createSection = (
  section: CatalogSourceManifestSection,
  coverageTier: CatalogSourceCoverageTier,
  resourceIds: readonly string[],
  expansionPolicy: CatalogSourceManifestExpansionPolicy,
  notes: string[],
): CatalogSourceManifestSectionEntry => ({
  section,
  sourceRole: "enrichment",
  coverageTier,
  resourceSetMode: "curated-resource-ids",
  resourceIds,
  expectedCount: resourceIds.length,
  expansionPolicy,
  notes,
});

const createExpansionPolicy = (
  targetCoverageTier: CatalogSourceCoverageTier,
  resourceSetMode: CatalogSourceResourceSetMode,
  plannedResourceIds: readonly string[],
  notes: string[],
  options: Pick<CatalogSourceManifestExpansionPolicy, "discoveryEndpoint" | "expectedMinimumCount"> = {},
): CatalogSourceManifestExpansionPolicy => ({
  targetCoverageTier,
  resourceSetMode,
  approvalStatus: "planned-lead-review",
  plannedResourceIds,
  ...options,
  notes,
});

const plannedPokemonExpansionResourceIds = [
  "tyranitar",
  "excadrill",
  "amoonguss",
  "talonflame",
  "rotom-wash",
  "garchomp",
  "sylveon",
  "arcanine",
  "dragonite",
  "kingambit",
  "grimmsnarl",
  "flutter-mane",
  "gastrodon",
  "incineroar",
  "rillaboom",
  "pelipper",
  "archaludon",
  "basculegion",
  "dondozo",
  "tatsugiri",
  "farigiraf",
  "indeedee-female",
  "ursaluna-bloodmoon",
  "annihilape",
  "gholdengo",
  "maushold",
  "volcarona",
  "whimsicott",
  "mienshao",
  "primarina",
] as const;

const plannedMoveExpansionResourceIds = [
  "rock-slide",
  "knock-off",
  "low-kick",
  "tera-blast",
  "high-horsepower",
  "iron-head",
  "protect",
  "swords-dance",
  "tailwind",
  "brave-bird",
  "will-o-wisp",
  "spore",
  "rage-powder",
  "pollen-puff",
  "earthquake",
  "stomping-tantrum",
  "crunch",
  "heat-wave",
  "flamethrower",
  "hydro-pump",
  "thunderbolt",
  "moonblast",
  "hyper-voice",
  "icy-wind",
  "fake-out",
  "follow-me",
  "trick-room",
  "helping-hand",
  "dark-pulse",
  "dragon-claw",
  "flare-blitz",
  "wood-hammer",
  "grassy-glide",
  "draco-meteor",
  "electroweb",
  "snarl",
  "parting-shot",
  "wide-guard",
  "make-it-rain",
  "shadow-ball",
  "dazzling-gleam",
  "close-combat",
  "final-gambit",
  "aqua-jet",
  "wave-crash",
  "order-up",
  "population-bomb",
  "taunt",
  "encore",
] as const;

const plannedAbilityExpansionResourceIds = [
  "sand-stream",
  "sand-rush",
  "regenerator",
  "gale-wings",
  "levitate",
  "rough-skin",
  "pixilate",
  "intimidate",
  "inner-focus",
  "supreme-overlord",
  "prankster",
  "protosynthesis",
  "storm-drain",
  "grassy-surge",
  "drizzle",
  "stamina",
  "commander",
  "armor-tail",
  "psychic-surge",
  "defiant",
  "good-as-gold",
  "friend-guard",
  "flame-body",
  "chlorophyll",
  "unaware",
] as const;

const plannedItemExpansionResourceIds = [
  "assault-vest",
  "clear-amulet",
  "covert-cloak",
  "sitrus-berry",
  "leftovers",
  "focus-sash",
  "choice-band",
  "choice-specs",
  "choice-scarf",
  "life-orb",
  "safety-goggles",
  "lum-berry",
  "booster-energy",
  "mental-herb",
  "rocky-helmet",
  "eviolite",
  "mystic-water",
  "miracle-seed",
  "black-glasses",
  "dragon-fang",
  "fairy-feather",
  "throat-spray",
  "room-service",
  "loaded-dice",
  "ability-shield",
  "air-balloon",
  "weakness-policy",
] as const;

const allPokemonTypeResourceIds = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

const allNatureResourceIds = [
  "adamant",
  "bashful",
  "bold",
  "brave",
  "calm",
  "careful",
  "docile",
  "gentle",
  "hardy",
  "hasty",
  "impish",
  "jolly",
  "lax",
  "lonely",
  "mild",
  "modest",
  "naive",
  "naughty",
  "quiet",
  "quirky",
  "rash",
  "relaxed",
  "sassy",
  "serious",
  "timid",
] as const;

export const approvedCatalogLiveFetchSampleManifest: CatalogSourceManifest = {
  id: "catalog-live-fetch-approved-sample-coverage-v2",
  sourceId: "source-pokeapi-live-fetch-prototype",
  sourceName: "PokeAPI live-fetch prototype",
  sourceRole: "enrichment",
  legalityAuthority: "pokemon-showdown",
  simulationAuthority: "pokemon-showdown",
  spriteMetadataPolicy: "candidate-review-gated",
  sections: {
    pokemon: createSection(
      "pokemon",
      "current-team-builder-editor",
      [
        "tyranitar",
        "excadrill",
        "amoonguss",
        "talonflame",
        "rotom-wash",
        "garchomp",
        "sylveon",
        "arcanine",
        "dragonite",
        "kingambit",
        "grimmsnarl",
        "flutter-mane",
        "gastrodon",
      ],
      createExpansionPolicy(
        "broad-catalog-foundation",
        "curated-resource-ids",
        plannedPokemonExpansionResourceIds,
        [
          "First broad Pokemon batch remains curated for review before paginated PokeAPI discovery.",
          "PokeAPI Pokemon data is enrichment-only and does not imply format legality.",
          "Forms and Showdown ID mismatches require a separate review pass.",
        ],
        {
          discoveryEndpoint: "https://pokeapi.co/api/v2/pokemon/",
          expectedMinimumCount: plannedPokemonExpansionResourceIds.length,
        },
      ),
      ["Current Team Builder and editor Pokemon sample coverage with expanded adjacent VGC-style options."],
    ),
    moves: createSection(
      "moves",
      "current-team-builder-editor",
      [
        "rock-slide",
        "knock-off",
        "low-kick",
        "tera-blast",
        "high-horsepower",
        "iron-head",
        "protect",
        "swords-dance",
        "tailwind",
        "brave-bird",
        "will-o-wisp",
        "spore",
        "rage-powder",
        "pollen-puff",
        "earthquake",
        "stomping-tantrum",
        "crunch",
        "heat-wave",
        "flamethrower",
        "hydro-pump",
        "thunderbolt",
        "moonblast",
        "hyper-voice",
        "icy-wind",
        "fake-out",
        "follow-me",
        "trick-room",
        "helping-hand",
        "dark-pulse",
        "dragon-claw",
      ],
      createExpansionPolicy(
        "broad-catalog-foundation",
        "curated-resource-ids",
        plannedMoveExpansionResourceIds,
        [
          "First broad move batch remains curated for review before paginated PokeAPI discovery.",
          "Move availability and legality remain Pokemon Showdown-owned.",
          "Pokemon Editor move browsing remains learnset-only unless Lead approves all-move browsing.",
        ],
        {
          discoveryEndpoint: "https://pokeapi.co/api/v2/move/",
          expectedMinimumCount: plannedMoveExpansionResourceIds.length,
        },
      ),
      ["Current Team Builder and editor move sample coverage with expanded adjacent VGC-style options."],
    ),
    abilities: createSection(
      "abilities",
      "current-team-builder-editor",
      [
        "sand-stream",
        "sand-rush",
        "regenerator",
        "gale-wings",
        "levitate",
        "rough-skin",
        "pixilate",
        "intimidate",
        "inner-focus",
        "supreme-overlord",
        "prankster",
        "protosynthesis",
        "storm-drain",
      ],
      createExpansionPolicy(
        "broad-catalog-foundation",
        "curated-resource-ids",
        plannedAbilityExpansionResourceIds,
        [
          "First broad ability batch remains curated for review before paginated PokeAPI discovery.",
          "Ability availability by Pokemon and format remains Pokemon Showdown-owned.",
        ],
        {
          discoveryEndpoint: "https://pokeapi.co/api/v2/ability/",
          expectedMinimumCount: plannedAbilityExpansionResourceIds.length,
        },
      ),
      ["Current Team Builder and editor ability sample coverage with expanded adjacent VGC-style options."],
    ),
    items: createSection(
      "items",
      "current-team-builder-editor",
      [
        "assault-vest",
        "clear-amulet",
        "covert-cloak",
        "sitrus-berry",
        "leftovers",
        "focus-sash",
        "choice-band",
        "choice-specs",
        "choice-scarf",
        "life-orb",
        "safety-goggles",
        "lum-berry",
        "booster-energy",
        "mental-herb",
      ],
      createExpansionPolicy(
        "broad-catalog-foundation",
        "curated-resource-ids",
        plannedItemExpansionResourceIds,
        [
          "First broad item batch remains curated for review before paginated PokeAPI discovery.",
          "Competitive held-item usability remains Pokemon Showdown-owned.",
          "Item sprite metadata remains candidate-review-gated.",
        ],
        {
          discoveryEndpoint: "https://pokeapi.co/api/v2/item/",
          expectedMinimumCount: plannedItemExpansionResourceIds.length,
        },
      ),
      [
        "Current Team Builder and editor item sample coverage with expanded adjacent VGC-style options.",
        "Some newer PokeAPI item records may expose English names without flavor or effect text.",
      ],
    ),
    types: createSection(
      "types",
      "complete-type-picker",
      [
        "normal",
        "fire",
        "water",
        "electric",
        "grass",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
      ],
      createExpansionPolicy(
        "complete-type-picker",
        "complete-static-list",
        allPokemonTypeResourceIds,
        [
          "All 18 Pokemon type records are already the complete picker target.",
          "Do not include PokeAPI pseudo-types in BattleLab picker coverage without Lead review.",
        ],
        {
          expectedMinimumCount: allPokemonTypeResourceIds.length,
        },
      ),
      ["All 18 Pokemon types for Tera and type picker coverage."],
    ),
    natures: createSection(
      "natures",
      "current-team-builder-editor",
      [
        "adamant",
        "jolly",
        "relaxed",
        "modest",
        "timid",
        "calm",
        "brave",
        "quiet",
        "sassy",
        "impish",
        "bold",
        "careful",
      ],
      createExpansionPolicy(
        "complete-nature-picker",
        "complete-static-list",
        allNatureResourceIds,
        [
          "Complete nature coverage includes neutral natures with nullable increased/decreased stat resources.",
          "Nature metadata remains enrichment-only; battle stat behavior remains Showdown-owned.",
        ],
        {
          discoveryEndpoint: "https://pokeapi.co/api/v2/nature/",
          expectedMinimumCount: allNatureResourceIds.length,
        },
      ),
      ["Current Team Builder and editor nature sample coverage with expanded adjacent VGC-style options."],
    ),
  },
  notes: [
    "PokeAPI data is catalog enrichment only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
    "Sprite metadata remains candidate/review-gated only.",
    "This manifest does not imply UI wiring, cache file IO, .bl writing, or durable persistence.",
  ],
};

export const approvedCatalogLiveFetchSampleResourceIds = {
  pokemon: approvedCatalogLiveFetchSampleManifest.sections.pokemon.resourceIds,
  moves: approvedCatalogLiveFetchSampleManifest.sections.moves.resourceIds,
  abilities: approvedCatalogLiveFetchSampleManifest.sections.abilities.resourceIds,
  items: approvedCatalogLiveFetchSampleManifest.sections.items.resourceIds,
  types: approvedCatalogLiveFetchSampleManifest.sections.types.resourceIds,
  natures: approvedCatalogLiveFetchSampleManifest.sections.natures.resourceIds,
} as const;

export const plannedCatalogCoverageExpansionResourceIds = {
  pokemon: approvedCatalogLiveFetchSampleManifest.sections.pokemon.expansionPolicy.plannedResourceIds,
  moves: approvedCatalogLiveFetchSampleManifest.sections.moves.expansionPolicy.plannedResourceIds,
  abilities: approvedCatalogLiveFetchSampleManifest.sections.abilities.expansionPolicy.plannedResourceIds,
  items: approvedCatalogLiveFetchSampleManifest.sections.items.expansionPolicy.plannedResourceIds,
  types: approvedCatalogLiveFetchSampleManifest.sections.types.expansionPolicy.plannedResourceIds,
  natures: approvedCatalogLiveFetchSampleManifest.sections.natures.expansionPolicy.plannedResourceIds,
} as const;
