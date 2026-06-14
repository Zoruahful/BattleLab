import type { CatalogRuntimeAdapterReadModel } from "./catalogRuntimeAdapterBoundary";
import {
  sampleCatalogRuntimeOrchestratorPreview,
  sampleCatalogRuntimeOrchestratorPreviewStates,
  type CatalogRuntimeOrchestratorPreviewStateKey,
} from "./catalogRuntimeOrchestratorPreview";

export type CatalogRuntimeOrchestratorPreviewValidationSeverity = "error" | "warning";

export type CatalogRuntimeOrchestratorPreviewValidationCode =
  | "authority-boundary-missing"
  | "expected-state-missing"
  | "failure-path-unsafe"
  | "read-model-status-mismatch"
  | "runtime-behavior-implied"
  | "safety-flag-open"
  | "warning-path-not-visible";

export interface CatalogRuntimeOrchestratorPreviewValidationIssue {
  code: CatalogRuntimeOrchestratorPreviewValidationCode;
  severity: CatalogRuntimeOrchestratorPreviewValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogRuntimeOrchestratorPreviewValidationResult {
  isValid: boolean;
  issues: CatalogRuntimeOrchestratorPreviewValidationIssue[];
  stateCount: number;
  checkedRules: string[];
}

const expectedStates: Record<CatalogRuntimeOrchestratorPreviewStateKey, CatalogRuntimeAdapterReadModel["status"]> = {
  planned: "planned",
  fetching: "fetching",
  validatingSource: "validating-source",
  complete: "complete",
  completeWithWarnings: "complete-with-warnings",
  blocked: "blocked",
  failed: "failed",
  cancelled: "cancelled",
};

const forbiddenRuntimeFragments = [
  "wire CatalogUpdatePanel",
  "trigger UI execution",
  "write .bl",
  "cache file IO",
  "durable persistence",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogRuntimeOrchestratorPreviewValidationIssue[],
  code: CatalogRuntimeOrchestratorPreviewValidationCode,
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

const includesBoundary = (notes: readonly string[], fragment: string) =>
  notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

const impliesRuntimeBehavior = (notes: readonly string[]) =>
  notes.some((note) =>
    forbiddenRuntimeFragments.some((fragment) => {
      const normalizedNote = note.toLowerCase();
      const normalizedFragment = fragment.toLowerCase();

      return (
        normalizedNote.includes(normalizedFragment) &&
        !normalizedNote.includes("does not") &&
        !normalizedNote.includes("no ") &&
        !normalizedNote.includes("without")
      );
    }),
  );

const validateClosedSafetyFlags = (
  issues: CatalogRuntimeOrchestratorPreviewValidationIssue[],
  path: string,
  readModel: CatalogRuntimeAdapterReadModel,
) => {
  if (
    readModel.safetyStatus.safeToCommitCatalog ||
    readModel.safetyStatus.safeToWriteBundle ||
    readModel.safetyStatus.safeToUseSpriteAssetsInProduction
  ) {
    addIssue(
      issues,
      "safety-flag-open",
      `${path}.safetyStatus`,
      "Orchestrator preview read models must not authorize catalog commit, .bl writing, or production sprite use.",
    );
  }
};

export function validateCatalogRuntimeOrchestratorPreview(): CatalogRuntimeOrchestratorPreviewValidationResult {
  const issues: CatalogRuntimeOrchestratorPreviewValidationIssue[] = [];
  const statesByKey = new Map(sampleCatalogRuntimeOrchestratorPreviewStates.map((state) => [state.key, state]));

  Object.entries(expectedStates).forEach(([key, expectedStatus]) => {
    const state = statesByKey.get(key as CatalogRuntimeOrchestratorPreviewStateKey);

    if (!state) {
      addIssue(
        issues,
        "expected-state-missing",
        `states.${key}`,
        `Catalog runtime orchestrator preview is missing '${key}' state.`,
      );
      return;
    }

    if (state.readModel.status !== expectedStatus) {
      addIssue(
        issues,
        "read-model-status-mismatch",
        `states.${key}.readModel.status`,
        `Expected '${key}' read model status '${expectedStatus}', found '${state.readModel.status}'.`,
      );
    }

    validateClosedSafetyFlags(issues, `states.${key}.readModel`, state.readModel);

    if (impliesRuntimeBehavior([...state.notes, ...state.readModel.notes])) {
      addIssue(
        issues,
        "runtime-behavior-implied",
        `states.${key}.notes`,
        "Orchestrator preview notes must not imply UI wiring, runtime execution, cache file IO, .bl writing, persistence, or simulation work.",
      );
    }
  });

  const warningState = statesByKey.get("completeWithWarnings");

  if (
    !warningState ||
    warningState.readModel.progress.warningCount === 0 ||
    !warningState.readModel.issues.some((issue) => issue.severity === "warning")
  ) {
    addIssue(
      issues,
      "warning-path-not-visible",
      "states.completeWithWarnings.readModel",
      "Complete-with-warnings state must preserve visible warning issues.",
    );
  }

  const blockedState = statesByKey.get("blocked");

  if (
    !blockedState ||
    blockedState.readModel.safetyStatus.failureMode !== "block-generated-catalog" ||
    blockedState.readModel.progress.errorCount === 0
  ) {
    addIssue(
      issues,
      "failure-path-unsafe",
      "states.blocked.readModel",
      "Blocked state must preserve source errors and block generated catalog handoff.",
    );
  }

  const failedState = statesByKey.get("failed");

  if (
    !failedState ||
    failedState.readModel.safetyStatus.failureMode !== "block-generated-catalog" ||
    failedState.readModel.progress.errorCount === 0
  ) {
    addIssue(
      issues,
      "failure-path-unsafe",
      "states.failed.readModel",
      "Failed state must preserve errors and keep catalog commit disabled.",
    );
  }

  if (!includesBoundary(sampleCatalogRuntimeOrchestratorPreview.notes, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "sampleCatalogRuntimeOrchestratorPreview.notes",
      "Preview notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!includesBoundary(sampleCatalogRuntimeOrchestratorPreview.notes, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "sampleCatalogRuntimeOrchestratorPreview.notes",
      "Preview notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!includesBoundary(sampleCatalogRuntimeOrchestratorPreview.notes, "candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "sampleCatalogRuntimeOrchestratorPreview.notes",
      "Preview notes must preserve sprite candidate/review-gated boundary.",
    );
  }

  if (impliesRuntimeBehavior(sampleCatalogRuntimeOrchestratorPreview.notes)) {
    addIssue(
      issues,
      "runtime-behavior-implied",
      "sampleCatalogRuntimeOrchestratorPreview.notes",
      "Preview notes must not imply UI wiring, runtime execution, cache file IO, .bl writing, persistence, or simulation work.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    stateCount: sampleCatalogRuntimeOrchestratorPreviewStates.length,
    checkedRules: [
      "all expected orchestrator preview states are present",
      "preview read-model statuses match expected state keys",
      "warning paths remain warning-bearing and non-failing",
      "blocked paths preserve source errors and block generated catalog handoff",
      "failed paths preserve errors and keep commit disabled",
      "safeToCommitCatalog remains false",
      "safeToWriteBundle remains false",
      "safeToUseSpriteAssetsInProduction remains false",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "preview does not imply UI wiring, runtime execution, file IO, .bl writing, persistence, or simulation work",
    ],
  };
}

export const sampleCatalogRuntimeOrchestratorPreviewValidation =
  validateCatalogRuntimeOrchestratorPreview();
