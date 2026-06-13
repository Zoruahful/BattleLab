import type { BattleLabCatalogBundleSectionName } from "../types/catalogBundle";
import type {
  CatalogFetchNormalizationHandoff,
  CatalogSourceFetchRequest,
  CatalogSourceFetchResponse,
  CatalogSourceSnapshotPayload,
} from "../types/catalogFetch";
import type {
  CatalogPipelineGenerationRequest,
  CatalogPipelineSourceSnapshot,
} from "../types/catalogPipeline";
import {
  samplePokeApiCatalogGeneratorSnapshot,
  type PokeApiCatalogGeneratorSnapshot,
} from "./catalogGeneratorFixtures";
import { sampleCatalogGeneratorSourceMetadata } from "./catalogGeneratorPrototype";

export const sampleCatalogFetchSectionNames: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const requestedAt = "2026-06-13T14:00:00.000Z";
const fetchedAt = "2026-06-13T14:00:01.000Z";
const generatedAt = "2026-06-13T14:00:02.000Z";
const pokeApiResourceIds = [
  ...samplePokeApiCatalogGeneratorSnapshot.pokemon.map((pokemon) => `pokemon:${pokemon.name}`),
  ...samplePokeApiCatalogGeneratorSnapshot.moves.map((move) => `move:${move.name}`),
  ...samplePokeApiCatalogGeneratorSnapshot.abilities.map((ability) => `ability:${ability.name}`),
  ...samplePokeApiCatalogGeneratorSnapshot.items.map((item) => `item:${item.name}`),
  ...samplePokeApiCatalogGeneratorSnapshot.types.map((type) => `type:${type.name}`),
  ...samplePokeApiCatalogGeneratorSnapshot.natures.map((nature) => `nature:${nature.name}`),
];

export const sampleCatalogSourceFetchRequest: CatalogSourceFetchRequest = {
  id: "fetch-pokeapi-enrichment-dry-run",
  requestedAt,
  source: sampleCatalogGeneratorSourceMetadata,
  role: "enrichment",
  targetSections: sampleCatalogFetchSectionNames,
  resourceIds: pokeApiResourceIds,
  endpointPath: "/api/v2/{resource}/{id-or-name}/",
  endpointUrl: `${sampleCatalogGeneratorSourceMetadata.baseUrl}/{resource}/{id-or-name}/`,
  query: {
    fixtureOnly: true,
  },
  cachePolicy: {
    enabled: true,
    cacheKey: "catalog-fetch/pokeapi/enrichment/sample-snapshot",
    maxAgeMs: 86_400_000,
    allowStaleFallback: true,
    offlineFallback: "use-checked-in-snapshot",
  },
  retryPolicy: {
    maxAttempts: 3,
    attempt: 0,
    backoffStrategy: "exponential",
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  rateLimitStatus: {
    isLimited: false,
    policyNote: "Fixture only. Confirm live PokeAPI fair-use behavior before enabling execution.",
  },
  notes: [
    "Dry-run planning fixture only; no network request is performed.",
    "PokeAPI is modeled as catalog enrichment only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
  ],
};

export const sampleCatalogSourceSnapshotPayload: CatalogSourceSnapshotPayload<PokeApiCatalogGeneratorSnapshot> = {
  metadata: {
    sourceId: sampleCatalogGeneratorSourceMetadata.sourceId,
    role: "enrichment",
    kind: sampleCatalogGeneratorSourceMetadata.kind,
    name: sampleCatalogGeneratorSourceMetadata.name,
    requestedAt,
    fetchedAt,
    generatedAt,
    sourceVersion: samplePokeApiCatalogGeneratorSnapshot.sourceVersion,
    dataVersion: samplePokeApiCatalogGeneratorSnapshot.sourceVersion,
    documentationUrl: sampleCatalogGeneratorSourceMetadata.documentationUrl,
    endpointUrl: sampleCatalogGeneratorSourceMetadata.baseUrl,
    resourceIds: pokeApiResourceIds,
    targetSections: sampleCatalogFetchSectionNames,
    contentType: "application/json",
    recordCount: pokeApiResourceIds.length,
    contentHash: {
      algorithm: "unknown",
      value: "fixture-pokeapi-snapshot-hash-not-computed",
      canonicalization: "checked-in-fixture-no-live-fetch",
    },
    cacheStatus: "hit-fresh",
    cacheKey: sampleCatalogSourceFetchRequest.cachePolicy.cacheKey,
    requiresAttribution: sampleCatalogGeneratorSourceMetadata.requiresAttribution,
    notes: [
      "Payload wraps checked-in PokeAPI-shaped generator fixture data.",
      "Candidate sprite URLs remain metadata-only and license-review gated.",
    ],
  },
  payload: samplePokeApiCatalogGeneratorSnapshot,
};

export const sampleCatalogFetchPipelineSnapshot: CatalogPipelineSourceSnapshot = {
  sourceId: sampleCatalogSourceSnapshotPayload.metadata.sourceId,
  role: sampleCatalogSourceSnapshotPayload.metadata.role,
  kind: sampleCatalogSourceSnapshotPayload.metadata.kind,
  name: sampleCatalogSourceSnapshotPayload.metadata.name,
  version: sampleCatalogSourceSnapshotPayload.metadata.sourceVersion,
  dataVersion: sampleCatalogSourceSnapshotPayload.metadata.dataVersion,
  fetchedAt: sampleCatalogSourceSnapshotPayload.metadata.fetchedAt,
  generatedAt: sampleCatalogSourceSnapshotPayload.metadata.generatedAt,
  documentationUrl: sampleCatalogSourceSnapshotPayload.metadata.documentationUrl,
  recordCount: sampleCatalogSourceSnapshotPayload.metadata.recordCount,
  contentHash: sampleCatalogSourceSnapshotPayload.metadata.contentHash,
  requiresAttribution: sampleCatalogSourceSnapshotPayload.metadata.requiresAttribution,
  notes: sampleCatalogSourceSnapshotPayload.metadata.notes,
};

export const sampleCatalogSourceFetchSuccessResponse: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot> = {
  requestId: sampleCatalogSourceFetchRequest.id,
  status: "fetched",
  sourceSnapshot: sampleCatalogSourceSnapshotPayload,
  pipelineSnapshot: sampleCatalogFetchPipelineSnapshot,
  cacheStatus: "hit-fresh",
  rateLimitStatus: {
    isLimited: false,
    remaining: 1_000,
    policyNote: "Fixture value only; live limits require separate review.",
  },
  retryPolicy: sampleCatalogSourceFetchRequest.retryPolicy,
  httpStatus: 200,
  startedAt: requestedAt,
  completedAt: fetchedAt,
  issues: [],
};

export const sampleCatalogSourceFetchCacheFallbackResponse: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot> =
  {
    requestId: sampleCatalogSourceFetchRequest.id,
    status: "using-cache",
    sourceSnapshot: {
      ...sampleCatalogSourceSnapshotPayload,
      metadata: {
        ...sampleCatalogSourceSnapshotPayload.metadata,
        cacheStatus: "hit-stale",
        notes: [
          ...(sampleCatalogSourceSnapshotPayload.metadata.notes ?? []),
          "Offline fallback uses checked-in snapshot data and does not imply persistence.",
        ],
      },
    },
    pipelineSnapshot: {
      ...sampleCatalogFetchPipelineSnapshot,
      notes: [
        ...(sampleCatalogFetchPipelineSnapshot.notes ?? []),
        "Cache fallback remains enrichment-only and should be revalidated before bundle emission.",
      ],
    },
    cacheStatus: "hit-stale",
    rateLimitStatus: {
      isLimited: false,
      policyNote: "No live request attempted in this fallback fixture.",
    },
    retryPolicy: {
      ...sampleCatalogSourceFetchRequest.retryPolicy,
      attempt: 0,
    },
    startedAt: requestedAt,
    completedAt: fetchedAt,
    issues: [
      {
        code: "cache-stale",
        severity: "warning",
        sourceId: sampleCatalogGeneratorSourceMetadata.sourceId,
        message: "Checked-in snapshot fallback is stale-tolerant for planning fixtures only.",
      },
    ],
  };

export const sampleCatalogSourceFetchRateLimitedResponse: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot> =
  {
    requestId: sampleCatalogSourceFetchRequest.id,
    status: "rate-limited",
    cacheStatus: "not-checked",
    rateLimitStatus: {
      isLimited: true,
      remaining: 0,
      retryAfterMs: 60_000,
      resetAt: "2026-06-13T14:01:00.000Z",
      policyNote: "Planning fixture only. Live retry policy requires Lead-approved execution work.",
    },
    retryPolicy: {
      ...sampleCatalogSourceFetchRequest.retryPolicy,
      attempt: 1,
      retryAfterMs: 60_000,
      nextRetryAt: "2026-06-13T14:01:00.000Z",
    },
    httpStatus: 429,
    startedAt: requestedAt,
    completedAt: fetchedAt,
    issues: [
      {
        code: "rate-limited",
        severity: "warning",
        sourceId: sampleCatalogGeneratorSourceMetadata.sourceId,
        message: "Future live fetch should pause section progress and retry only under approved policy.",
      },
    ],
  };

export const sampleCatalogSourceFetchBlockedAssetResponse: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot> =
  {
    requestId: sampleCatalogSourceFetchRequest.id,
    status: "blocked",
    cacheStatus: "disabled",
    rateLimitStatus: {
      isLimited: false,
      policyNote: "Blocked by asset source review, not by source rate limiting.",
    },
    retryPolicy: {
      maxAttempts: 0,
      attempt: 0,
      backoffStrategy: "none",
    },
    startedAt: requestedAt,
    completedAt: fetchedAt,
    issues: [
      {
        code: "candidate-source-review-required",
        severity: "warning",
        sourceId: sampleCatalogGeneratorSourceMetadata.sourceId,
        path: "assets.pokemon.animatedSpriteKey",
        message: "Sprite candidate metadata must remain review-gated before any production asset source is approved.",
      },
    ],
  };

export const sampleCatalogSourceFetchResponses: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot>[] = [
  sampleCatalogSourceFetchSuccessResponse,
  sampleCatalogSourceFetchCacheFallbackResponse,
  sampleCatalogSourceFetchRateLimitedResponse,
  sampleCatalogSourceFetchBlockedAssetResponse,
];

export const sampleCatalogFetchGenerationRequest: CatalogPipelineGenerationRequest = {
  id: "catalog-pipeline-dry-run-pokeapi-fetch-handoff",
  mode: "dryRun",
  requestedAt: generatedAt,
  catalogVersion: "catalog-generator-prototype-0.1",
  targetBundleExtension: ".bl",
  sourceSnapshots: [sampleCatalogFetchPipelineSnapshot],
  sourceMetadata: [sampleCatalogGeneratorSourceMetadata],
  sectionNames: sampleCatalogFetchSectionNames,
  assetPolicy: {
    includeCandidateUrls: true,
    requireLicenseReview: true,
    allowedAssetKinds: [
      "pokemon-icon",
      "pokemon-sprite",
      "pokemon-animated-sprite",
      "pokemon-artwork",
      "item-icon",
      "type-icon",
    ],
    allowRemoteRuntimeUrls: false,
    defaultFallbackBehavior: "use-text",
  },
  includeSearchIndex: true,
  includeVisualAssetMetadata: true,
  notes: [
    "Normalization handoff consumes checked-in fetch fixture data only.",
    "PokeAPI remains enrichment-only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
  ],
};

export const sampleCatalogFetchNormalizationHandoff: CatalogFetchNormalizationHandoff<PokeApiCatalogGeneratorSnapshot> =
  {
    id: "catalog-fetch-normalization-handoff-pokeapi-fixture",
    createdAt: generatedAt,
    fetchResponses: sampleCatalogSourceFetchResponses,
    sourceSnapshots: [sampleCatalogFetchPipelineSnapshot],
    generationRequest: sampleCatalogFetchGenerationRequest,
    notes: [
      "Fixture handoff demonstrates future fetch-to-normalization shape only.",
      "No live fetch, file IO, loader, app runtime, UI wiring, or .bl file writing is implemented.",
    ],
  };
