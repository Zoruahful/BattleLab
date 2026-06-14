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
  | "complete-type-picker";

export interface CatalogSourceManifestSectionEntry {
  section: CatalogSourceManifestSection;
  sourceRole: Extract<CatalogPipelineSourceRole, "enrichment">;
  coverageTier: CatalogSourceCoverageTier;
  resourceIds: readonly string[];
  expectedCount: number;
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
  notes: string[],
): CatalogSourceManifestSectionEntry => ({
  section,
  sourceRole: "enrichment",
  coverageTier,
  resourceIds,
  expectedCount: resourceIds.length,
  notes,
});

export const approvedCatalogLiveFetchSampleManifest: CatalogSourceManifest = {
  id: "catalog-live-fetch-approved-sample-coverage-v1",
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
      ],
      ["Current Team Builder and editor Pokemon sample coverage."],
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
      ],
      ["Current Team Builder and editor move sample coverage."],
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
      ],
      ["Current Team Builder and editor ability sample coverage."],
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
      ],
      [
        "Current Team Builder and editor item sample coverage.",
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
      ],
      ["Current Team Builder and editor nature sample coverage."],
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

