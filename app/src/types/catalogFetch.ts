import type {
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionName,
} from "./catalogBundle";
import type {
  CatalogSourceKind,
  CatalogSourceMetadata,
} from "./catalog";
import type {
  CatalogPipelineGenerationRequest,
  CatalogPipelineSourceRole,
  CatalogPipelineSourceSnapshot,
} from "./catalogPipeline";

export type CatalogSourceFetchStatus =
  | "idle"
  | "queued"
  | "fetching"
  | "fetched"
  | "using-cache"
  | "offline"
  | "rate-limited"
  | "retrying"
  | "failed"
  | "blocked";

export type CatalogSourceFetchIssueSeverity = "info" | "warning" | "error";

export type CatalogSourceFetchIssueCode =
  | "cache-miss"
  | "cache-stale"
  | "candidate-source-review-required"
  | "fetch-aborted"
  | "network-unavailable"
  | "rate-limited"
  | "response-invalid"
  | "retry-exhausted"
  | "source-unavailable"
  | "unsupported-source-role";

export type CatalogSourceCacheStatus =
  | "not-checked"
  | "hit-fresh"
  | "hit-stale"
  | "miss"
  | "disabled"
  | "unavailable";

export type CatalogSourceOfflineFallback =
  | "none"
  | "use-fresh-cache"
  | "use-stale-cache"
  | "use-checked-in-snapshot"
  | "block";

export interface CatalogSourceFetchIssue {
  code: CatalogSourceFetchIssueCode;
  severity: CatalogSourceFetchIssueSeverity;
  message: string;
  sourceId: string;
  resourceId?: string;
  path?: string;
}

export interface CatalogSourceFetchRetryPolicy {
  maxAttempts: number;
  attempt: number;
  backoffStrategy: "none" | "fixed" | "exponential";
  retryAfterMs?: number;
  nextRetryAt?: string;
  retryableStatusCodes?: number[];
}

export interface CatalogSourceRateLimitStatus {
  isLimited: boolean;
  limit?: number;
  remaining?: number;
  resetAt?: string;
  retryAfterMs?: number;
  policyNote?: string;
}

export interface CatalogSourceCachePolicy {
  enabled: boolean;
  cacheKey: string;
  maxAgeMs?: number;
  allowStaleFallback: boolean;
  offlineFallback: CatalogSourceOfflineFallback;
}

export interface CatalogSourceSnapshotMetadata {
  sourceId: string;
  role: CatalogPipelineSourceRole;
  kind: CatalogSourceKind;
  name: string;
  requestedAt: string;
  fetchedAt?: string;
  generatedAt?: string;
  sourceVersion?: string;
  dataVersion?: string;
  documentationUrl?: string;
  endpointUrl?: string;
  resourceIds: string[];
  targetSections: BattleLabCatalogBundleSectionName[];
  contentType?: string;
  recordCount?: number;
  contentHash?: BattleLabCatalogBundleHash;
  cacheStatus: CatalogSourceCacheStatus;
  cacheKey?: string;
  requiresAttribution: boolean;
  notes?: string[];
}

export interface CatalogSourceSnapshotPayload<TPayload = unknown> {
  metadata: CatalogSourceSnapshotMetadata;
  payload: TPayload;
}

export interface CatalogSourceFetchRequest {
  id: string;
  requestedAt: string;
  source: CatalogSourceMetadata;
  role: CatalogPipelineSourceRole;
  targetSections: BattleLabCatalogBundleSectionName[];
  resourceIds: string[];
  endpointPath?: string;
  endpointUrl?: string;
  query?: Record<string, string | number | boolean>;
  cachePolicy: CatalogSourceCachePolicy;
  retryPolicy: CatalogSourceFetchRetryPolicy;
  rateLimitStatus?: CatalogSourceRateLimitStatus;
  notes?: string[];
}

export interface CatalogSourceFetchResponse<TPayload = unknown> {
  requestId: string;
  status: CatalogSourceFetchStatus;
  sourceSnapshot?: CatalogSourceSnapshotPayload<TPayload>;
  pipelineSnapshot?: CatalogPipelineSourceSnapshot;
  cacheStatus: CatalogSourceCacheStatus;
  rateLimitStatus?: CatalogSourceRateLimitStatus;
  retryPolicy: CatalogSourceFetchRetryPolicy;
  httpStatus?: number;
  startedAt?: string;
  completedAt?: string;
  issues: CatalogSourceFetchIssue[];
}

export interface CatalogFetchNormalizationHandoff<TPayload = unknown> {
  id: string;
  createdAt: string;
  fetchResponses: CatalogSourceFetchResponse<TPayload>[];
  sourceSnapshots: CatalogPipelineSourceSnapshot[];
  generationRequest: CatalogPipelineGenerationRequest;
  notes?: string[];
}
