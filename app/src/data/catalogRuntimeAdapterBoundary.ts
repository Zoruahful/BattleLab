import type { BattleLabCatalogBundleSectionName } from "../types/catalogBundle";
import type {
  CatalogSourceFetchIssue,
  CatalogSourceOfflineFallback,
} from "../types/catalogFetch";
import type {
  CatalogFetchExecutionCacheHandoff,
  CatalogFetchExecutionPlan,
  CatalogFetchExecutionProgress,
  CatalogFetchExecutionSafetyPolicy,
  CatalogFetchExecutionStatus,
  CatalogFetchExecutionValidationHandoff,
} from "../types/catalogFetchExecution";
import type { CatalogPipelineSectionProgress } from "../types/catalogPipeline";
import {
  sampleCatalogFetchSectionNames,
  sampleCatalogSourceFetchRequest,
} from "./catalogFetchFixtures";
import {
  sampleCatalogLiveFetchOfflineCacheHandoff,
  sampleCatalogLiveFetchOfflineValidationHandoff,
  sampleCatalogLiveFetchRateLimitedCacheHandoff,
  sampleCatalogLiveFetchSourceValidationBlockedHandoff,
  sampleCatalogLiveFetchSuccessCacheHandoff,
  sampleCatalogLiveFetchSuccessValidationHandoff,
} from "./catalogLiveFetchCacheFixtures";

export type CatalogRuntimeAdapterPhase =
  | "idle"
  | "starting"
  | "fetching"
  | "using-cache"
  | "validating"
  | "normalizing"
  | "complete"
  | "warning"
  | "failed"
  | "cancelled"
  | "blocked";

export type CatalogRuntimeAdapterCommandKind =
  | "start"
  | "cancel"
  | "retry"
  | "use-cache"
  | "reset";

export type CatalogRuntimeAdapterFailureMode =
  | "keep-current-catalog"
  | "use-fresh-cache"
  | "use-stale-cache-with-warning"
  | "block-generated-catalog"
  | "cancel-without-commit";

export interface CatalogRuntimeAdapterCommand {
  kind: CatalogRuntimeAdapterCommandKind;
  enabled: boolean;
  label: string;
  reason?: string;
}

export interface CatalogRuntimeAdapterCancellationPolicy {
  supportsAbortSignal: true;
  cancelCommandKind: "cancel";
  cancellationStatus: Extract<CatalogFetchExecutionStatus, "cancelled">;
  failureMode: Extract<CatalogRuntimeAdapterFailureMode, "cancel-without-commit">;
  preserveCurrentCatalog: true;
  notes: string[];
}

export interface CatalogRuntimeAdapterSingleFlightPolicy {
  lockKey: string;
  rejectConcurrentStarts: true;
  exposeInFlightRunId: true;
  duplicateStartBehavior: "return-existing-read-model";
  notes: string[];
}

export interface CatalogRuntimeAdapterRetryRateLimitPolicy {
  maxAttempts: number;
  backoffStrategy: "none" | "fixed" | "exponential";
  retryableStatusCodes: number[];
  rateLimitBehavior: "pause-progress-and-wait" | "use-cache-fallback" | "block";
  preserveCurrentCatalogDuringRetry: true;
  notes: string[];
}

export interface CatalogRuntimeAdapterCacheOfflinePolicy {
  cacheKey: string;
  enabled: boolean;
  allowStaleFallback: boolean;
  offlineFallback: CatalogSourceOfflineFallback;
  staleCacheFailureMode: Extract<CatalogRuntimeAdapterFailureMode, "use-stale-cache-with-warning">;
  cacheHandoffExamples: {
    success: CatalogFetchExecutionCacheHandoff;
    offline: CatalogFetchExecutionCacheHandoff;
    rateLimited: CatalogFetchExecutionCacheHandoff;
  };
  notes: string[];
}

export interface CatalogRuntimeAdapterValidationGate {
  sourceValidationRequired: true;
  generatedCatalogValidationRequired: true;
  bundleValidationRequired: true;
  sourceErrorsBlockGeneratedCatalog: true;
  generatedCatalogErrorsBlockBundle: true;
  warningsBlockCommit: false;
  validationHandoffExamples: {
    success: CatalogFetchExecutionValidationHandoff;
    offline: CatalogFetchExecutionValidationHandoff;
    sourceBlocked: CatalogFetchExecutionValidationHandoff;
  };
  notes: string[];
}

export interface CatalogRuntimeAdapterSafetyStatus {
  safeToExposeInCatalogUpdate: boolean;
  safeToCommitCatalog: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
  failureMode: CatalogRuntimeAdapterFailureMode;
  notes: string[];
}

export interface CatalogRuntimeAdapterReadModel {
  id: string;
  planId: string;
  phase: CatalogRuntimeAdapterPhase;
  status: CatalogFetchExecutionStatus;
  statusLabel: string;
  message: string;
  progress: CatalogFetchExecutionProgress;
  targetSections: BattleLabCatalogBundleSectionName[];
  commands: CatalogRuntimeAdapterCommand[];
  cancellationPolicy: CatalogRuntimeAdapterCancellationPolicy;
  singleFlightPolicy: CatalogRuntimeAdapterSingleFlightPolicy;
  retryRateLimitPolicy: CatalogRuntimeAdapterRetryRateLimitPolicy;
  cacheOfflinePolicy: CatalogRuntimeAdapterCacheOfflinePolicy;
  validationGate: CatalogRuntimeAdapterValidationGate;
  safetyStatus: CatalogRuntimeAdapterSafetyStatus;
  issues: CatalogSourceFetchIssue[];
  notes: string[];
}

const boundaryCreatedAt = "2026-06-13T21:00:00.000Z";

export const catalogRuntimeAdapterTargetSections: BattleLabCatalogBundleSectionName[] = [
  ...sampleCatalogFetchSectionNames,
];

export const catalogRuntimeAdapterSafetyPolicy: CatalogFetchExecutionSafetyPolicy = {
  allowNetwork: false,
  allowFileRead: false,
  allowFileWrite: false,
  allowRuntimeUiWiring: false,
  allowBundleWriting: false,
  requireLeadApprovalForExecution: true,
  pokeApiRole: "enrichment-only",
  showdownAuthority: "legality-and-simulation-source-of-truth",
  requireSpriteLicenseReview: true,
  notes: [
    "Boundary is data-only and UI-unwired.",
    "Future live execution must be Lead-approved before network or runtime wiring is enabled.",
    "Generated data must pass validation before a later catalog commit path can trust it.",
  ],
};

const createSectionProgress = (
  status: CatalogPipelineSectionProgress["status"],
  progressPercent: number,
  message: string,
): CatalogPipelineSectionProgress[] =>
  catalogRuntimeAdapterTargetSections.map((section) => ({
    section,
    status,
    progressPercent,
    recordsRead: 0,
    recordsWritten: 0,
    warningCount: 0,
    errorCount: 0,
    message,
  }));

export const sampleCatalogRuntimeAdapterBoundaryPlan: CatalogFetchExecutionPlan = {
  id: "catalog-runtime-adapter-boundary-plan",
  createdAt: boundaryCreatedAt,
  environment: "local-preview",
  boundary: "planning-only",
  adapterKind: "browser-fetch",
  status: "planned",
  safetyPolicy: catalogRuntimeAdapterSafetyPolicy,
  targetSections: catalogRuntimeAdapterTargetSections,
  requests: [
    {
      ...sampleCatalogSourceFetchRequest,
      id: "catalog-runtime-adapter-pokeapi-enrichment-request",
      requestedAt: boundaryCreatedAt,
      notes: [
        "Future adapter request shape only; this boundary does not execute fetches.",
        "PokeAPI remains enrichment-only.",
        "Pokemon Showdown remains legality and simulation source of truth.",
      ],
    },
  ],
  steps: [
    {
      id: "single-flight-lock",
      label: "Acquire catalog update single-flight lock",
      status: "planned",
      adapterKind: "test-double",
      boundary: "planning-only",
      targetSections: catalogRuntimeAdapterTargetSections,
      dependsOnStepIds: [],
      issues: [],
    },
    {
      id: "fetch-enrichment-source",
      label: "Fetch PokeAPI enrichment snapshot",
      status: "planned",
      adapterKind: "browser-fetch",
      boundary: "planning-only",
      targetSections: catalogRuntimeAdapterTargetSections,
      fetchRequest: sampleCatalogSourceFetchRequest,
      dependsOnStepIds: ["single-flight-lock"],
      issues: [],
    },
    {
      id: "cache-offline-handoff",
      label: "Resolve cache/offline fallback handoff",
      status: "planned",
      adapterKind: "checked-in-snapshot",
      boundary: "planning-only",
      targetSections: catalogRuntimeAdapterTargetSections,
      dependsOnStepIds: ["fetch-enrichment-source"],
      issues: [],
    },
    {
      id: "validation-handoff",
      label: "Validate source and generated catalog handoff",
      status: "planned",
      adapterKind: "test-double",
      boundary: "planning-only",
      targetSections: catalogRuntimeAdapterTargetSections,
      dependsOnStepIds: ["cache-offline-handoff"],
      issues: [],
    },
  ],
  retryPolicy: sampleCatalogSourceFetchRequest.retryPolicy,
  rateLimitStatus: sampleCatalogSourceFetchRequest.rateLimitStatus,
  cacheHandoff: sampleCatalogLiveFetchSuccessCacheHandoff,
  validationHandoff: sampleCatalogLiveFetchSuccessValidationHandoff,
  notes: [
    "Future Catalog Update can consume the read model from this plan without owning fetch execution details.",
    "No React UI wiring, durable persistence, or .bl writing is implemented here.",
  ],
};

export const catalogRuntimeAdapterCancellationPolicy: CatalogRuntimeAdapterCancellationPolicy = {
  supportsAbortSignal: true,
  cancelCommandKind: "cancel",
  cancellationStatus: "cancelled",
  failureMode: "cancel-without-commit",
  preserveCurrentCatalog: true,
  notes: [
    "Cancellation should abort in-flight source requests when execution exists.",
    "Cancelled runs must not replace the current trusted catalog or write bundle output.",
  ],
};

export const catalogRuntimeAdapterSingleFlightPolicy: CatalogRuntimeAdapterSingleFlightPolicy = {
  lockKey: "battlelab-catalog-update-runtime",
  rejectConcurrentStarts: true,
  exposeInFlightRunId: true,
  duplicateStartBehavior: "return-existing-read-model",
  notes: [
    "Only one catalog update run should be active at a time.",
    "Duplicate start commands should surface the existing run state instead of starting another fetch.",
  ],
};

export const catalogRuntimeAdapterRetryRateLimitPolicy: CatalogRuntimeAdapterRetryRateLimitPolicy = {
  maxAttempts: sampleCatalogSourceFetchRequest.retryPolicy.maxAttempts,
  backoffStrategy: sampleCatalogSourceFetchRequest.retryPolicy.backoffStrategy,
  retryableStatusCodes: sampleCatalogSourceFetchRequest.retryPolicy.retryableStatusCodes ?? [],
  rateLimitBehavior: "use-cache-fallback",
  preserveCurrentCatalogDuringRetry: true,
  notes: [
    "Rate-limited execution should pause progress, expose retry timing, and use approved fallback data only.",
    "Retry exhaustion must fail safely without committing generated catalog data.",
  ],
};

export const catalogRuntimeAdapterCacheOfflinePolicy: CatalogRuntimeAdapterCacheOfflinePolicy = {
  cacheKey: sampleCatalogSourceFetchRequest.cachePolicy.cacheKey,
  enabled: sampleCatalogSourceFetchRequest.cachePolicy.enabled,
  allowStaleFallback: sampleCatalogSourceFetchRequest.cachePolicy.allowStaleFallback,
  offlineFallback: sampleCatalogSourceFetchRequest.cachePolicy.offlineFallback,
  staleCacheFailureMode: "use-stale-cache-with-warning",
  cacheHandoffExamples: {
    success: sampleCatalogLiveFetchSuccessCacheHandoff,
    offline: sampleCatalogLiveFetchOfflineCacheHandoff,
    rateLimited: sampleCatalogLiveFetchRateLimitedCacheHandoff,
  },
  notes: [
    "Cache/offline fallback is a policy and fixture shape only; no cache file IO is implemented.",
    "Stale cache fallback must remain warning-bearing and revalidated before trust.",
  ],
};

export const catalogRuntimeAdapterValidationGate: CatalogRuntimeAdapterValidationGate = {
  sourceValidationRequired: true,
  generatedCatalogValidationRequired: true,
  bundleValidationRequired: true,
  sourceErrorsBlockGeneratedCatalog: true,
  generatedCatalogErrorsBlockBundle: true,
  warningsBlockCommit: false,
  validationHandoffExamples: {
    success: sampleCatalogLiveFetchSuccessValidationHandoff,
    offline: sampleCatalogLiveFetchOfflineValidationHandoff,
    sourceBlocked: sampleCatalogLiveFetchSourceValidationBlockedHandoff,
  },
  notes: [
    "Source DTO validation errors block generated catalog handoff.",
    "Generated catalog validation errors block generated bundle validation.",
    "Warnings remain visible but non-failing until Lead changes the policy.",
  ],
};

const phaseByStatus: Record<CatalogFetchExecutionStatus, CatalogRuntimeAdapterPhase> = {
  idle: "idle",
  planned: "idle",
  blocked: "blocked",
  queued: "starting",
  fetching: "fetching",
  "using-cache": "using-cache",
  "validating-source": "validating",
  normalizing: "normalizing",
  "validating-catalog": "validating",
  "validating-bundle": "validating",
  complete: "complete",
  "complete-with-warnings": "warning",
  failed: "failed",
  cancelled: "cancelled",
};

const statusLabelByPhase: Record<CatalogRuntimeAdapterPhase, string> = {
  idle: "Catalog update ready",
  starting: "Catalog update starting",
  fetching: "Fetching enrichment data",
  "using-cache": "Using catalog cache fallback",
  validating: "Validating catalog data",
  normalizing: "Normalizing catalog records",
  complete: "Catalog data validated",
  warning: "Catalog data validated with warnings",
  failed: "Catalog update failed safely",
  cancelled: "Catalog update cancelled",
  blocked: "Catalog update blocked",
};

const createCommands = (
  status: CatalogFetchExecutionStatus,
  hasErrors: boolean,
): CatalogRuntimeAdapterCommand[] => {
  const isRunning =
    status === "queued" ||
    status === "fetching" ||
    status === "using-cache" ||
    status === "validating-source" ||
    status === "normalizing" ||
    status === "validating-catalog" ||
    status === "validating-bundle";

  return [
    {
      kind: "start",
      enabled: status === "idle" || status === "planned" || status === "failed" || status === "cancelled",
      label: "Start catalog update",
      reason: isRunning ? "A catalog update run is already active." : undefined,
    },
    {
      kind: "cancel",
      enabled: isRunning,
      label: "Cancel catalog update",
      reason: isRunning ? undefined : "No catalog update run is active.",
    },
    {
      kind: "retry",
      enabled: status === "failed" || hasErrors,
      label: "Retry catalog update",
      reason: status === "blocked" ? "Blocked runs require policy review before retry." : undefined,
    },
    {
      kind: "use-cache",
      enabled: status === "failed" || status === "blocked" || status === "using-cache",
      label: "Use cache fallback",
      reason: "Cache fallback remains warning-bearing until validation passes.",
    },
    {
      kind: "reset",
      enabled: status !== "idle",
      label: "Reset preview state",
    },
  ];
};

const createProgress = (
  status: CatalogFetchExecutionStatus,
  sections: CatalogPipelineSectionProgress[],
  message: string,
): CatalogFetchExecutionProgress => {
  const completedStepCount = status === "complete" || status === "complete-with-warnings" ? 4 : 0;
  const warningCount = sections.reduce((total, section) => total + section.warningCount, 0);
  const errorCount = sections.reduce((total, section) => total + section.errorCount, 0);

  return {
    status,
    currentStepId: status === "planned" || status === "idle" ? undefined : "validation-handoff",
    completedStepCount,
    totalStepCount: 4,
    progressPercent: completedStepCount === 4 ? 100 : 0,
    sections,
    issueCount: warningCount + errorCount,
    warningCount,
    errorCount,
    message,
  };
};

export function createCatalogRuntimeAdapterReadModel(
  plan: CatalogFetchExecutionPlan = sampleCatalogRuntimeAdapterBoundaryPlan,
  status: CatalogFetchExecutionStatus = plan.status,
  issues: CatalogSourceFetchIssue[] = [],
): CatalogRuntimeAdapterReadModel {
  const phase = phaseByStatus[status];
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const sections = createSectionProgress(
    hasErrors ? "failed" : phase === "complete" ? "complete" : phase === "warning" ? "warning" : "pending",
    phase === "complete" || phase === "warning" ? 100 : 0,
    statusLabelByPhase[phase],
  );
  const progress = createProgress(status, sections, statusLabelByPhase[phase]);

  return {
    id: "catalog-runtime-adapter-read-model",
    planId: plan.id,
    phase,
    status,
    statusLabel: statusLabelByPhase[phase],
    message:
      phase === "failed" || hasErrors
        ? "Catalog update failed safely. Current trusted catalog data remains in use."
        : "Catalog update adapter boundary is ready for future execution wiring.",
    progress,
    targetSections: plan.targetSections,
    commands: createCommands(status, hasErrors),
    cancellationPolicy: catalogRuntimeAdapterCancellationPolicy,
    singleFlightPolicy: catalogRuntimeAdapterSingleFlightPolicy,
    retryRateLimitPolicy: catalogRuntimeAdapterRetryRateLimitPolicy,
    cacheOfflinePolicy: catalogRuntimeAdapterCacheOfflinePolicy,
    validationGate: catalogRuntimeAdapterValidationGate,
    safetyStatus: {
      safeToExposeInCatalogUpdate: true,
      safeToCommitCatalog: false,
      safeToWriteBundle: false,
      safeToUseSpriteAssetsInProduction: false,
      failureMode: hasErrors ? "block-generated-catalog" : "keep-current-catalog",
      notes: [
        "Read model is suitable for future Catalog Update status display only.",
        "It does not authorize committing generated catalog data or writing .bl bundles.",
      ],
    },
    issues,
    notes: [
      "PokeAPI/catalog data is enrichment-only.",
      "Pokemon Showdown remains the legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
      "No Catalog Update UI wiring or runtime execution is implemented.",
    ],
  };
}

export const sampleCatalogRuntimeAdapterReadModel = createCatalogRuntimeAdapterReadModel();
