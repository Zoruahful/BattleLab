import { sampleCatalogCacheReadModelBridgeProps } from "./catalogCacheReadModelBridge";
import { validateCatalogCacheReadModelBridge } from "./catalogCacheReadModelBridgeValidation";
import {
  sampleCatalogFoundationStatusReadModel,
  type CatalogFoundationStatusReadModel,
} from "./catalogFoundationStatusReadModel";
import { validateCatalogGeneratedSnapshotComparison } from "./catalogGeneratedSnapshotComparisonValidation";
import { validateCatalogRuntimeOrchestratorPreview } from "./catalogRuntimeOrchestratorPreviewValidation";
import { validateCatalogUpdateReadModelProps } from "./catalogUpdateReadModelPropsValidation";

export type CatalogFoundationStatusReadModelValidationSeverity = "error" | "warning";

export type CatalogFoundationStatusReadModelValidationCode =
  | "authority-boundary-missing"
  | "component-validation-failed"
  | "non-serializable-value"
  | "runtime-behavior-implied"
  | "safety-flag-open"
  | "section-summary-mismatch"
  | "validation-handoff-hidden";

export interface CatalogFoundationStatusReadModelValidationIssue {
  code: CatalogFoundationStatusReadModelValidationCode;
  severity: CatalogFoundationStatusReadModelValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogFoundationStatusReadModelValidationResult {
  isValid: boolean;
  issues: CatalogFoundationStatusReadModelValidationIssue[];
  sectionCount: number;
  checkedRules: string[];
}

const expectedSections = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
] as const;

const runtimeFragments = [
  "wire CatalogUpdatePanel",
  "trigger UI execution",
  "call runCatalogLiveFetchPrototype",
  "write .bl",
  "loader behavior",
  "cache file IO",
  "localStorage",
  "IndexedDB",
  "SQLite",
  "Electron",
  "filesystem path",
  "backend storage",
  "durable persistence",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogFoundationStatusReadModelValidationIssue[],
  code: CatalogFoundationStatusReadModelValidationCode,
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

const textImpliesRuntimeBehavior = (text: string) => {
  const normalized = text.toLowerCase();

  return runtimeFragments.some((fragment) => {
    const normalizedFragment = fragment.toLowerCase();

    return (
      normalized.includes(normalizedFragment) &&
      !normalized.includes("do not") &&
      !normalized.includes("does not") &&
      !normalized.includes("no ") &&
      !normalized.includes("without") &&
      !normalized.includes("not implement")
    );
  });
};

const notesContain = (notes: readonly string[], fragment: string) =>
  notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

const isPlainSerializableValue = (
  value: unknown,
  issues: CatalogFoundationStatusReadModelValidationIssue[],
  path: string,
) => {
  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint" ||
    value instanceof Date ||
    value instanceof Promise
  ) {
    addIssue(
      issues,
      "non-serializable-value",
      path,
      "Catalog Foundation status read-model must not contain functions, symbols, bigint, Date, Promise, DOM refs, or runtime handles.",
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      isPlainSerializableValue(entry, issues, `${path}.${index}`),
    );
    return;
  }

  Object.entries(value).forEach(([key, entry]) =>
    isPlainSerializableValue(entry, issues, `${path}.${key}`),
  );
};

export function validateCatalogFoundationStatusReadModel(
  model: CatalogFoundationStatusReadModel = sampleCatalogFoundationStatusReadModel,
): CatalogFoundationStatusReadModelValidationResult {
  const issues: CatalogFoundationStatusReadModelValidationIssue[] = [];
  const componentValidations = [
    validateCatalogUpdateReadModelProps(),
    validateCatalogCacheReadModelBridge(),
    validateCatalogGeneratedSnapshotComparison(),
    validateCatalogRuntimeOrchestratorPreview(),
  ];

  if (componentValidations.some((validation) => !validation.isValid)) {
    addIssue(
      issues,
      "component-validation-failed",
      "components",
      "Catalog Foundation status read-model is only valid when runtime, comparison, cache bridge, and update read-model validations pass.",
    );
  }

  expectedSections.forEach((section) => {
    if (!model.sections.some((summary) => summary.section === section)) {
      addIssue(
        issues,
        "section-summary-mismatch",
        "sections",
        `Catalog Foundation status read-model is missing ${section} section summary.`,
      );
    }
  });

  if (model.comparison.sectionCount !== model.sections.length) {
    addIssue(
      issues,
      "section-summary-mismatch",
      "comparison.sectionCount",
      "Comparison section count must match aggregate section summaries.",
    );
  }

  const expectedTotalCount = model.sections.reduce((total, section) => total + section.expectedCount, 0);
  const actualTotalCount = model.sections.reduce((total, section) => total + section.actualCount, 0);
  const countDeltaTotal = model.sections.reduce((total, section) => total + section.countDelta, 0);

  if (
    model.comparison.expectedTotalCount !== expectedTotalCount ||
    model.comparison.actualTotalCount !== actualTotalCount ||
    model.comparison.countDeltaTotal !== countDeltaTotal
  ) {
    addIssue(
      issues,
      "section-summary-mismatch",
      "comparison",
      "Comparison totals must match per-section progress/count summaries.",
    );
  }

  if (
    model.cache.rowCount !== sampleCatalogCacheReadModelBridgeProps.rowCount ||
    model.cache.warningTotal !== sampleCatalogCacheReadModelBridgeProps.warningCount ||
    model.cache.errorTotal !== sampleCatalogCacheReadModelBridgeProps.errorCount
  ) {
    addIssue(
      issues,
      "section-summary-mismatch",
      "cache",
      "Cache summary must match cache read-model bridge props.",
    );
  }

  if (!model.validationHandoffVisible || !model.cache.validationHandoffVisible) {
    addIssue(
      issues,
      "validation-handoff-hidden",
      "validationHandoffVisible",
      "Validation handoff visibility must remain true in the aggregate read-model.",
    );
  }

  if (
    model.safety.safeToCommitCatalog ||
    model.safety.safeToWriteBundle ||
    model.safety.safeToUseSpriteAssetsInProduction ||
    !model.safety.previewOnly ||
    model.safety.executionEnabled ||
    model.safety.fileIoEnabled
  ) {
    addIssue(
      issues,
      "safety-flag-open",
      "safety",
      "Safety flags must keep catalog commit, .bl writing, production sprite use, execution, and file IO closed.",
    );
  }

  if (!notesContain(model.boundaryNotes, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!notesContain(model.boundaryNotes, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notesContain(model.boundaryNotes, "candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve sprite candidate/review-gated boundary.",
    );
  }

  model.boundaryNotes.forEach((note, index) => {
    if (textImpliesRuntimeBehavior(note)) {
      addIssue(
        issues,
        "runtime-behavior-implied",
        `boundaryNotes.${index}`,
        "Boundary notes must not imply UI wiring, live execution, cache file IO, .bl writing, persistence, storage behavior, production sprite rendering, or simulation work.",
      );
    }
  });

  isPlainSerializableValue(model, issues, "model");

  try {
    JSON.stringify(model);
  } catch (error) {
    addIssue(
      issues,
      "non-serializable-value",
      "model",
      error instanceof Error ? error.message : "Catalog Foundation status read-model must be JSON serializable.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sectionCount: model.sections.length,
    checkedRules: [
      "runtime preview, generated comparison, cache bridge, and update read-model validations pass",
      "top-level phase/status/message are present",
      "runtime/orchestrator preview summary is represented",
      "generated catalog comparison summary is represented",
      "cache-status summary is represented",
      "per-section progress/count summaries cover all catalog sections",
      "warning and error totals remain visible",
      "validation handoff visibility remains true",
      "safeToCommitCatalog, safeToWriteBundle, safeToUseSpriteAssetsInProduction, execution, and file IO remain closed",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "aggregate remains serializable, React-free, data-only, UI-unwired, and does not call runCatalogLiveFetchPrototype",
    ],
  };
}

export const sampleCatalogFoundationStatusReadModelValidation =
  validateCatalogFoundationStatusReadModel();
