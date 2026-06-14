import {
  catalogRuntimeAdapterSafetyPolicy,
  catalogRuntimeAdapterValidationGate,
  sampleCatalogRuntimeAdapterReadModel,
} from "./catalogRuntimeAdapterBoundary";
import {
  sampleCatalogLiveFetchOfflineCacheHandoff,
  sampleCatalogLiveFetchOfflineValidationHandoff,
  sampleCatalogLiveFetchRateLimitedCacheHandoff,
  sampleCatalogLiveFetchSourceValidationBlockedHandoff,
} from "./catalogLiveFetchCacheFixtures";

export type CatalogRuntimeAdapterBoundaryValidationSeverity = "error" | "warning";

export type CatalogRuntimeAdapterBoundaryValidationCode =
  | "generated-catalog-errors-do-not-block-bundle"
  | "rate-limited-fallback-can-commit"
  | "runtime-safety-flag-enabled"
  | "source-errors-do-not-block-generated-catalog"
  | "stale-cache-not-warning-bearing";

export interface CatalogRuntimeAdapterBoundaryValidationIssue {
  code: CatalogRuntimeAdapterBoundaryValidationCode;
  severity: CatalogRuntimeAdapterBoundaryValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogRuntimeAdapterBoundaryValidationResult {
  isValid: boolean;
  issues: CatalogRuntimeAdapterBoundaryValidationIssue[];
  checkedRules: string[];
}

const addIssue = (
  issues: CatalogRuntimeAdapterBoundaryValidationIssue[],
  code: CatalogRuntimeAdapterBoundaryValidationCode,
  path: string,
  message: string,
) => {
  issues.push({
    code,
    severity: "error",
    path,
    message,
  });
};

const hasWarning = (items: Array<{ severity: string; code?: string }>, code?: string) =>
  items.some((item) => item.severity === "warning" && (!code || item.code === code));

export function validateCatalogRuntimeAdapterBoundaryHardening(): CatalogRuntimeAdapterBoundaryValidationResult {
  const issues: CatalogRuntimeAdapterBoundaryValidationIssue[] = [];

  if (sampleCatalogLiveFetchOfflineCacheHandoff.status !== "using-cache") {
    addIssue(
      issues,
      "stale-cache-not-warning-bearing",
      "sampleCatalogLiveFetchOfflineCacheHandoff.status",
      "Stale cache fallback must stay in using-cache state, not a successful fetch state.",
    );
  }

  if (sampleCatalogLiveFetchOfflineCacheHandoff.sourceSnapshot?.metadata.cacheStatus !== "hit-stale") {
    addIssue(
      issues,
      "stale-cache-not-warning-bearing",
      "sampleCatalogLiveFetchOfflineCacheHandoff.sourceSnapshot.metadata.cacheStatus",
      "Offline fallback must preserve hit-stale cache metadata.",
    );
  }

  if (!hasWarning(sampleCatalogLiveFetchOfflineValidationHandoff.validationResult?.warnings ?? [])) {
    addIssue(
      issues,
      "stale-cache-not-warning-bearing",
      "sampleCatalogLiveFetchOfflineValidationHandoff.validationResult.warnings",
      "Offline stale cache validation handoff must carry at least one warning.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.normalizationHandoff) {
    addIssue(
      issues,
      "source-errors-do-not-block-generated-catalog",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.normalizationHandoff",
      "Source validation failures must not expose a normalization handoff.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.generationRequest) {
    addIssue(
      issues,
      "source-errors-do-not-block-generated-catalog",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.generationRequest",
      "Source validation failures must not expose a generated catalog request.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.validationResult?.isValid !== false) {
    addIssue(
      issues,
      "source-errors-do-not-block-generated-catalog",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.validationResult.isValid",
      "Source validation blocked handoff must remain invalid.",
    );
  }

  if (!catalogRuntimeAdapterValidationGate.generatedCatalogErrorsBlockBundle) {
    addIssue(
      issues,
      "generated-catalog-errors-do-not-block-bundle",
      "catalogRuntimeAdapterValidationGate.generatedCatalogErrorsBlockBundle",
      "Generated catalog errors must block generated bundle validation.",
    );
  }

  if (!catalogRuntimeAdapterValidationGate.sourceErrorsBlockGeneratedCatalog) {
    addIssue(
      issues,
      "source-errors-do-not-block-generated-catalog",
      "catalogRuntimeAdapterValidationGate.sourceErrorsBlockGeneratedCatalog",
      "Source validation errors must block generated catalog handoff.",
    );
  }

  if (sampleCatalogLiveFetchRateLimitedCacheHandoff.status !== "rate-limited") {
    addIssue(
      issues,
      "rate-limited-fallback-can-commit",
      "sampleCatalogLiveFetchRateLimitedCacheHandoff.status",
      "Rate-limited fallback must remain rate-limited, not complete or fetched.",
    );
  }

  if (sampleCatalogRuntimeAdapterReadModel.safetyStatus.safeToCommitCatalog) {
    addIssue(
      issues,
      "rate-limited-fallback-can-commit",
      "sampleCatalogRuntimeAdapterReadModel.safetyStatus.safeToCommitCatalog",
      "Runtime adapter read model must not expose a successful commit path.",
    );
  }

  if (
    catalogRuntimeAdapterSafetyPolicy.allowNetwork ||
    catalogRuntimeAdapterSafetyPolicy.allowFileRead ||
    catalogRuntimeAdapterSafetyPolicy.allowFileWrite ||
    catalogRuntimeAdapterSafetyPolicy.allowRuntimeUiWiring ||
    catalogRuntimeAdapterSafetyPolicy.allowBundleWriting
  ) {
    addIssue(
      issues,
      "runtime-safety-flag-enabled",
      "catalogRuntimeAdapterSafetyPolicy",
      "Current runtime adapter boundary must keep execution, UI wiring, and file/bundle write flags disabled.",
    );
  }

  if (
    sampleCatalogRuntimeAdapterReadModel.safetyStatus.safeToWriteBundle ||
    sampleCatalogRuntimeAdapterReadModel.safetyStatus.safeToUseSpriteAssetsInProduction
  ) {
    addIssue(
      issues,
      "runtime-safety-flag-enabled",
      "sampleCatalogRuntimeAdapterReadModel.safetyStatus",
      "Current read model must not authorize .bl writing or production sprite usage.",
    );
  }

  if (catalogRuntimeAdapterSafetyPolicy.pokeApiRole !== "enrichment-only") {
    addIssue(
      issues,
      "runtime-safety-flag-enabled",
      "catalogRuntimeAdapterSafetyPolicy.pokeApiRole",
      "PokeAPI must remain enrichment-only.",
    );
  }

  if (catalogRuntimeAdapterSafetyPolicy.showdownAuthority !== "legality-and-simulation-source-of-truth") {
    addIssue(
      issues,
      "runtime-safety-flag-enabled",
      "catalogRuntimeAdapterSafetyPolicy.showdownAuthority",
      "Pokemon Showdown must remain the legality and simulation source of truth.",
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    checkedRules: [
      "stale cache fallback remains warning-bearing",
      "source validation errors block generated catalog handoff",
      "generated catalog errors block bundle validation",
      "rate-limited fallback does not become a successful commit path",
      "unsafe runtime flags stay false for the current boundary",
      "PokeAPI remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
    ],
  };
}

export const sampleCatalogRuntimeAdapterBoundaryValidation =
  validateCatalogRuntimeAdapterBoundaryHardening();

