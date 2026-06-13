import type {
  CatalogFetchExecutionCacheHandoff,
  CatalogFetchExecutionValidationHandoff,
} from "../types/catalogFetchExecution";
import type {
  CatalogSourceFetchIssue,
  CatalogSourceFetchResponse,
  CatalogSourceSnapshotPayload,
} from "../types/catalogFetch";
import type {
  CatalogPipelineValidationResult,
} from "../types/catalogPipeline";
import type { PokeApiCatalogSourceSnapshot } from "../types/pokeApiSource";
import {
  sampleCatalogFetchGenerationRequest,
  sampleCatalogFetchNormalizationHandoff,
  sampleCatalogFetchPipelineSnapshot,
  sampleCatalogFetchSectionNames,
  sampleCatalogSourceFetchRequest,
  sampleCatalogSourceSnapshotPayload,
} from "./catalogFetchFixtures";
import { samplePokeApiCatalogGeneratorSnapshot } from "./catalogGeneratorFixtures";
import { validatePokeApiSourceSnapshot } from "./pokeApiSourceValidation";

const fixtureCreatedAt = "2026-06-13T20:20:00.000Z";
const fixtureFetchedAt = "2026-06-13T20:20:01.000Z";
const liveFetchSourceId = "source-pokeapi-live-fetch-prototype";
const cacheKey = "catalog-live-fetch/pokeapi/prototype/sample-snapshot";

const createContentHash = (value: string) => ({
  algorithm: "unknown" as const,
  value,
  canonicalization: "fixture-only-no-cache-file-io",
});

const createIssue = (
  code: CatalogSourceFetchIssue["code"],
  severity: CatalogSourceFetchIssue["severity"],
  message: string,
  path?: string,
): CatalogSourceFetchIssue => ({
  code,
  severity,
  sourceId: liveFetchSourceId,
  ...(path ? { path } : {}),
  message,
});

const liveFetchSnapshotPayload: CatalogSourceSnapshotPayload<PokeApiCatalogSourceSnapshot> = {
  metadata: {
    ...sampleCatalogSourceSnapshotPayload.metadata,
    sourceId: liveFetchSourceId,
    name: "PokeAPI live-fetch prototype snapshot",
    requestedAt: fixtureCreatedAt,
    fetchedAt: fixtureFetchedAt,
    generatedAt: fixtureFetchedAt,
    sourceVersion: `pokeapi-live-fetch-prototype-${fixtureFetchedAt}`,
    dataVersion: `pokeapi-live-fetch-prototype-${fixtureFetchedAt}`,
    recordCount: 15,
    contentHash: createContentHash("fixture-live-fetch-prototype-snapshot"),
    cacheStatus: "hit-fresh",
    cacheKey,
    notes: [
      "Represents a successful live PokeAPI enrichment fetch handoff.",
      "No cache file is read or written by this fixture.",
      "Candidate sprite metadata remains license-review gated.",
    ],
  },
  payload: samplePokeApiCatalogGeneratorSnapshot,
};

const staleCachedSnapshotPayload: CatalogSourceSnapshotPayload<PokeApiCatalogSourceSnapshot> = {
  ...liveFetchSnapshotPayload,
  metadata: {
    ...liveFetchSnapshotPayload.metadata,
    fetchedAt: "2026-06-10T20:20:01.000Z",
    generatedAt: "2026-06-10T20:20:01.000Z",
    sourceVersion: "pokeapi-live-fetch-prototype-stale-cache",
    dataVersion: "pokeapi-live-fetch-prototype-stale-cache",
    cacheStatus: "hit-stale",
    contentHash: createContentHash("fixture-stale-cache-snapshot"),
    notes: [
      "Represents stale cached snapshot metadata for offline/rate-limited fallback.",
      "Cache fallback remains data-only and does not imply local persistence implementation.",
    ],
  },
};

const invalidSourceSnapshotPayload: CatalogSourceSnapshotPayload<PokeApiCatalogSourceSnapshot> = {
  ...liveFetchSnapshotPayload,
  metadata: {
    ...liveFetchSnapshotPayload.metadata,
    sourceVersion: "pokeapi-live-fetch-prototype-invalid-source",
    dataVersion: "pokeapi-live-fetch-prototype-invalid-source",
    contentHash: createContentHash("fixture-invalid-source-snapshot"),
    notes: [
      "Invalid source snapshot fixture demonstrates validation blocking generated catalog handoff.",
    ],
  },
  payload: {
    ...samplePokeApiCatalogGeneratorSnapshot,
    moves: [],
  },
};

const successfulLiveFetchPipelineSnapshot = {
  ...sampleCatalogFetchPipelineSnapshot,
  sourceId: liveFetchSourceId,
  name: "PokeAPI live-fetch prototype snapshot",
  version: liveFetchSnapshotPayload.metadata.sourceVersion,
  dataVersion: liveFetchSnapshotPayload.metadata.dataVersion,
  fetchedAt: liveFetchSnapshotPayload.metadata.fetchedAt,
  generatedAt: liveFetchSnapshotPayload.metadata.generatedAt,
  recordCount: liveFetchSnapshotPayload.metadata.recordCount,
  contentHash: liveFetchSnapshotPayload.metadata.contentHash,
  notes: liveFetchSnapshotPayload.metadata.notes,
};

const successfulLiveFetchResponse: CatalogSourceFetchResponse<PokeApiCatalogSourceSnapshot> = {
  requestId: sampleCatalogSourceFetchRequest.id,
  status: "fetched",
  sourceSnapshot: liveFetchSnapshotPayload,
  pipelineSnapshot: successfulLiveFetchPipelineSnapshot,
  cacheStatus: "hit-fresh",
  rateLimitStatus: {
    isLimited: false,
    remaining: 1_000,
    policyNote: "Fixture value only; no runtime rate-limit state is persisted.",
  },
  retryPolicy: sampleCatalogSourceFetchRequest.retryPolicy,
  httpStatus: 200,
  startedAt: fixtureCreatedAt,
  completedAt: fixtureFetchedAt,
  issues: [],
};

const staleCacheWarning = createIssue(
  "cache-stale",
  "warning",
  "Stale cached PokeAPI snapshot metadata may be used only as an explicit offline fallback.",
  "cacheHandoff.sourceSnapshot.metadata.cacheStatus",
);

const rateLimitedWarning = createIssue(
  "rate-limited",
  "warning",
  "PokeAPI source is rate-limited; future execution should pause progress and use approved fallback policy.",
  "rateLimitStatus",
);

export const sampleCatalogLiveFetchSuccessCacheHandoff: CatalogFetchExecutionCacheHandoff = {
  id: "catalog-live-fetch-cache-handoff-success",
  createdAt: fixtureFetchedAt,
  cachePolicy: {
    ...sampleCatalogSourceFetchRequest.cachePolicy,
    cacheKey,
    offlineFallback: "use-fresh-cache",
  },
  cacheKey,
  status: "fetched",
  contentHash: liveFetchSnapshotPayload.metadata.contentHash,
  sourceSnapshot: liveFetchSnapshotPayload,
  notes: [
    "Successful live fetch handoff keeps PokeAPI enrichment-only.",
    "This fixture does not read or write cache files.",
  ],
};

export const sampleCatalogLiveFetchOfflineCacheHandoff: CatalogFetchExecutionCacheHandoff = {
  id: "catalog-live-fetch-cache-handoff-offline",
  createdAt: fixtureCreatedAt,
  cachePolicy: {
    ...sampleCatalogSourceFetchRequest.cachePolicy,
    cacheKey,
    offlineFallback: "use-stale-cache",
  },
  cacheKey,
  status: "using-cache",
  contentHash: staleCachedSnapshotPayload.metadata.contentHash,
  sourceSnapshot: staleCachedSnapshotPayload,
  notes: [
    "Offline fallback uses cached snapshot metadata only.",
    "No cache file IO or persistence implementation is implied.",
  ],
};

export const sampleCatalogLiveFetchRateLimitedCacheHandoff: CatalogFetchExecutionCacheHandoff = {
  ...sampleCatalogLiveFetchOfflineCacheHandoff,
  id: "catalog-live-fetch-cache-handoff-rate-limited",
  status: "rate-limited",
  notes: [
    "Rate-limited source fallback reuses stale cached snapshot metadata.",
    "Retry behavior remains planning data until a separate execution checkpoint.",
  ],
};

const validSourceValidation = validatePokeApiSourceSnapshot(liveFetchSnapshotPayload.payload);
const invalidSourceValidation = validatePokeApiSourceSnapshot(invalidSourceSnapshotPayload.payload);

const successfulPipelineValidation: CatalogPipelineValidationResult = {
  status: "complete",
  isValid: true,
  sections: sampleCatalogFetchSectionNames.map((section) => ({
    section,
    status: "complete",
    progressPercent: 100,
    recordsRead: section === "assets" || section === "searchIndex" ? 0 : 1,
    recordsWritten: section === "assets" || section === "searchIndex" ? 0 : 1,
    warningCount: 0,
    errorCount: 0,
    completedAt: fixtureFetchedAt,
  })),
  warnings: [],
  mismatches: [],
  message: "Live-fetch cache handoff fixture passed source validation and is ready for generation.",
};

const blockedPipelineValidation: CatalogPipelineValidationResult = {
  status: "failed",
  isValid: false,
  sections: sampleCatalogFetchSectionNames.map((section) => ({
    section,
    status: section === "moves" ? "failed" : "skipped",
    progressPercent: section === "moves" ? 100 : 0,
    recordsRead: 0,
    recordsWritten: 0,
    warningCount: 0,
    errorCount: section === "moves" ? invalidSourceValidation.issues.length : 0,
    completedAt: fixtureFetchedAt,
  })),
  warnings: invalidSourceValidation.issues.map((issue) => ({
    id: `source-validation-${issue.code}`,
    code: "source-field-missing",
    severity: issue.severity,
    section: "moves",
    sourceId: liveFetchSourceId,
    message: issue.message,
  })),
  mismatches: [],
  message: "Generated catalog handoff is blocked because source DTO validation failed.",
};

export const sampleCatalogLiveFetchSuccessValidationHandoff: CatalogFetchExecutionValidationHandoff = {
  id: "catalog-live-fetch-validation-handoff-success",
  createdAt: fixtureFetchedAt,
  sourceSnapshot: liveFetchSnapshotPayload,
  normalizationHandoff: {
    ...sampleCatalogFetchNormalizationHandoff,
    id: "catalog-live-fetch-normalization-handoff-success",
    createdAt: fixtureFetchedAt,
    fetchResponses: [successfulLiveFetchResponse],
    sourceSnapshots: [successfulLiveFetchPipelineSnapshot],
    generationRequest: {
      ...sampleCatalogFetchGenerationRequest,
      id: "catalog-live-fetch-generation-request-success",
      requestedAt: fixtureFetchedAt,
      sourceSnapshots: [successfulLiveFetchPipelineSnapshot],
      notes: [
        "Successful live-fetch handoff can enter normalization after source validation.",
        "Pokemon Showdown remains legality and simulation source of truth.",
      ],
    },
  },
  generationRequest: {
    ...sampleCatalogFetchGenerationRequest,
    id: "catalog-live-fetch-generation-request-success",
    requestedAt: fixtureFetchedAt,
    sourceSnapshots: [successfulLiveFetchPipelineSnapshot],
  },
  sourceValidationRequired: true,
  generatedCatalogValidationRequired: true,
  bundleValidationRequired: true,
  validationResult: successfulPipelineValidation,
  notes: [
    "Source validation passed before generated catalog handoff.",
    `Source validation issue count: ${validSourceValidation.issues.length}.`,
  ],
};

export const sampleCatalogLiveFetchOfflineValidationHandoff: CatalogFetchExecutionValidationHandoff = {
  ...sampleCatalogLiveFetchSuccessValidationHandoff,
  id: "catalog-live-fetch-validation-handoff-offline-cache",
  createdAt: fixtureCreatedAt,
  sourceSnapshot: staleCachedSnapshotPayload,
  validationResult: {
    ...successfulPipelineValidation,
    status: "completeWithWarnings",
    warnings: [
      {
        id: "offline-cache-stale-warning",
        code: "validation-deferred",
        severity: "warning",
        section: "pokemon",
        sourceId: liveFetchSourceId,
        message: staleCacheWarning.message,
      },
    ],
    message: "Offline cached snapshot can proceed with warning-only status.",
  },
  notes: [
    "Offline fallback remains explicit and warning-bearing.",
    "Cached snapshot metadata must be revalidated before generated catalog trust.",
  ],
};

export const sampleCatalogLiveFetchSourceValidationBlockedHandoff: CatalogFetchExecutionValidationHandoff = {
  id: "catalog-live-fetch-validation-handoff-source-blocked",
  createdAt: fixtureFetchedAt,
  sourceSnapshot: invalidSourceSnapshotPayload,
  sourceValidationRequired: true,
  generatedCatalogValidationRequired: true,
  bundleValidationRequired: true,
  validationResult: blockedPipelineValidation,
  notes: [
    "Source DTO validation failed, so generated catalog handoff is intentionally absent.",
    "This fixture demonstrates source validation blocking generated catalog and bundle validation.",
  ],
};

export const sampleCatalogLiveFetchCacheFallbackResponses: CatalogSourceFetchResponse<PokeApiCatalogSourceSnapshot>[] = [
  successfulLiveFetchResponse,
  {
    ...successfulLiveFetchResponse,
    status: "offline",
    sourceSnapshot: staleCachedSnapshotPayload,
    cacheStatus: "hit-stale",
    httpStatus: undefined,
    issues: [staleCacheWarning],
  },
  {
    ...successfulLiveFetchResponse,
    status: "rate-limited",
    sourceSnapshot: staleCachedSnapshotPayload,
    cacheStatus: "hit-stale",
    httpStatus: 429,
    rateLimitStatus: {
      isLimited: true,
      remaining: 0,
      retryAfterMs: 60_000,
      resetAt: "2026-06-13T20:21:00.000Z",
      policyNote: "Fixture only; retry execution requires a separate approved checkpoint.",
    },
    retryPolicy: {
      ...sampleCatalogSourceFetchRequest.retryPolicy,
      attempt: 1,
      retryAfterMs: 60_000,
      nextRetryAt: "2026-06-13T20:21:00.000Z",
    },
    issues: [rateLimitedWarning, staleCacheWarning],
  },
];

export const sampleCatalogLiveFetchCacheHandoffScenarios = [
  {
    id: "successful-live-fetch-handoff",
    label: "Successful live fetch handoff",
    cacheHandoff: sampleCatalogLiveFetchSuccessCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchSuccessValidationHandoff,
    issues: [],
  },
  {
    id: "offline-fallback-to-cached-snapshot",
    label: "Offline fallback to cached snapshot metadata",
    cacheHandoff: sampleCatalogLiveFetchOfflineCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchOfflineValidationHandoff,
    issues: [staleCacheWarning],
  },
  {
    id: "rate-limited-source-fallback",
    label: "Rate-limited source fallback",
    cacheHandoff: sampleCatalogLiveFetchRateLimitedCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchOfflineValidationHandoff,
    issues: [rateLimitedWarning, staleCacheWarning],
  },
  {
    id: "source-validation-blocks-generated-catalog",
    label: "Source validation failure blocks generated catalog handoff",
    cacheHandoff: sampleCatalogLiveFetchSuccessCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchSourceValidationBlockedHandoff,
    issues: invalidSourceValidation.issues,
  },
] as const;
