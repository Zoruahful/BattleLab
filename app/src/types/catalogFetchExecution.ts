import type {
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationResult,
} from "./catalogBundle";
import type {
  CatalogFetchNormalizationHandoff,
  CatalogSourceCachePolicy,
  CatalogSourceFetchIssue,
  CatalogSourceFetchRequest,
  CatalogSourceFetchResponse,
  CatalogSourceFetchRetryPolicy,
  CatalogSourceFetchStatus,
  CatalogSourceRateLimitStatus,
  CatalogSourceSnapshotPayload,
} from "./catalogFetch";
import type {
  CatalogPipelineGenerationRequest,
  CatalogPipelineSectionProgress,
  CatalogPipelineValidationResult,
} from "./catalogPipeline";
import type { PokeApiCatalogSourceSnapshot } from "./pokeApiSource";

export type CatalogFetchExecutionAdapterKind =
  | "browser-fetch"
  | "local-process-fetch"
  | "checked-in-snapshot"
  | "test-double";

export type CatalogFetchExecutionBoundary =
  | "planning-only"
  | "browser-app"
  | "local-generator-process"
  | "offline-fixture";

export type CatalogFetchExecutionEnvironment =
  | "development"
  | "test"
  | "local-preview"
  | "production-disabled";

export type CatalogFetchExecutionStatus =
  | "idle"
  | "planned"
  | "blocked"
  | "queued"
  | "fetching"
  | "using-cache"
  | "validating-source"
  | "normalizing"
  | "validating-catalog"
  | "validating-bundle"
  | "complete"
  | "complete-with-warnings"
  | "failed"
  | "cancelled";

export type CatalogFetchExecutionEventKind =
  | "plan-created"
  | "step-started"
  | "step-progress"
  | "step-completed"
  | "step-skipped"
  | "step-failed"
  | "cache-handoff-created"
  | "validation-handoff-created"
  | "execution-blocked";

export interface CatalogFetchExecutionSafetyPolicy {
  allowNetwork: boolean;
  allowFileRead: boolean;
  allowFileWrite: boolean;
  allowRuntimeUiWiring: boolean;
  allowBundleWriting: boolean;
  requireLeadApprovalForExecution: boolean;
  pokeApiRole: "enrichment-only";
  showdownAuthority: "legality-and-simulation-source-of-truth";
  requireSpriteLicenseReview: boolean;
  notes: string[];
}

export interface CatalogFetchExecutionStep {
  id: string;
  label: string;
  status: CatalogFetchExecutionStatus;
  adapterKind: CatalogFetchExecutionAdapterKind;
  boundary: CatalogFetchExecutionBoundary;
  targetSections: BattleLabCatalogBundleSectionName[];
  fetchRequest?: CatalogSourceFetchRequest;
  dependsOnStepIds: string[];
  startedAt?: string;
  completedAt?: string;
  issues: CatalogSourceFetchIssue[];
}

export interface CatalogFetchExecutionProgress {
  status: CatalogFetchExecutionStatus;
  currentStepId?: string;
  completedStepCount: number;
  totalStepCount: number;
  progressPercent: number;
  sections: CatalogPipelineSectionProgress[];
  issueCount: number;
  warningCount: number;
  errorCount: number;
  message?: string;
}

export interface CatalogFetchExecutionEvent {
  id: string;
  kind: CatalogFetchExecutionEventKind;
  status: CatalogFetchExecutionStatus;
  createdAt: string;
  stepId?: string;
  progress?: CatalogFetchExecutionProgress;
  issue?: CatalogSourceFetchIssue;
  message?: string;
}

export interface CatalogFetchExecutionCacheHandoff<TPayload = PokeApiCatalogSourceSnapshot> {
  id: string;
  createdAt: string;
  cachePolicy: CatalogSourceCachePolicy;
  cacheKey: string;
  status: CatalogSourceFetchStatus;
  contentHash?: BattleLabCatalogBundleHash;
  sourceSnapshot?: CatalogSourceSnapshotPayload<TPayload>;
  notes: string[];
}

export interface CatalogFetchExecutionValidationHandoff<TPayload = PokeApiCatalogSourceSnapshot> {
  id: string;
  createdAt: string;
  sourceSnapshot?: CatalogSourceSnapshotPayload<TPayload>;
  normalizationHandoff?: CatalogFetchNormalizationHandoff<TPayload>;
  generationRequest?: CatalogPipelineGenerationRequest;
  sourceValidationRequired: true;
  generatedCatalogValidationRequired: true;
  bundleValidationRequired: true;
  validationResult?: CatalogPipelineValidationResult;
  bundleValidationResult?: BattleLabCatalogBundleValidationResult;
  notes: string[];
}

export interface CatalogFetchExecutionPlan<TPayload = PokeApiCatalogSourceSnapshot> {
  id: string;
  createdAt: string;
  environment: CatalogFetchExecutionEnvironment;
  boundary: CatalogFetchExecutionBoundary;
  adapterKind: CatalogFetchExecutionAdapterKind;
  status: CatalogFetchExecutionStatus;
  safetyPolicy: CatalogFetchExecutionSafetyPolicy;
  targetSections: BattleLabCatalogBundleSectionName[];
  requests: CatalogSourceFetchRequest[];
  steps: CatalogFetchExecutionStep[];
  retryPolicy: CatalogSourceFetchRetryPolicy;
  rateLimitStatus?: CatalogSourceRateLimitStatus;
  cacheHandoff?: CatalogFetchExecutionCacheHandoff<TPayload>;
  validationHandoff?: CatalogFetchExecutionValidationHandoff<TPayload>;
  notes: string[];
}

export interface CatalogFetchExecutionResult<TPayload = PokeApiCatalogSourceSnapshot> {
  id: string;
  planId: string;
  status: CatalogFetchExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  responses: CatalogSourceFetchResponse<TPayload>[];
  cacheHandoff?: CatalogFetchExecutionCacheHandoff<TPayload>;
  validationHandoff?: CatalogFetchExecutionValidationHandoff<TPayload>;
  progress: CatalogFetchExecutionProgress;
  events: CatalogFetchExecutionEvent[];
  issues: CatalogSourceFetchIssue[];
}
