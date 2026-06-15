import type {
  CatalogPickerKind,
  CatalogPickerOption,
  CatalogSearchIndexEntry,
} from "../types/catalog";
import {
  createPlannedExpansionGeneratedCatalogFixture,
  type CatalogPlannedExpansionGeneratedCatalogCounts,
  type CatalogPlannedExpansionGeneratedCatalogFixture,
} from "./catalogPlannedExpansionGeneratedCatalog";
import {
  toAbilityPickerOption,
  toItemPickerOption,
  toMovePickerOption,
  toNaturePickerOption,
  toPokemonPickerOption,
  toTypePickerOption,
} from "./catalogSelectors";

export type CatalogPlannedExpansionPickerProjectionSection =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures";

export type CatalogPlannedExpansionPickerProjectionOptionSets = {
  pokemon: CatalogPickerOption[];
  moves: CatalogPickerOption[];
  abilities: CatalogPickerOption[];
  items: CatalogPickerOption[];
  types: CatalogPickerOption[];
  natures: CatalogPickerOption[];
};

export interface CatalogPlannedExpansionPickerProjectionSectionSummary {
  section: CatalogPlannedExpansionPickerProjectionSection;
  pickerKind: CatalogPickerKind;
  optionCount: number;
  searchIndexCount: number;
  catalogKeys: string[];
  showdownIds: string[];
  displayLabels: string[];
  hasCatalogIdentity: boolean;
  displayLabelsAreSeparate: boolean;
}

export interface CatalogPlannedExpansionPickerProjection {
  id: string;
  sourceFixtureId: string;
  generatedFrom: "planned-expansion-generated-catalog";
  fixture: CatalogPlannedExpansionGeneratedCatalogFixture;
  optionSets: CatalogPlannedExpansionPickerProjectionOptionSets;
  searchIndex: CatalogSearchIndexEntry[];
  counts: CatalogPlannedExpansionGeneratedCatalogCounts;
  sectionSummaries: CatalogPlannedExpansionPickerProjectionSectionSummary[];
  notes: string[];
}

const pickerSectionToKind: Record<CatalogPlannedExpansionPickerProjectionSection, CatalogPickerKind> = {
  pokemon: "pokemon",
  moves: "move",
  abilities: "ability",
  items: "item",
  types: "type",
  natures: "nature",
};

const pickerSectionOrder: CatalogPlannedExpansionPickerProjectionSection[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
];

const createSectionSummary = (
  section: CatalogPlannedExpansionPickerProjectionSection,
  options: CatalogPickerOption[],
  searchIndex: CatalogSearchIndexEntry[],
): CatalogPlannedExpansionPickerProjectionSectionSummary => {
  const pickerKind = pickerSectionToKind[section];
  const sectionSearchIndex = searchIndex.filter((entry) => entry.kind === pickerKind);
  const catalogKeys = options.map((option) => option.catalogKey);
  const showdownIds = options
    .map((option) => option.showdownId)
    .filter((showdownId): showdownId is string => Boolean(showdownId));

  return {
    section,
    pickerKind,
    optionCount: options.length,
    searchIndexCount: sectionSearchIndex.length,
    catalogKeys,
    showdownIds,
    displayLabels: options.map((option) => option.displayName),
    hasCatalogIdentity: options.every((option) => Boolean(option.catalogKey) && Boolean(option.showdownId)),
    displayLabelsAreSeparate: options.every((option) => option.displayName !== option.catalogKey),
  };
};

export async function createPlannedExpansionLocalPickerProjection(): Promise<CatalogPlannedExpansionPickerProjection> {
  const fixture = await createPlannedExpansionGeneratedCatalogFixture();
  const catalog = fixture.catalog;
  const optionSets: CatalogPlannedExpansionPickerProjectionOptionSets = {
    pokemon: catalog.pokemon.map(toPokemonPickerOption),
    moves: catalog.moves.map(toMovePickerOption),
    abilities: catalog.abilities.map(toAbilityPickerOption),
    items: catalog.items.map(toItemPickerOption),
    types: catalog.types.map(toTypePickerOption),
    natures: catalog.natures.map(toNaturePickerOption),
  };
  const searchIndex = catalog.searchIndex ?? [];

  return {
    id: "catalog-planned-expansion-local-picker-projection",
    sourceFixtureId: fixture.id,
    generatedFrom: "planned-expansion-generated-catalog",
    fixture,
    optionSets,
    searchIndex,
    counts: fixture.counts,
    sectionSummaries: pickerSectionOrder.map((section) =>
      createSectionSummary(section, optionSets[section], searchIndex),
    ),
    notes: [
      "Projection is created only through an explicit async helper and does not trigger live fetch at import time.",
      "Projection is data-only and does not wire Pokemon Editor or CatalogUpdatePanel.",
      "Picker identity is catalogKey/showdownId; displayName remains a separate UI/export label.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate-review-gated only.",
      "No backend, persistence, SQLite, Electron, PDF, Theater decoding, report generation, production sprite rendering, finalized sprite licensing, or simulation work is implemented.",
    ],
  };
}
