import type {
  CatalogFetchExecutionCacheHandoff,
  CatalogFetchExecutionValidationHandoff,
} from "../types/catalogFetchExecution";
import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import { approvedCatalogLiveFetchSampleManifest } from "./catalogSourceManifest";
import {
  sampleCatalogLiveFetchCacheHandoffScenarios,
  sampleCatalogLiveFetchOfflineCacheHandoff,
  sampleCatalogLiveFetchOfflineValidationHandoff,
  sampleCatalogLiveFetchRateLimitedCacheHandoff,
  sampleCatalogLiveFetchSourceValidationBlockedHandoff,
  sampleCatalogLiveFetchSuccessCacheHandoff,
  sampleCatalogLiveFetchSuccessValidationHandoff,
} from "./catalogLiveFetchCacheFixtures";

export type CatalogLiveFetchCacheFixtureValidationSeverity = "error" | "warning";

export type CatalogLiveFetchCacheFixtureValidationCode =
  | "authority-boundary-mismatch"
  | "cache-status-mismatch"
  | "commit-path-open"
  | "fixture-scenario-missing"
  | "runtime-behavior-implied"
  | "source-block-not-enforced"
  | "source-role-mismatch"
  | "sprite-policy-mismatch"
  | "warning-missing";

export interface CatalogLiveFetchCacheFixtureValidationIssue {
  code: CatalogLiveFetchCacheFixtureValidationCode;
  severity: CatalogLiveFetchCacheFixtureValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogLiveFetchCacheFixtureValidationResult {
  isValid: boolean;
  issues: CatalogLiveFetchCacheFixtureValidationIssue[];
  scenarioCount: number;
  checkedRules: string[];
}

const expectedScenarioIds = [
  "successful-live-fetch-handoff",
  "offline-fallback-to-cached-snapshot",
  "rate-limited-source-fallback",
  "source-validation-blocks-generated-catalog",
] as const;

const runtimeBehaviorFragments = [
  "write .bl",
  "cache file IO",
  "persistence implementation",
  "runtime execution",
  "UI wiring",
];

const addIssue = (
  issues: CatalogLiveFetchCacheFixtureValidationIssue[],
  code: CatalogLiveFetchCacheFixtureValidationCode,
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

const hasWarning = (issues: readonly CatalogSourceFetchIssue[], code: CatalogSourceFetchIssue["code"]) =>
  issues.some((issue) => issue.severity === "warning" && issue.code === code);

const hasValidationWarning = (
  handoff: CatalogFetchExecutionValidationHandoff,
  fragment: string,
) =>
  handoff.validationResult?.warnings.some((warning) =>
    warning.message.toLowerCase().includes(fragment.toLowerCase()),
  ) ?? false;

const notesImplyRuntimeBehavior = (notes: readonly string[]) =>
  notes.some((note) =>
    runtimeBehaviorFragments.some((fragment) => {
      const normalizedNote = note.toLowerCase();
      const normalizedFragment = fragment.toLowerCase();

      return (
        normalizedNote.includes(normalizedFragment) &&
        !normalizedNote.includes("does not") &&
        !normalizedNote.includes("no ") &&
        !normalizedNote.includes("not imply")
      );
    }),
  );

const validateNoRuntimeBehavior = (
  issues: CatalogLiveFetchCacheFixtureValidationIssue[],
  path: string,
  notes: readonly string[],
) => {
  if (notesImplyRuntimeBehavior(notes)) {
    addIssue(
      issues,
      "runtime-behavior-implied",
      path,
      "Cache/offline fixture notes must not imply UI wiring, cache file IO, persistence, runtime execution, or .bl writing.",
    );
  }
};

const validateCacheHandoffSnapshot = (
  issues: CatalogLiveFetchCacheFixtureValidationIssue[],
  path: string,
  handoff: CatalogFetchExecutionCacheHandoff,
  expectedStatus: CatalogFetchExecutionCacheHandoff["status"],
  expectedCacheStatus: NonNullable<CatalogFetchExecutionCacheHandoff["sourceSnapshot"]>["metadata"]["cacheStatus"],
) => {
  if (handoff.status !== expectedStatus) {
    addIssue(
      issues,
      "cache-status-mismatch",
      `${path}.status`,
      `Expected cache handoff status '${expectedStatus}', but found '${handoff.status}'.`,
    );
  }

  if (handoff.sourceSnapshot?.metadata.cacheStatus !== expectedCacheStatus) {
    addIssue(
      issues,
      "cache-status-mismatch",
      `${path}.sourceSnapshot.metadata.cacheStatus`,
      `Expected source snapshot cache status '${expectedCacheStatus}'.`,
    );
  }

  validateNoRuntimeBehavior(issues, `${path}.notes`, handoff.notes);
};

export function validateCatalogLiveFetchCacheFixtures(): CatalogLiveFetchCacheFixtureValidationResult {
  const issues: CatalogLiveFetchCacheFixtureValidationIssue[] = [];
  const scenarioIds = sampleCatalogLiveFetchCacheHandoffScenarios.map((scenario) => scenario.id);

  expectedScenarioIds.forEach((id) => {
    if (!scenarioIds.includes(id)) {
      addIssue(
        issues,
        "fixture-scenario-missing",
        "sampleCatalogLiveFetchCacheHandoffScenarios",
        `Expected cache handoff scenario '${id}' is missing.`,
      );
    }
  });

  if (approvedCatalogLiveFetchSampleManifest.sourceRole !== "enrichment") {
    addIssue(
      issues,
      "source-role-mismatch",
      "approvedCatalogLiveFetchSampleManifest.sourceRole",
      "PokeAPI catalog data must remain enrichment-only.",
    );
  }

  if (
    approvedCatalogLiveFetchSampleManifest.legalityAuthority !== "pokemon-showdown" ||
    approvedCatalogLiveFetchSampleManifest.simulationAuthority !== "pokemon-showdown"
  ) {
    addIssue(
      issues,
      "authority-boundary-mismatch",
      "approvedCatalogLiveFetchSampleManifest",
      "Pokemon Showdown must remain the legality and simulation source of truth.",
    );
  }

  if (approvedCatalogLiveFetchSampleManifest.spriteMetadataPolicy !== "candidate-review-gated") {
    addIssue(
      issues,
      "sprite-policy-mismatch",
      "approvedCatalogLiveFetchSampleManifest.spriteMetadataPolicy",
      "Sprite metadata must remain candidate-review-gated.",
    );
  }

  validateCacheHandoffSnapshot(
    issues,
    "sampleCatalogLiveFetchSuccessCacheHandoff",
    sampleCatalogLiveFetchSuccessCacheHandoff,
    "fetched",
    "hit-fresh",
  );

  if (sampleCatalogLiveFetchSuccessValidationHandoff.validationResult?.isValid !== true) {
    addIssue(
      issues,
      "source-block-not-enforced",
      "sampleCatalogLiveFetchSuccessValidationHandoff.validationResult.isValid",
      "Successful live-fetch validation handoff must remain valid.",
    );
  }

  validateCacheHandoffSnapshot(
    issues,
    "sampleCatalogLiveFetchOfflineCacheHandoff",
    sampleCatalogLiveFetchOfflineCacheHandoff,
    "using-cache",
    "hit-stale",
  );

  const offlineScenario = sampleCatalogLiveFetchCacheHandoffScenarios.find(
    (scenario) => scenario.id === "offline-fallback-to-cached-snapshot",
  );

  if (!offlineScenario || !hasWarning(offlineScenario.issues, "cache-stale")) {
    addIssue(
      issues,
      "warning-missing",
      "sampleCatalogLiveFetchCacheHandoffScenarios.offline-fallback-to-cached-snapshot.issues",
      "Offline fallback scenario must remain warning-bearing with a stale cache warning.",
    );
  }

  if (!hasValidationWarning(sampleCatalogLiveFetchOfflineValidationHandoff, "stale")) {
    addIssue(
      issues,
      "warning-missing",
      "sampleCatalogLiveFetchOfflineValidationHandoff.validationResult.warnings",
      "Offline validation handoff must preserve a stale-cache warning.",
    );
  }

  validateCacheHandoffSnapshot(
    issues,
    "sampleCatalogLiveFetchRateLimitedCacheHandoff",
    sampleCatalogLiveFetchRateLimitedCacheHandoff,
    "rate-limited",
    "hit-stale",
  );

  const rateLimitedScenario = sampleCatalogLiveFetchCacheHandoffScenarios.find(
    (scenario) => scenario.id === "rate-limited-source-fallback",
  );

  if (
    !rateLimitedScenario ||
    !hasWarning(rateLimitedScenario.issues, "rate-limited") ||
    !hasWarning(rateLimitedScenario.issues, "cache-stale")
  ) {
    addIssue(
      issues,
      "warning-missing",
      "sampleCatalogLiveFetchCacheHandoffScenarios.rate-limited-source-fallback.issues",
      "Rate-limited fallback scenario must preserve rate-limit and stale-cache warnings.",
    );
  }

  if (sampleCatalogLiveFetchRateLimitedCacheHandoff.status === "fetched") {
    addIssue(
      issues,
      "commit-path-open",
      "sampleCatalogLiveFetchRateLimitedCacheHandoff.status",
      "Rate-limited fallback must not be represented as a successful fetched commit path.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.validationResult?.isValid !== false) {
    addIssue(
      issues,
      "source-block-not-enforced",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.validationResult.isValid",
      "Source validation blocked handoff must remain invalid.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.normalizationHandoff) {
    addIssue(
      issues,
      "source-block-not-enforced",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.normalizationHandoff",
      "Source validation failures must block normalization handoff.",
    );
  }

  if (sampleCatalogLiveFetchSourceValidationBlockedHandoff.generationRequest) {
    addIssue(
      issues,
      "source-block-not-enforced",
      "sampleCatalogLiveFetchSourceValidationBlockedHandoff.generationRequest",
      "Source validation failures must block generated catalog requests.",
    );
  }

  validateNoRuntimeBehavior(
    issues,
    "sampleCatalogLiveFetchSourceValidationBlockedHandoff.notes",
    sampleCatalogLiveFetchSourceValidationBlockedHandoff.notes,
  );

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    scenarioCount: sampleCatalogLiveFetchCacheHandoffScenarios.length,
    checkedRules: [
      "all cache/offline handoff scenarios are present",
      "successful handoff uses fresh fetched source metadata",
      "offline fallback uses stale cache metadata with warnings",
      "rate-limited fallback remains warning-bearing and non-commit-ready",
      "source validation failures block normalization and generated catalog handoff",
      "PokeAPI remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "fixtures do not imply UI wiring, cache file IO, persistence, runtime execution, or .bl writing",
    ],
  };
}

export const sampleCatalogLiveFetchCacheFixtureValidation =
  validateCatalogLiveFetchCacheFixtures();
