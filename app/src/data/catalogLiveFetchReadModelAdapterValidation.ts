import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import type { CatalogGeneratorPrototypeValidationResult } from "./catalogGeneratorPrototypeValidation";
import type { CatalogLiveFetchPrototypeResult } from "./catalogLiveFetchPrototype";
import {
  collectCatalogLiveFetchReadModelIssues,
  createCatalogLiveFetchReadModel,
  getCatalogLiveFetchReadModelStatus,
} from "./catalogLiveFetchReadModelAdapter";
import type { PokeApiSourceValidationResult } from "./pokeApiSourceValidation";

export type CatalogLiveFetchReadModelAdapterValidationSeverity = "error" | "warning";

export type CatalogLiveFetchReadModelAdapterValidationCode =
  | "authority-boundary-missing"
  | "failed-result-not-safe"
  | "safety-flag-open"
  | "source-error-not-visible"
  | "source-invalid-not-blocked"
  | "success-not-complete"
  | "warning-not-visible";

export interface CatalogLiveFetchReadModelAdapterValidationIssue {
  code: CatalogLiveFetchReadModelAdapterValidationCode;
  severity: CatalogLiveFetchReadModelAdapterValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogLiveFetchReadModelAdapterValidationResult {
  isValid: boolean;
  issues: CatalogLiveFetchReadModelAdapterValidationIssue[];
  sampleCount: number;
  checkedRules: string[];
}

const fixtureTimestamp = "2026-06-14T18:30:00.000Z";
const targetSections = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
] as const;

const emptySourceValidation: PokeApiSourceValidationResult = {
  isValid: true,
  issues: [],
};

const emptyGeneratedCatalogValidation: CatalogGeneratorPrototypeValidationResult = {
  isValid: true,
  issues: [],
};

const createResult = (
  id: string,
  overrides: Partial<CatalogLiveFetchPrototypeResult> = {},
): CatalogLiveFetchPrototypeResult => ({
  status: "complete",
  coverageMode: "active-sample",
  fetchedAt: fixtureTimestamp,
  sourceVersion: `pokeapi-live-fetch-read-model-adapter-${id}`,
  targetSections: [...targetSections],
  progress: [
    {
      status: "complete",
      completedRequests: 100,
      totalRequests: 100,
      progressPercent: 100,
      message: "Fixture result for read-model adapter validation.",
    },
  ],
  snapshot: null,
  sourceValidation: emptySourceValidation,
  catalog: null,
  generatedCatalogValidation: emptyGeneratedCatalogValidation,
  issues: [],
  notes: [
    "PokeAPI live-fetch prototype is enrichment-only.",
    "Pokemon Showdown remains the legality and simulation source of truth.",
    "Sprite metadata is candidate/review-gated only.",
  ],
  ...overrides,
});

const warningIssue: CatalogSourceFetchIssue = {
  code: "candidate-source-review-required",
  severity: "warning",
  sourceId: "source-pokeapi-live-fetch-prototype",
  path: "assets.animatedSpriteKey",
  message: "Sprite metadata remains candidate/review-gated only.",
};

const failedIssue: CatalogSourceFetchIssue = {
  code: "source-unavailable",
  severity: "error",
  sourceId: "source-pokeapi-live-fetch-prototype",
  message: "PokeAPI source unavailable in fixture result.",
};

export const sampleCatalogLiveFetchReadModelSuccessResult = createResult("success");

export const sampleCatalogLiveFetchReadModelWarningResult = createResult("warning", {
  issues: [warningIssue],
});

export const sampleCatalogLiveFetchReadModelFailedResult = createResult("failed", {
  status: "failed",
  snapshot: null,
  sourceValidation: null,
  catalog: null,
  generatedCatalogValidation: null,
  issues: [failedIssue],
});

export const sampleCatalogLiveFetchReadModelSourceBlockedResult = createResult("source-blocked", {
  status: "failed",
  catalog: null,
  generatedCatalogValidation: null,
  sourceValidation: {
    isValid: false,
    issues: [
      {
        code: "missing-english-text",
        severity: "error",
        path: "moves.0.flavor_text_entries",
        message: "Move source record is missing English flavor text.",
      },
    ],
  },
});

export const sampleCatalogLiveFetchReadModels = {
  success: createCatalogLiveFetchReadModel(sampleCatalogLiveFetchReadModelSuccessResult, {
    id: "catalog-live-fetch-read-model-success",
  }),
  warning: createCatalogLiveFetchReadModel(sampleCatalogLiveFetchReadModelWarningResult, {
    id: "catalog-live-fetch-read-model-warning",
  }),
  failed: createCatalogLiveFetchReadModel(sampleCatalogLiveFetchReadModelFailedResult, {
    id: "catalog-live-fetch-read-model-failed",
  }),
  sourceBlocked: createCatalogLiveFetchReadModel(sampleCatalogLiveFetchReadModelSourceBlockedResult, {
    id: "catalog-live-fetch-read-model-source-blocked",
  }),
} as const;

const addIssue = (
  issues: CatalogLiveFetchReadModelAdapterValidationIssue[],
  code: CatalogLiveFetchReadModelAdapterValidationCode,
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

const validateClosedSafetyFlags = (
  issues: CatalogLiveFetchReadModelAdapterValidationIssue[],
  path: string,
  readModel: ReturnType<typeof createCatalogLiveFetchReadModel>,
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
      "Live-fetch read models must not authorize catalog commit, .bl writing, or production sprite asset use.",
    );
  }
};

const validateBoundaryNotes = (
  issues: CatalogLiveFetchReadModelAdapterValidationIssue[],
  path: string,
  readModel: ReturnType<typeof createCatalogLiveFetchReadModel>,
) => {
  const notes = readModel.notes.join(" ").toLowerCase();

  if (!notes.includes("enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      `${path}.notes`,
      "Read model notes must preserve PokeAPI enrichment-only boundary.",
    );
  }

  if (!notes.includes("showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      `${path}.notes`,
      "Read model notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notes.includes("candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      `${path}.notes`,
      "Read model notes must preserve sprite candidate/review-gated boundary.",
    );
  }
};

export function validateCatalogLiveFetchReadModelAdapter(): CatalogLiveFetchReadModelAdapterValidationResult {
  const issues: CatalogLiveFetchReadModelAdapterValidationIssue[] = [];
  const { success, warning, failed, sourceBlocked } = sampleCatalogLiveFetchReadModels;

  if (success.status !== "complete" || success.phase !== "complete") {
    addIssue(
      issues,
      "success-not-complete",
      "sampleCatalogLiveFetchReadModels.success",
      "Successful live-fetch results must map to complete read-model state.",
    );
  }

  if (warning.status !== "complete-with-warnings" || warning.phase !== "warning") {
    addIssue(
      issues,
      "warning-not-visible",
      "sampleCatalogLiveFetchReadModels.warning",
      "Warning-bearing live-fetch results must map to complete-with-warnings read-model state.",
    );
  }

  if (!warning.issues.some((issue) => issue.severity === "warning") || warning.progress.warningCount === 0) {
    addIssue(
      issues,
      "warning-not-visible",
      "sampleCatalogLiveFetchReadModels.warning.issues",
      "Warnings must remain visible in the read-model issues and progress counts.",
    );
  }

  if (failed.status !== "blocked" || failed.phase !== "blocked") {
    addIssue(
      issues,
      "failed-result-not-safe",
      "sampleCatalogLiveFetchReadModels.failed",
      "Failed live-fetch results without source validation must map to a blocked safe state.",
    );
  }

  if (failed.safetyStatus.failureMode !== "block-generated-catalog") {
    addIssue(
      issues,
      "failed-result-not-safe",
      "sampleCatalogLiveFetchReadModels.failed.safetyStatus.failureMode",
      "Failed live-fetch results must block generated catalog handoff.",
    );
  }

  if (sourceBlocked.status !== "blocked" || sourceBlocked.phase !== "blocked") {
    addIssue(
      issues,
      "source-invalid-not-blocked",
      "sampleCatalogLiveFetchReadModels.sourceBlocked",
      "Source-invalid live-fetch results must map to blocked read-model state.",
    );
  }

  if (
    !sourceBlocked.issues.some(
      (issue) =>
        issue.severity === "error" &&
        issue.path === "moves.0.flavor_text_entries" &&
        issue.message.includes("English flavor text"),
    )
  ) {
    addIssue(
      issues,
      "source-error-not-visible",
      "sampleCatalogLiveFetchReadModels.sourceBlocked.issues",
      "Source validation errors must remain visible in read-model issues.",
    );
  }

  if (getCatalogLiveFetchReadModelStatus(sampleCatalogLiveFetchReadModelWarningResult) !== "complete-with-warnings") {
    addIssue(
      issues,
      "warning-not-visible",
      "getCatalogLiveFetchReadModelStatus.warning",
      "Status helper must preserve warning-only live-fetch results as non-failing.",
    );
  }

  if (collectCatalogLiveFetchReadModelIssues(sampleCatalogLiveFetchReadModelSourceBlockedResult).length === 0) {
    addIssue(
      issues,
      "source-error-not-visible",
      "collectCatalogLiveFetchReadModelIssues.sourceBlocked",
      "Issue collection must include source validation errors.",
    );
  }

  Object.entries(sampleCatalogLiveFetchReadModels).forEach(([key, readModel]) => {
    validateClosedSafetyFlags(issues, `sampleCatalogLiveFetchReadModels.${key}`, readModel);
    validateBoundaryNotes(issues, `sampleCatalogLiveFetchReadModels.${key}`, readModel);
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sampleCount: Object.keys(sampleCatalogLiveFetchReadModels).length,
    checkedRules: [
      "successful live-fetch result maps to complete read-model state",
      "warning-only live-fetch result maps to complete-with-warnings and remains non-failing",
      "failed live-fetch result maps to safe blocked state",
      "source validation errors map to blocked state and remain visible",
      "safeToCommitCatalog remains false",
      "safeToWriteBundle remains false",
      "safeToUseSpriteAssetsInProduction remains false",
      "PokeAPI remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
    ],
  };
}

export const sampleCatalogLiveFetchReadModelAdapterValidation =
  validateCatalogLiveFetchReadModelAdapter();
