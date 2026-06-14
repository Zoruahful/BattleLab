import type {
  CatalogSourceCacheStatus,
  CatalogSourceOfflineFallback,
} from "../types/catalogFetch";
import type {
  CatalogFetchExecutionCacheHandoff,
  CatalogFetchExecutionValidationHandoff,
} from "../types/catalogFetchExecution";
import {
  sampleCatalogGeneratedSnapshotComparison,
  type CatalogGeneratedSnapshotComparison,
} from "./catalogGeneratedSnapshotComparison";
import {
  sampleCatalogLiveFetchOfflineCacheHandoff,
  sampleCatalogLiveFetchOfflineValidationHandoff,
  sampleCatalogLiveFetchRateLimitedCacheHandoff,
  sampleCatalogLiveFetchSourceValidationBlockedHandoff,
  sampleCatalogLiveFetchSuccessCacheHandoff,
  sampleCatalogLiveFetchSuccessValidationHandoff,
} from "./catalogLiveFetchCacheFixtures";
import { sampleCatalogUpdateReadModelProps } from "./catalogUpdateReadModelProps";

export type CatalogCacheEntryKind = "source-snapshot" | "generated-catalog";

export type CatalogCacheFreshnessStatus = "fresh" | "stale" | "expired" | "invalid";

export type CatalogCacheTrustLevel =
  | "untrusted"
  | "metadata-only"
  | "validated-source"
  | "validated-generated-catalog"
  | "validated-bundle-ready";

export type CatalogCacheFallbackDecisionKind =
  | "use-fresh-cache"
  | "use-stale-cache-with-warning"
  | "use-checked-in-snapshot"
  | "block-expired-cache"
  | "block-invalid-cache";

export interface CatalogCacheNamespacePolicy {
  namespace: string;
  version: "battlelab-catalog-cache-contracts-v1";
  logicalKeyPrefix: string;
  allowedEntryKinds: CatalogCacheEntryKind[];
  forbiddenStorageBackends: string[];
  keyRules: string[];
  notes: string[];
}

export interface CatalogCacheEntryMetadata {
  id: string;
  kind: CatalogCacheEntryKind;
  logicalKey: string;
  sourceId: string;
  freshnessStatus: CatalogCacheFreshnessStatus;
  cacheStatus: CatalogSourceCacheStatus;
  createdAt: string;
  validatedAt?: string;
  staleAfter?: string;
  expiresAt?: string;
  trustLevel: CatalogCacheTrustLevel;
  canUseForOfflineFallback: boolean;
  warningRequired: boolean;
  safeToCommitCatalog: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
  cacheHandoff?: CatalogFetchExecutionCacheHandoff;
  validationHandoff?: CatalogFetchExecutionValidationHandoff;
  comparison?: CatalogGeneratedSnapshotComparison;
  notes: string[];
}

export interface CatalogCacheFallbackDecision {
  id: string;
  decision: CatalogCacheFallbackDecisionKind;
  fromStatus: CatalogCacheFreshnessStatus;
  offlineFallback: CatalogSourceOfflineFallback;
  cacheEntryId?: string;
  canUseEntry: boolean;
  warningRequired: boolean;
  requiresSourceValidation: boolean;
  requiresGeneratedCatalogValidation: boolean;
  safeToCommitCatalog: false;
  notes: string[];
}

export interface CatalogCacheValidationRequirements {
  sourceValidationRequired: true;
  generatedCatalogValidationRequired: true;
  bundleHashValidationRequired: true;
  bundleSignatureRequired: false;
  sourceErrorsBlockGeneratedCatalog: true;
  generatedCatalogErrorsBlockBundle: true;
  warningsBlockPreview: false;
  errorsBlockTrust: true;
  notes: string[];
}

export interface CatalogCacheContractFixture {
  id: string;
  createdAt: string;
  namespacePolicy: CatalogCacheNamespacePolicy;
  entries: CatalogCacheEntryMetadata[];
  fallbackDecisions: CatalogCacheFallbackDecision[];
  validationRequirements: CatalogCacheValidationRequirements;
  readModelSafety: typeof sampleCatalogUpdateReadModelProps.safety;
  comparisonSectionCount: number;
  notes: string[];
}

const createdAt = "2026-06-14T10:00:00.000Z";

export const sampleCatalogCacheNamespacePolicy: CatalogCacheNamespacePolicy = {
  namespace: "battlelab.catalog.preview",
  version: "battlelab-catalog-cache-contracts-v1",
  logicalKeyPrefix: "battlelab.catalog.preview",
  allowedEntryKinds: ["source-snapshot", "generated-catalog"],
  forbiddenStorageBackends: [
    "localStorage",
    "IndexedDB",
    "SQLite",
    "Electron",
    "filesystem",
    "backend",
  ],
  keyRules: [
    "Keys are logical identifiers only.",
    "Keys must not contain filesystem paths, URL schemes, drive letters, or storage backend names.",
    "Keys must be stable across preview fixtures so future cache handoff validation can compare metadata.",
  ],
  notes: [
    "Cache contracts are metadata-only and do not implement cache file IO.",
    "No localStorage, IndexedDB, SQLite, Electron, filesystem path, or backend storage is used.",
  ],
};

export const sampleCatalogCacheValidationRequirements: CatalogCacheValidationRequirements = {
  sourceValidationRequired: true,
  generatedCatalogValidationRequired: true,
  bundleHashValidationRequired: true,
  bundleSignatureRequired: false,
  sourceErrorsBlockGeneratedCatalog: true,
  generatedCatalogErrorsBlockBundle: true,
  warningsBlockPreview: false,
  errorsBlockTrust: true,
  notes: [
    "Cached source snapshots must pass source DTO validation before generated catalog handoff.",
    "Cached generated catalog data must pass generated catalog validation before bundle validation.",
    "Bundle hash validation remains required before any future trusted handoff.",
    "Bundle signatures are future contract fields and are not required for this preview fixture.",
  ],
};

export const sampleCatalogCacheEntries: CatalogCacheEntryMetadata[] = [
  {
    id: "fresh-pokeapi-source-snapshot",
    kind: "source-snapshot",
    logicalKey: "battlelab.catalog.preview/source/pokeapi/live-fetch-prototype/v2",
    sourceId: "pokeapi",
    freshnessStatus: "fresh",
    cacheStatus: "hit-fresh",
    createdAt,
    validatedAt: createdAt,
    staleAfter: "2026-06-21T10:00:00.000Z",
    expiresAt: "2026-07-14T10:00:00.000Z",
    trustLevel: "validated-source",
    canUseForOfflineFallback: true,
    warningRequired: false,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    cacheHandoff: sampleCatalogLiveFetchSuccessCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchSuccessValidationHandoff,
    notes: [
      "Fresh source snapshot metadata can seed preview handoff only after source validation.",
      "PokeAPI remains enrichment-only.",
    ],
  },
  {
    id: "stale-pokeapi-source-snapshot",
    kind: "source-snapshot",
    logicalKey: "battlelab.catalog.preview/source/pokeapi/live-fetch-prototype/v2-stale",
    sourceId: "pokeapi",
    freshnessStatus: "stale",
    cacheStatus: "hit-stale",
    createdAt: "2026-05-14T10:00:00.000Z",
    validatedAt: "2026-05-14T10:00:00.000Z",
    staleAfter: "2026-05-21T10:00:00.000Z",
    expiresAt: "2026-07-14T10:00:00.000Z",
    trustLevel: "metadata-only",
    canUseForOfflineFallback: true,
    warningRequired: true,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    cacheHandoff: sampleCatalogLiveFetchOfflineCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchOfflineValidationHandoff,
    notes: [
      "Stale cache fallback is warning-bearing and must be revalidated before trust.",
      "Using stale metadata does not authorize committing generated catalog data.",
    ],
  },
  {
    id: "rate-limited-stale-source-snapshot",
    kind: "source-snapshot",
    logicalKey: "battlelab.catalog.preview/source/pokeapi/live-fetch-prototype/v2-rate-limited",
    sourceId: "pokeapi",
    freshnessStatus: "stale",
    cacheStatus: "hit-stale",
    createdAt: "2026-05-14T10:00:00.000Z",
    validatedAt: "2026-05-14T10:00:00.000Z",
    staleAfter: "2026-05-21T10:00:00.000Z",
    expiresAt: "2026-07-14T10:00:00.000Z",
    trustLevel: "metadata-only",
    canUseForOfflineFallback: true,
    warningRequired: true,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    cacheHandoff: sampleCatalogLiveFetchRateLimitedCacheHandoff,
    validationHandoff: sampleCatalogLiveFetchOfflineValidationHandoff,
    notes: [
      "Rate-limited fallback can surface cache metadata but must not become a successful commit path.",
      "Warnings stay visible in the future read model.",
    ],
  },
  {
    id: "expired-pokeapi-source-snapshot",
    kind: "source-snapshot",
    logicalKey: "battlelab.catalog.preview/source/pokeapi/live-fetch-prototype/v2-expired",
    sourceId: "pokeapi",
    freshnessStatus: "expired",
    cacheStatus: "hit-stale",
    createdAt: "2026-03-14T10:00:00.000Z",
    validatedAt: "2026-03-14T10:00:00.000Z",
    staleAfter: "2026-03-21T10:00:00.000Z",
    expiresAt: "2026-04-14T10:00:00.000Z",
    trustLevel: "metadata-only",
    canUseForOfflineFallback: false,
    warningRequired: true,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    notes: [
      "Expired cache metadata is blocked from fallback use.",
      "Current trusted catalog data must remain in place when only expired metadata is available.",
    ],
  },
  {
    id: "validated-generated-catalog-preview",
    kind: "generated-catalog",
    logicalKey: "battlelab.catalog.preview/generated/pokeapi/catalog/v2",
    sourceId: "pokeapi",
    freshnessStatus: "fresh",
    cacheStatus: "hit-fresh",
    createdAt,
    validatedAt: createdAt,
    staleAfter: "2026-06-21T10:00:00.000Z",
    expiresAt: "2026-07-14T10:00:00.000Z",
    trustLevel: "validated-generated-catalog",
    canUseForOfflineFallback: true,
    warningRequired: false,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    comparison: sampleCatalogGeneratedSnapshotComparison,
    notes: [
      "Generated catalog metadata is preview-only and still not safe to commit.",
      "Pokemon Showdown remains legality and simulation source of truth.",
    ],
  },
  {
    id: "invalid-generated-catalog-preview",
    kind: "generated-catalog",
    logicalKey: "battlelab.catalog.preview/generated/pokeapi/catalog/v2-invalid",
    sourceId: "pokeapi",
    freshnessStatus: "invalid",
    cacheStatus: "unavailable",
    createdAt,
    trustLevel: "untrusted",
    canUseForOfflineFallback: false,
    warningRequired: true,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    validationHandoff: sampleCatalogLiveFetchSourceValidationBlockedHandoff,
    notes: [
      "Invalid generated catalog metadata is blocked before bundle validation.",
      "Source validation errors must stay visible to future read-model consumers.",
    ],
  },
];

export const sampleCatalogCacheFallbackDecisions: CatalogCacheFallbackDecision[] = [
  {
    id: "fresh-cache-preview-handoff",
    decision: "use-fresh-cache",
    fromStatus: "fresh",
    offlineFallback: "use-fresh-cache",
    cacheEntryId: "fresh-pokeapi-source-snapshot",
    canUseEntry: true,
    warningRequired: false,
    requiresSourceValidation: true,
    requiresGeneratedCatalogValidation: true,
    safeToCommitCatalog: false,
    notes: [
      "Fresh cache metadata can continue through validation handoff.",
      "Future commit paths remain closed in this preview contract.",
    ],
  },
  {
    id: "stale-cache-warning-preview-handoff",
    decision: "use-stale-cache-with-warning",
    fromStatus: "stale",
    offlineFallback: "use-stale-cache",
    cacheEntryId: "stale-pokeapi-source-snapshot",
    canUseEntry: true,
    warningRequired: true,
    requiresSourceValidation: true,
    requiresGeneratedCatalogValidation: true,
    safeToCommitCatalog: false,
    notes: [
      "Stale cache fallback remains warning-bearing.",
      "Stale cache fallback requires validation before generated catalog trust.",
    ],
  },
  {
    id: "checked-in-snapshot-preview-fallback",
    decision: "use-checked-in-snapshot",
    fromStatus: "expired",
    offlineFallback: "use-checked-in-snapshot",
    canUseEntry: true,
    warningRequired: true,
    requiresSourceValidation: true,
    requiresGeneratedCatalogValidation: true,
    safeToCommitCatalog: false,
    notes: [
      "Checked-in snapshot fallback is metadata-only and does not imply cache file IO.",
      "Fallback data remains enrichment-only and validation-gated.",
    ],
  },
  {
    id: "expired-cache-blocked",
    decision: "block-expired-cache",
    fromStatus: "expired",
    offlineFallback: "block",
    cacheEntryId: "expired-pokeapi-source-snapshot",
    canUseEntry: false,
    warningRequired: true,
    requiresSourceValidation: true,
    requiresGeneratedCatalogValidation: true,
    safeToCommitCatalog: false,
    notes: [
      "Expired cache metadata is blocked from offline fallback.",
      "Safe failure keeps current trusted catalog data in place.",
    ],
  },
  {
    id: "invalid-cache-blocked",
    decision: "block-invalid-cache",
    fromStatus: "invalid",
    offlineFallback: "block",
    cacheEntryId: "invalid-generated-catalog-preview",
    canUseEntry: false,
    warningRequired: true,
    requiresSourceValidation: true,
    requiresGeneratedCatalogValidation: true,
    safeToCommitCatalog: false,
    notes: [
      "Invalid generated catalog metadata blocks bundle validation.",
      "Source and generated catalog errors must not become a successful handoff.",
    ],
  },
];

export const sampleCatalogCacheContractFixture: CatalogCacheContractFixture = {
  id: "catalog-cache-contracts-preview-v1",
  createdAt,
  namespacePolicy: sampleCatalogCacheNamespacePolicy,
  entries: sampleCatalogCacheEntries,
  fallbackDecisions: sampleCatalogCacheFallbackDecisions,
  validationRequirements: sampleCatalogCacheValidationRequirements,
  readModelSafety: sampleCatalogUpdateReadModelProps.safety,
  comparisonSectionCount: sampleCatalogGeneratedSnapshotComparison.sections.length,
  notes: [
    "Cache contract fixtures are data-only and UI-unwired.",
    "They do not implement cache file IO, localStorage, IndexedDB, SQLite, Electron, filesystem paths, or backend storage.",
    "PokeAPI/catalog data remains enrichment-only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
    "Sprite metadata remains candidate-review-gated only.",
  ],
};
