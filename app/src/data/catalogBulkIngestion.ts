import type { BattleLabCatalog } from "../types/catalog";
import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import type {
  PokeApiAbilityResource,
  PokeApiCatalogSourceSnapshot,
  PokeApiItemResource,
  PokeApiMoveResource,
  PokeApiNamedResource,
  PokeApiNatureResource,
  PokeApiPokemonResource,
  PokeApiTypeResource,
} from "../types/pokeApiSource";
import { generateCatalogFromPokeApiSnapshot } from "./catalogGeneratorPrototype";
import { validateGeneratedPokeApiCatalogPrototype } from "./catalogGeneratorPrototypeValidation";
import {
  normalizeFetchedPokeApiItemResourceForPrototype,
  type PokeApiItemResourceWithEffectEntries,
} from "./catalogLiveFetchPrototype";
import { validatePokeApiSourceSnapshot } from "./pokeApiSourceValidation";

export type CatalogBulkIngestionSection =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures";

export type CatalogBulkIngestionMode = "bounded" | "full";

export type CatalogBulkIngestionStatus =
  | "idle"
  | "fetching-lists"
  | "fetching-details"
  | "validating-source"
  | "generating-catalog"
  | "validating-catalog"
  | "complete"
  | "cancelled"
  | "failed";

export interface CatalogBulkIngestionLimits {
  pokemon: number;
  moves: number;
  abilities: number;
  items: number;
  types: number;
  natures: number;
}

export interface CatalogBulkIngestionProgress {
  status: CatalogBulkIngestionStatus;
  section?: CatalogBulkIngestionSection;
  completedRequests: number;
  totalRequests: number;
  progressPercent: number;
  message: string;
  sectionCompletedRequests?: number;
  sectionTotalRequests?: number;
  sectionProgressPercent?: number;
}

export interface CatalogBulkIngestionSectionSummary {
  section: CatalogBulkIngestionSection | "assets" | "searchIndex";
  listEndpointCount?: number;
  selectedCount: number;
  generatedCount: number;
}

export interface CatalogBulkIngestionResult {
  status: CatalogBulkIngestionStatus;
  mode: CatalogBulkIngestionMode;
  fetchedAt: string;
  sourceVersion: string;
  limits: CatalogBulkIngestionLimits | null;
  fullModeAvailable: boolean;
  progress: CatalogBulkIngestionProgress[];
  snapshot: PokeApiCatalogSourceSnapshot | null;
  catalog: BattleLabCatalog | null;
  sectionSummaries: CatalogBulkIngestionSectionSummary[];
  issues: CatalogSourceFetchIssue[];
  notes: string[];
}

export interface CatalogBulkIngestionOptions {
  mode?: CatalogBulkIngestionMode;
  limits?: Partial<CatalogBulkIngestionLimits>;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: CatalogBulkIngestionProgress) => void;
}

type PokeApiMoveResourceWithEffectEntries = PokeApiMoveResource & {
  effect_entries?: Array<{
    effect?: string;
    short_effect?: string;
    language: PokeApiNamedResource;
  }>;
  names?: Array<{
    name: string;
    language: PokeApiNamedResource;
  }>;
};

type PokeApiAbilityResourceWithEffectEntries = PokeApiAbilityResource & {
  effect_entries?: Array<{
    effect?: string;
    short_effect?: string;
    language: PokeApiNamedResource;
  }>;
  names?: Array<{
    name: string;
    language: PokeApiNamedResource;
  }>;
};

interface PokeApiListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokeApiNamedResource[];
}

interface FetchListResult {
  count: number;
  results: PokeApiNamedResource[];
}

const pokeApiBaseUrl = "https://pokeapi.co/api/v2";

const defaultBoundedLimits: CatalogBulkIngestionLimits = {
  pokemon: 60,
  moves: 80,
  abilities: 65,
  items: 60,
  types: 18,
  natures: 25,
};

const fullFetchLimit = 100_000;

const endpointBySection: Record<CatalogBulkIngestionSection, string> = {
  pokemon: "pokemon",
  moves: "move",
  abilities: "ability",
  items: "item",
  types: "type",
  natures: "nature",
};

const battleLabTypeNames = new Set([
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
]);

const hasEnglishFlavorText = (entries: Array<{ flavor_text?: string; language: { name: string } }>) =>
  entries.some((entry) => entry.language.name === "en" && entry.flavor_text?.trim());

const hasBattleLabPokemonTypes = (pokemon: PokeApiPokemonResource) =>
  pokemon.types.every((entry) => battleLabTypeNames.has(entry.type.name));

const hasBattleLabMoveType = (move: PokeApiMoveResource) => battleLabTypeNames.has(move.type.name);

const normalizeFlavorTextFromEffectEntries = <
  TResource extends {
    name: string;
    flavor_text_entries: Array<{ flavor_text: string; language: PokeApiNamedResource }>;
    effect_entries?: Array<{ effect?: string; short_effect?: string; language: PokeApiNamedResource }>;
    names?: Array<{ name: string; language: PokeApiNamedResource }>;
  },
>(
  resource: TResource,
  resourceLabel: string,
): TResource => {
  if (hasEnglishFlavorText(resource.flavor_text_entries)) return resource;

  const englishEffect = resource.effect_entries?.find(
    (entry) => entry.language.name === "en" && (entry.short_effect?.trim() || entry.effect?.trim()),
  );

  if (englishEffect) {
    return {
      ...resource,
      flavor_text_entries: [
        {
          flavor_text: englishEffect.short_effect ?? englishEffect.effect ?? "",
          language: englishEffect.language,
        },
      ],
    };
  }

  const englishName = resource.names?.find((entry) => entry.language.name === "en");
  const displayName = englishName?.name ?? resource.name;

  return {
    ...resource,
    flavor_text_entries: [
      {
        flavor_text: `PokeAPI live ${resourceLabel} description unavailable for ${displayName}.`,
        language: englishName?.language ?? {
          name: "en",
          url: "https://pokeapi.co/api/v2/language/9/",
        },
      },
    ],
  };
};

const normalizeFetchedPokeApiMoveResourceForBulkIngestion = (
  move: PokeApiMoveResourceWithEffectEntries,
): PokeApiMoveResource => normalizeFlavorTextFromEffectEntries(move, "move");

const normalizeFetchedPokeApiAbilityResourceForBulkIngestion = (
  ability: PokeApiAbilityResourceWithEffectEntries,
): PokeApiAbilityResource => normalizeFlavorTextFromEffectEntries(ability, "ability");

const createProgress = (
  status: CatalogBulkIngestionStatus,
  completedRequests: number,
  totalRequests: number,
  message: string,
  section?: CatalogBulkIngestionSection,
  sectionCompletedRequests?: number,
  sectionTotalRequests?: number,
): CatalogBulkIngestionProgress => ({
  status,
  ...(section ? { section } : {}),
  completedRequests,
  totalRequests,
  progressPercent: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
  message,
  ...(sectionCompletedRequests !== undefined ? { sectionCompletedRequests } : {}),
  ...(sectionTotalRequests !== undefined ? { sectionTotalRequests } : {}),
  ...(sectionCompletedRequests !== undefined && sectionTotalRequests !== undefined
    ? {
        sectionProgressPercent:
          sectionTotalRequests > 0 ? Math.round((sectionCompletedRequests / sectionTotalRequests) * 100) : 0,
      }
    : {}),
});

const createIssue = (
  code: CatalogSourceFetchIssue["code"],
  severity: CatalogSourceFetchIssue["severity"],
  message: string,
  path?: string,
): CatalogSourceFetchIssue => ({
  code,
  severity,
  sourceId: "source-pokeapi-bulk-ingestion",
  ...(path ? { path } : {}),
  message,
});

const mergeLimits = (limits: Partial<CatalogBulkIngestionLimits> = {}): CatalogBulkIngestionLimits => ({
  ...defaultBoundedLimits,
  ...limits,
});

const getSectionLimit = (
  section: CatalogBulkIngestionSection,
  mode: CatalogBulkIngestionMode,
  limits: CatalogBulkIngestionLimits,
) => (mode === "full" ? fullFetchLimit : limits[section]);

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Catalog bulk ingestion cancelled.", "AbortError");
  }
}

async function fetchJson<TValue>(url: string, signal?: AbortSignal): Promise<TValue> {
  assertNotAborted(signal);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<TValue>;
}

async function fetchResourceList(
  section: CatalogBulkIngestionSection,
  mode: CatalogBulkIngestionMode,
  limits: CatalogBulkIngestionLimits,
  signal?: AbortSignal,
): Promise<FetchListResult> {
  const endpoint = endpointBySection[section];
  const limit = getSectionLimit(section, mode, limits);
  const list = await fetchJson<PokeApiListResponse>(`${pokeApiBaseUrl}/${endpoint}/?limit=${limit}&offset=0`, signal);
  const results =
    section === "types"
      ? list.results.filter((resource) => battleLabTypeNames.has(resource.name))
      : list.results;

  return {
    count: list.count,
    results: mode === "full" ? results : results.slice(0, limits[section]),
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  values: readonly TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, values.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

async function fetchDetails<TResource>(
  section: CatalogBulkIngestionSection,
  resources: readonly PokeApiNamedResource[],
  pushProgress: (entry: CatalogBulkIngestionProgress) => void,
  completedRequests: { value: number },
  totalRequests: number,
  concurrency: number,
  signal?: AbortSignal,
): Promise<TResource[]> {
  let sectionCompletedRequests = 0;
  const sectionTotalRequests = resources.length;

  return mapWithConcurrency(resources, concurrency, async (resource) => {
    assertNotAborted(signal);
    pushProgress(
      createProgress(
        "fetching-details",
        completedRequests.value,
        totalRequests,
        `Fetching ${section}/${resource.name}.`,
        section,
        sectionCompletedRequests,
        sectionTotalRequests,
      ),
    );
    const record = await fetchJson<TResource>(resource.url, signal);
    completedRequests.value += 1;
    sectionCompletedRequests += 1;
    pushProgress(
      createProgress(
        "fetching-details",
        completedRequests.value,
        totalRequests,
        `Fetched ${section}/${resource.name}.`,
        section,
        sectionCompletedRequests,
        sectionTotalRequests,
      ),
    );
    return record;
  });
}

const createSectionSummaries = (
  listCounts: Record<CatalogBulkIngestionSection, number>,
  snapshot: PokeApiCatalogSourceSnapshot,
  catalog: BattleLabCatalog,
): CatalogBulkIngestionSectionSummary[] => [
  {
    section: "pokemon",
    listEndpointCount: listCounts.pokemon,
    selectedCount: snapshot.pokemon.length,
    generatedCount: catalog.pokemon.length,
  },
  {
    section: "moves",
    listEndpointCount: listCounts.moves,
    selectedCount: snapshot.moves.length,
    generatedCount: catalog.moves.length,
  },
  {
    section: "abilities",
    listEndpointCount: listCounts.abilities,
    selectedCount: snapshot.abilities.length,
    generatedCount: catalog.abilities.length,
  },
  {
    section: "items",
    listEndpointCount: listCounts.items,
    selectedCount: snapshot.items.length,
    generatedCount: catalog.items.length,
  },
  {
    section: "types",
    listEndpointCount: listCounts.types,
    selectedCount: snapshot.types.length,
    generatedCount: catalog.types.length,
  },
  {
    section: "natures",
    listEndpointCount: listCounts.natures,
    selectedCount: snapshot.natures.length,
    generatedCount: catalog.natures.length,
  },
  {
    section: "assets",
    selectedCount: catalog.assets.length,
    generatedCount: catalog.assets.length,
  },
  {
    section: "searchIndex",
    selectedCount: catalog.searchIndex?.length ?? 0,
    generatedCount: catalog.searchIndex?.length ?? 0,
  },
];

export async function runCatalogBulkIngestion(
  options: CatalogBulkIngestionOptions = {},
): Promise<CatalogBulkIngestionResult> {
  const mode = options.mode ?? "bounded";
  const limits = mode === "bounded" ? mergeLimits(options.limits) : mergeLimits();
  const concurrency = options.concurrency ?? 6;
  const signal = options.signal;
  const fetchedAt = new Date().toISOString();
  const sourceVersion = `pokeapi-bulk-ingestion-${mode}-${fetchedAt}`;
  const issues: CatalogSourceFetchIssue[] = [];
  const progress: CatalogBulkIngestionProgress[] = [];
  const pushProgress = (entry: CatalogBulkIngestionProgress) => {
    progress.push(entry);
    options.onProgress?.(entry);
  };

  pushProgress(createProgress("idle", 0, 0, `PokeAPI bulk ingestion prepared in ${mode} mode.`));

  try {
    assertNotAborted(signal);
    pushProgress(createProgress("fetching-lists", 0, 6, "Fetching PokeAPI section resource lists."));
    let completedListRequests = 0;
    const listEntries = await Promise.all(
      (Object.keys(endpointBySection) as CatalogBulkIngestionSection[]).map(async (section) => {
        const list = await fetchResourceList(section, mode, limits, signal);
        completedListRequests += 1;
        pushProgress(
          createProgress(
            "fetching-lists",
            completedListRequests,
            6,
            `Fetched ${section} resource list.`,
            section,
            completedListRequests,
            6,
          ),
        );
        return [section, list] as const;
      }),
    );
    const lists = Object.fromEntries(listEntries) as Record<CatalogBulkIngestionSection, FetchListResult>;
    const totalRequests = Object.values(lists).reduce((total, list) => total + list.results.length, 0);
    const completedRequests = { value: 0 };

    const pokemon = await fetchDetails<PokeApiPokemonResource>(
      "pokemon",
      lists.pokemon.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );
    const moves = await fetchDetails<PokeApiMoveResourceWithEffectEntries>(
      "moves",
      lists.moves.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );
    const abilities = await fetchDetails<PokeApiAbilityResourceWithEffectEntries>(
      "abilities",
      lists.abilities.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );
    const items = await fetchDetails<PokeApiItemResourceWithEffectEntries>(
      "items",
      lists.items.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );
    const types = await fetchDetails<PokeApiTypeResource>(
      "types",
      lists.types.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );
    const natures = await fetchDetails<PokeApiNatureResource>(
      "natures",
      lists.natures.results,
      pushProgress,
      completedRequests,
      totalRequests,
      concurrency,
      signal,
    );

    const snapshot: PokeApiCatalogSourceSnapshot = {
      fetchedAt,
      sourceVersion,
      pokemon: pokemon.filter(hasBattleLabPokemonTypes),
      moves: moves.filter(hasBattleLabMoveType).map(normalizeFetchedPokeApiMoveResourceForBulkIngestion),
      abilities: abilities.map(normalizeFetchedPokeApiAbilityResourceForBulkIngestion),
      items: items.map(normalizeFetchedPokeApiItemResourceForPrototype) as PokeApiItemResource[],
      types,
      natures,
    };

    pushProgress(
      createProgress("validating-source", completedRequests.value, totalRequests, "Validating bulk PokeAPI DTO snapshot."),
    );
    const sourceValidation = validatePokeApiSourceSnapshot(snapshot);
    sourceValidation.issues
      .filter((issue) => issue.severity === "error")
      .forEach((issue) => {
        issues.push(createIssue("response-invalid", "error", issue.message, issue.path));
      });

    pushProgress(
      createProgress("generating-catalog", completedRequests.value, totalRequests, "Generating BattleLab catalog records."),
    );
    const catalog = sourceValidation.isValid ? generateCatalogFromPokeApiSnapshot(snapshot) : null;

    pushProgress(
      createProgress("validating-catalog", completedRequests.value, totalRequests, "Validating bulk generated catalog."),
    );
    const generatedCatalogValidation = catalog ? validateGeneratedPokeApiCatalogPrototype(catalog) : null;
    generatedCatalogValidation?.issues
      .filter((issue) => issue.severity === "error")
      .forEach((issue) => {
        issues.push(createIssue("response-invalid", "error", issue.message, issue.path));
      });

    const isValid = Boolean(catalog && sourceValidation.isValid && generatedCatalogValidation?.isValid);
    const sectionSummaries = catalog
      ? createSectionSummaries(
          {
            pokemon: lists.pokemon.count,
            moves: lists.moves.count,
            abilities: lists.abilities.count,
            items: lists.items.count,
            types: lists.types.count,
            natures: lists.natures.count,
          },
          snapshot,
          catalog,
        )
      : [];

    pushProgress(
      createProgress(
        isValid ? "complete" : "failed",
        completedRequests.value,
        totalRequests,
        isValid ? "Bulk catalog ingestion completed." : "Bulk catalog ingestion completed with validation errors.",
      ),
    );

    return {
      status: isValid ? "complete" : "failed",
      mode,
      fetchedAt,
      sourceVersion,
      limits: mode === "bounded" ? limits : null,
      fullModeAvailable: true,
      progress,
      snapshot,
      catalog,
      sectionSummaries,
      issues,
      notes: [
        "Bulk ingestion uses PokeAPI list endpoints and detail resource URLs.",
        "Bounded mode is the default validation path; full mode is available through an explicit async option.",
        "PokeAPI/catalog data remains enrichment-only.",
        "Pokemon Showdown remains legality and simulation source of truth.",
        "Sprite metadata remains candidate-review-gated only.",
        "No UI wiring, .bl writing, loader execution, persistence, or simulation work is performed.",
      ],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      issues.push(createIssue("source-unavailable", "warning", "PokeAPI bulk catalog ingestion was cancelled."));
      pushProgress(createProgress("cancelled", 0, 0, "Bulk catalog ingestion cancelled."));

      return {
        status: "cancelled",
        mode,
        fetchedAt,
        sourceVersion,
        limits: mode === "bounded" ? limits : null,
        fullModeAvailable: true,
        progress,
        snapshot: null,
        catalog: null,
        sectionSummaries: [],
        issues,
        notes: [
          "PokeAPI/catalog data remains enrichment-only.",
          "Pokemon Showdown remains legality and simulation source of truth.",
          "No UI wiring, .bl writing, loader execution, persistence, or simulation work is performed.",
        ],
      };
    }

    issues.push(
      createIssue(
        "source-unavailable",
        "error",
        error instanceof Error ? error.message : "PokeAPI bulk catalog ingestion failed.",
      ),
    );
    pushProgress(createProgress("failed", 0, 0, "Bulk catalog ingestion failed."));

    return {
      status: "failed",
      mode,
      fetchedAt,
      sourceVersion,
      limits: mode === "bounded" ? limits : null,
      fullModeAvailable: true,
      progress,
      snapshot: null,
      catalog: null,
      sectionSummaries: [],
      issues,
      notes: [
        "PokeAPI/catalog data remains enrichment-only.",
        "Pokemon Showdown remains legality and simulation source of truth.",
        "No UI wiring, .bl writing, loader execution, persistence, or simulation work is performed.",
      ],
    };
  }
}
