import type { BattleLabCatalog } from "../types/catalog";
import type { CatalogLiveFetchPrototypeValidationResult } from "./catalogLiveFetchPrototypeValidation";
import {
  validateCatalogLiveFetchPrototype,
  validateCatalogLiveFetchPrototypePlannedCoverage,
} from "./catalogLiveFetchPrototypeValidation";
import {
  compareCatalogGeneratedSnapshots,
  type CatalogGeneratedSnapshotComparison,
} from "./catalogGeneratedSnapshotComparison";
import {
  createCatalogUpdateReadModelProps,
  type CatalogUpdateReadModelProps,
} from "./catalogUpdateReadModelProps";

export type CatalogPlannedExpansionGeneratedCatalogSection =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures"
  | "assets"
  | "searchIndex";

export interface CatalogPlannedExpansionGeneratedCatalogCounts {
  pokemon: number;
  moves: number;
  abilities: number;
  items: number;
  types: number;
  natures: number;
  assets: number;
  searchIndex: number;
}

export interface CatalogPlannedExpansionPickerReadinessSection {
  section: Exclude<CatalogPlannedExpansionGeneratedCatalogSection, "assets" | "searchIndex">;
  catalogRecordCount: number;
  searchIndexCount: number;
  hasSearchEntries: boolean;
  readyForLocalPickerProjection: boolean;
}

export interface CatalogPlannedExpansionGeneratedCatalogFixture {
  id: string;
  generatedFrom: "planned-expansion-live-fetch";
  validation: CatalogLiveFetchPrototypeValidationResult;
  catalog: BattleLabCatalog;
  counts: CatalogPlannedExpansionGeneratedCatalogCounts;
  comparison: CatalogGeneratedSnapshotComparison;
  updateReadModelProps: CatalogUpdateReadModelProps;
  pickerReadiness: CatalogPlannedExpansionPickerReadinessSection[];
  notes: string[];
}

const pickerSections: CatalogPlannedExpansionPickerReadinessSection["section"][] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
];

const pickerSectionToSearchIndexKind = {
  pokemon: "pokemon",
  moves: "move",
  abilities: "ability",
  items: "item",
  types: "type",
  natures: "nature",
} as const;

const countCatalogRecords = (catalog: BattleLabCatalog): CatalogPlannedExpansionGeneratedCatalogCounts => ({
  pokemon: catalog.pokemon.length,
  moves: catalog.moves.length,
  abilities: catalog.abilities.length,
  items: catalog.items.length,
  types: catalog.types.length,
  natures: catalog.natures.length,
  assets: catalog.assets.length,
  searchIndex: catalog.searchIndex?.length ?? 0,
});

const createPickerReadiness = (catalog: BattleLabCatalog): CatalogPlannedExpansionPickerReadinessSection[] =>
  pickerSections.map((section) => {
    const searchIndexCount =
      catalog.searchIndex?.filter((entry) => entry.kind === pickerSectionToSearchIndexKind[section]).length ?? 0;
    const catalogRecordCount = catalog[section].length;

    return {
      section,
      catalogRecordCount,
      searchIndexCount,
      hasSearchEntries: searchIndexCount > 0,
      readyForLocalPickerProjection: catalogRecordCount > 0 && searchIndexCount >= catalogRecordCount,
    };
  });

export async function createPlannedExpansionGeneratedCatalogFixture(): Promise<CatalogPlannedExpansionGeneratedCatalogFixture> {
  const plannedCoverage = validateCatalogLiveFetchPrototypePlannedCoverage();
  const validation = await validateCatalogLiveFetchPrototype({ coverageMode: "planned-expansion" });

  if (!plannedCoverage.isValid || !validation.isValid || !validation.result.catalog) {
    throw new Error("Planned-expansion live-fetch output must validate before creating generated catalog fixture.");
  }

  const catalog = validation.result.catalog;
  const comparison = compareCatalogGeneratedSnapshots(
    undefined,
    catalog,
    "BattleLab local catalog seed",
    "Planned-expansion generated PokeAPI catalog",
  );

  return {
    id: "catalog-planned-expansion-generated-catalog-fixture",
    generatedFrom: "planned-expansion-live-fetch",
    validation,
    catalog,
    counts: countCatalogRecords(catalog),
    comparison,
    updateReadModelProps: createCatalogUpdateReadModelProps(undefined, comparison),
    pickerReadiness: createPickerReadiness(catalog),
    notes: [
      "Fixture is created from explicit planned-expansion live-fetch validation.",
      "Fixture is data-only and does not wire CatalogUpdatePanel or Pokemon Editor.",
      "Fixture is suitable for later local picker projection without UI-triggered live fetch.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate-review-gated only.",
      "No backend, persistence, SQLite, Electron, PDF, Theater decoding, report generation, production sprite rendering, finalized sprite licensing, or simulation work is implemented.",
    ],
  };
}
