import type { BattleLabCatalog } from "../types/catalog";
import type { BattleLabCatalogBundleSectionName } from "../types/catalogBundle";
import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import type {
  PokeApiAbilityResource,
  PokeApiCatalogSourceSnapshot,
  PokeApiItemResource,
  PokeApiMoveResource,
  PokeApiNatureResource,
  PokeApiPokemonResource,
  PokeApiTypeResource,
} from "../types/pokeApiSource";
import { generateCatalogFromPokeApiSnapshot } from "./catalogGeneratorPrototype";
import {
  validateGeneratedPokeApiCatalogPrototype,
  type CatalogGeneratorPrototypeValidationResult,
} from "./catalogGeneratorPrototypeValidation";
import {
  validatePokeApiSourceSnapshot,
  type PokeApiSourceValidationResult,
} from "./pokeApiSourceValidation";
import {
  approvedCatalogLiveFetchSampleResourceIds,
  plannedCatalogCoverageExpansionResourceIds,
} from "./catalogSourceManifest";

const pokeApiBaseUrl = "https://pokeapi.co/api/v2";
const pokeApiEndpointBySection: Record<CatalogLiveFetchPrototypeSection, string> = {
  pokemon: "pokemon",
  moves: "move",
  abilities: "ability",
  items: "item",
  types: "type",
  natures: "nature",
};

export const catalogLiveFetchPrototypeResourceIds = approvedCatalogLiveFetchSampleResourceIds;

export const catalogLiveFetchPlannedCoverageResourceIds = plannedCatalogCoverageExpansionResourceIds;

export type CatalogLiveFetchPrototypeSection = keyof typeof catalogLiveFetchPrototypeResourceIds;

export type CatalogLiveFetchPrototypeCoverageMode = "active-sample" | "planned-expansion";

export type CatalogLiveFetchPrototypeStatus =
  | "idle"
  | "fetching"
  | "validating-source"
  | "generating-catalog"
  | "validating-catalog"
  | "complete"
  | "failed";

export interface CatalogLiveFetchPrototypeProgress {
  status: CatalogLiveFetchPrototypeStatus;
  currentSection?: CatalogLiveFetchPrototypeSection;
  completedRequests: number;
  totalRequests: number;
  progressPercent: number;
  message: string;
}

export interface CatalogLiveFetchPrototypeResult {
  status: CatalogLiveFetchPrototypeStatus;
  coverageMode: CatalogLiveFetchPrototypeCoverageMode;
  fetchedAt: string;
  sourceVersion: string;
  targetSections: BattleLabCatalogBundleSectionName[];
  progress: CatalogLiveFetchPrototypeProgress[];
  snapshot: PokeApiCatalogSourceSnapshot | null;
  sourceValidation: PokeApiSourceValidationResult | null;
  catalog: BattleLabCatalog | null;
  generatedCatalogValidation: CatalogGeneratorPrototypeValidationResult | null;
  issues: CatalogSourceFetchIssue[];
  notes: string[];
}

export interface CatalogLiveFetchPrototypeOptions {
  coverageMode?: CatalogLiveFetchPrototypeCoverageMode;
}

const targetSections: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const createProgress = (
  status: CatalogLiveFetchPrototypeStatus,
  completedRequests: number,
  totalRequests: number,
  message: string,
  currentSection?: CatalogLiveFetchPrototypeSection,
): CatalogLiveFetchPrototypeProgress => ({
  status,
  ...(currentSection ? { currentSection } : {}),
  completedRequests,
  totalRequests,
  progressPercent: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
  message,
});

const createFetchIssue = (
  code: CatalogSourceFetchIssue["code"],
  severity: CatalogSourceFetchIssue["severity"],
  message: string,
  resourceId?: string,
): CatalogSourceFetchIssue => ({
  code,
  severity,
  sourceId: "source-pokeapi-live-fetch-prototype",
  ...(resourceId ? { resourceId } : {}),
  message,
});

export type PokeApiItemResourceWithEffectEntries = PokeApiItemResource & {
  effect_entries?: Array<{
    effect?: string;
    short_effect?: string;
    language: {
      name: string;
      url: string;
    };
  }>;
  names?: Array<{
    name: string;
    language: {
      name: string;
      url: string;
    };
  }>;
};

const hasEnglishItemText = (item: PokeApiItemResource) =>
  item.flavor_text_entries.some((entry) => entry.language.name === "en" && entry.text.trim().length > 0);

export const normalizeFetchedPokeApiItemResourceForPrototype = (
  item: PokeApiItemResourceWithEffectEntries,
): PokeApiItemResource => {
  if (hasEnglishItemText(item)) return item;

  const englishEffect = item.effect_entries?.find(
    (entry) => entry.language.name === "en" && (entry.short_effect?.trim() || entry.effect?.trim()),
  );

  if (!englishEffect) {
    const englishName = item.names?.find((entry) => entry.language.name === "en");

    if (!englishName) return item;

    return {
      ...item,
      flavor_text_entries: [
        {
          text: `PokeAPI live item description unavailable for ${englishName.name}.`,
          language: englishName.language,
        },
      ],
    };
  }

  return {
    ...item,
    flavor_text_entries: [
      {
        text: englishEffect.short_effect ?? englishEffect.effect ?? "",
        language: englishEffect.language,
      },
    ],
  };
};

async function fetchPokeApiResource<TResource>(section: CatalogLiveFetchPrototypeSection, id: string): Promise<TResource> {
  const response = await fetch(`${pokeApiBaseUrl}/${pokeApiEndpointBySection[section]}/${id}/`);

  if (!response.ok) {
    throw new Error(`PokeAPI ${section}/${id} failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<TResource>;
}

async function fetchSection<TResource>(
  section: CatalogLiveFetchPrototypeSection,
  resourceIds: Record<CatalogLiveFetchPrototypeSection, readonly string[]>,
  completedRequests: number,
  totalRequests: number,
  progress: CatalogLiveFetchPrototypeProgress[],
): Promise<{ records: TResource[]; completedRequests: number }> {
  const records: TResource[] = [];

  for (const id of resourceIds[section]) {
    progress.push(createProgress("fetching", completedRequests, totalRequests, `Fetching ${section}/${id}.`, section));
    records.push(await fetchPokeApiResource<TResource>(section, id));
    completedRequests += 1;
  }

  return { records, completedRequests };
}

const getResourceIdsForCoverageMode = (coverageMode: CatalogLiveFetchPrototypeCoverageMode) =>
  coverageMode === "planned-expansion"
    ? catalogLiveFetchPlannedCoverageResourceIds
    : catalogLiveFetchPrototypeResourceIds;

export async function runCatalogLiveFetchPrototype(
  options: CatalogLiveFetchPrototypeOptions = {},
): Promise<CatalogLiveFetchPrototypeResult> {
  const coverageMode = options.coverageMode ?? "active-sample";
  const resourceIds = getResourceIdsForCoverageMode(coverageMode);
  const fetchedAt = new Date().toISOString();
  const totalRequests = Object.values(resourceIds).reduce(
    (total, resourceIds) => total + resourceIds.length,
    0,
  );
  const progress: CatalogLiveFetchPrototypeProgress[] = [
    createProgress("idle", 0, totalRequests, `Catalog live-fetch prototype prepared for ${coverageMode}.`),
  ];
  const issues: CatalogSourceFetchIssue[] = [];
  let completedRequests = 0;

  try {
    const pokemon = await fetchSection<PokeApiPokemonResource>("pokemon", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = pokemon.completedRequests;

    const moves = await fetchSection<PokeApiMoveResource>("moves", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = moves.completedRequests;

    const abilities = await fetchSection<PokeApiAbilityResource>("abilities", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = abilities.completedRequests;

    const items = await fetchSection<PokeApiItemResourceWithEffectEntries>("items", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = items.completedRequests;

    const types = await fetchSection<PokeApiTypeResource>("types", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = types.completedRequests;

    const natures = await fetchSection<PokeApiNatureResource>("natures", resourceIds, completedRequests, totalRequests, progress);
    completedRequests = natures.completedRequests;

    const snapshot: PokeApiCatalogSourceSnapshot = {
      fetchedAt,
      sourceVersion: `pokeapi-live-fetch-prototype-${fetchedAt}`,
      pokemon: pokemon.records,
      moves: moves.records,
      abilities: abilities.records,
      items: items.records.map(normalizeFetchedPokeApiItemResourceForPrototype),
      types: types.records,
      natures: natures.records,
    };

    progress.push(createProgress("validating-source", completedRequests, totalRequests, "Validating PokeAPI DTO snapshot."));
    const sourceValidation = validatePokeApiSourceSnapshot(snapshot);

    if (!sourceValidation.isValid) {
      sourceValidation.issues
        .filter((issue) => issue.severity === "error")
        .forEach((issue) => {
          issues.push(createFetchIssue("response-invalid", "error", issue.message, issue.path));
        });
    }

    progress.push(createProgress("generating-catalog", completedRequests, totalRequests, "Generating BattleLab catalog output."));
    const catalog = sourceValidation.isValid ? generateCatalogFromPokeApiSnapshot(snapshot) : null;

    progress.push(createProgress("validating-catalog", completedRequests, totalRequests, "Validating generated catalog output."));
    const generatedCatalogValidation = catalog ? validateGeneratedPokeApiCatalogPrototype(catalog) : null;

    generatedCatalogValidation?.issues
      .filter((issue) => issue.severity === "error")
      .forEach((issue) => {
        issues.push(createFetchIssue("response-invalid", "error", issue.message, issue.path));
      });

    const isValid =
      sourceValidation.isValid &&
      Boolean(generatedCatalogValidation?.isValid) &&
      issues.every((issue) => issue.severity !== "error");

    progress.push(
      createProgress(
        isValid ? "complete" : "failed",
        completedRequests,
        totalRequests,
        isValid ? "Live-fetch prototype completed." : "Live-fetch prototype completed with validation errors.",
      ),
    );

    return {
      status: isValid ? "complete" : "failed",
      coverageMode,
      fetchedAt,
      sourceVersion: snapshot.sourceVersion,
      targetSections,
      progress,
      snapshot,
      sourceValidation,
      catalog,
      generatedCatalogValidation,
      issues,
      notes: [
        "PokeAPI live-fetch prototype is enrichment-only.",
        "Pokemon Showdown remains the legality and simulation source of truth.",
        "Sprite metadata is candidate/review-gated only and is not approved production sprite sourcing.",
        "This prototype does not write .bl files, cache files, or wire into React UI.",
      ],
    };
  } catch (error) {
    issues.push(
      createFetchIssue(
        "source-unavailable",
        "error",
        error instanceof Error ? error.message : "PokeAPI live-fetch prototype failed.",
      ),
    );
    progress.push(createProgress("failed", completedRequests, totalRequests, "Live-fetch prototype failed."));

    return {
      status: "failed",
      coverageMode,
      fetchedAt,
      sourceVersion: `pokeapi-live-fetch-prototype-${fetchedAt}`,
      targetSections,
      progress,
      snapshot: null,
      sourceValidation: null,
      catalog: null,
      generatedCatalogValidation: null,
      issues,
      notes: [
        "PokeAPI live-fetch prototype is enrichment-only.",
        "Pokemon Showdown remains the legality and simulation source of truth.",
        "No app runtime wiring, file IO, or .bl writing is performed.",
      ],
    };
  }
}
