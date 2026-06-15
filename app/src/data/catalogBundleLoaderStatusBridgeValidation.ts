import {
  sampleCatalogBundleLoaderStatusBridge,
  type CatalogBundleLoaderStatusBridgeProps,
} from "./catalogBundleLoaderStatusBridge";
import { validateCatalogBundleLoaderFixtures } from "./catalogBundleLoaderFixtureValidation";
import { validateCatalogFoundationStatusReadModel } from "./catalogFoundationStatusReadModelValidation";

export type CatalogBundleLoaderStatusBridgeValidationSeverity = "error" | "warning";

export type CatalogBundleLoaderStatusBridgeValidationCode =
  | "authority-boundary-missing"
  | "component-validation-failed"
  | "loader-status-mismatch"
  | "non-serializable-value"
  | "runtime-behavior-implied"
  | "safety-flag-open"
  | "signature-trust-overstated";

export interface CatalogBundleLoaderStatusBridgeValidationIssue {
  code: CatalogBundleLoaderStatusBridgeValidationCode;
  severity: CatalogBundleLoaderStatusBridgeValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogBundleLoaderStatusBridgeValidationResult {
  isValid: boolean;
  issues: CatalogBundleLoaderStatusBridgeValidationIssue[];
  checkedRules: string[];
}

const runtimeFragments = [
  "wire CatalogUpdatePanel",
  "loader execution",
  "file IO",
  "file picker",
  "cache file IO",
  "storage",
  "UI execution",
  "write .bl",
  ".bl writing",
  "backend",
  "persistence",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogBundleLoaderStatusBridgeValidationIssue[],
  code: CatalogBundleLoaderStatusBridgeValidationCode,
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

const validateSerializableValue = (
  value: unknown,
  issues: CatalogBundleLoaderStatusBridgeValidationIssue[],
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
      "Catalog bundle loader status bridge must not contain functions, symbols, bigint, Date, Promise, DOM refs, or runtime handles.",
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateSerializableValue(entry, issues, `${path}.${index}`),
    );
    return;
  }

  Object.entries(value).forEach(([key, entry]) =>
    validateSerializableValue(entry, issues, `${path}.${key}`),
  );
};

export function validateCatalogBundleLoaderStatusBridge(
  bridge: CatalogBundleLoaderStatusBridgeProps = sampleCatalogBundleLoaderStatusBridge,
): CatalogBundleLoaderStatusBridgeValidationResult {
  const issues: CatalogBundleLoaderStatusBridgeValidationIssue[] = [];

  if (
    !validateCatalogBundleLoaderFixtures().isValid ||
    !validateCatalogFoundationStatusReadModel().isValid
  ) {
    addIssue(
      issues,
      "component-validation-failed",
      "components",
      "Catalog bundle loader status bridge is only valid when loader fixtures and Catalog Foundation status read-model validations pass.",
    );
  }

  if (bridge.requestBoundary !== "contract-only") {
    addIssue(
      issues,
      "loader-status-mismatch",
      "requestBoundary",
      "Loader status bridge must remain contract-only.",
    );
  }

  if (bridge.manifestPreflightStatus !== "loaded") {
    addIssue(
      issues,
      "loader-status-mismatch",
      "manifestPreflightStatus",
      "Manifest preflight success should remain visible as loaded fixture metadata.",
    );
  }

  if (
    bridge.appCompatibilityStatus !== "blocked" ||
    bridge.sectionHashValidationStatus !== "blocked" ||
    bridge.wholeBundleHashValidationStatus !== "blocked" ||
    bridge.assetPolicyStatus !== "blocked"
  ) {
    addIssue(
      issues,
      "loader-status-mismatch",
      "blockedStatuses",
      "App compatibility, invalid hash, and unsafe asset policy fixture states must remain blocked.",
    );
  }

  if (bridge.loadedInMemoryFixtureStatus !== "loaded") {
    addIssue(
      issues,
      "loader-status-mismatch",
      "loadedInMemoryFixtureStatus",
      "Loaded in-memory fixture status must remain loaded without implying active catalog replacement.",
    );
  }

  if (bridge.blockedFixtureCount < 3 || bridge.errorCount < 3) {
    addIssue(
      issues,
      "loader-status-mismatch",
      "blockedFixtureCount",
      "Bridge must surface blocked fixture count and error totals for blocked loader examples.",
    );
  }

  if (
    bridge.signatureStatus !== "unsigned" ||
    bridge.signatureVerified ||
    !bridge.unsignedSignaturePreviewMetadata
  ) {
    addIssue(
      issues,
      "signature-trust-overstated",
      "signatureStatus",
      "Unsigned signature metadata must remain preview-only and must not be represented as verified trust.",
    );
  }

  if (
    bridge.safety.safeToReplaceActiveCatalog ||
    bridge.safety.safeToCommitCatalog ||
    bridge.safety.safeToWriteBundle ||
    bridge.safety.safeToUseSpriteAssetsInProduction ||
    bridge.safety.loaderExecutionEnabled ||
    bridge.safety.fileIoEnabled ||
    bridge.safety.filePickerEnabled ||
    bridge.safety.cacheFileIoEnabled ||
    bridge.safety.storageEnabled ||
    bridge.safety.uiExecutionEnabled ||
    !bridge.safety.previewOnly
  ) {
    addIssue(
      issues,
      "safety-flag-open",
      "safety",
      "Bridge safety flags must keep active catalog replacement, commit, .bl writing, production sprite use, loader execution, file IO, file picker, cache IO, storage, and UI execution closed.",
    );
  }

  if (!notesContain(bridge.boundaryNotes, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!notesContain(bridge.boundaryNotes, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notesContain(bridge.boundaryNotes, "candidate-review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Boundary notes must preserve sprite candidate-review-gated boundary.",
    );
  }

  bridge.boundaryNotes.forEach((note, index) => {
    if (textImpliesRuntimeBehavior(note)) {
      addIssue(
        issues,
        "runtime-behavior-implied",
        `boundaryNotes.${index}`,
        "Boundary notes must not imply loader execution, file IO, file picker behavior, cache file IO, storage, UI execution, .bl writing, backend, persistence, production sprite rendering, or simulation work.",
      );
    }
  });

  validateSerializableValue(bridge, issues, "bridge");

  try {
    JSON.stringify(bridge);
  } catch (error) {
    addIssue(
      issues,
      "non-serializable-value",
      "bridge",
      error instanceof Error
        ? error.message
        : "Catalog bundle loader status bridge must be JSON serializable.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    checkedRules: [
      "loader fixture validation passes",
      "Catalog Foundation status read-model validation passes",
      "request boundary remains contract-only",
      "manifest preflight status remains visible",
      "app compatibility blocked fixture remains blocked",
      "section and whole-bundle hash blocked fixtures remain blocked",
      "unsigned signature remains preview metadata only",
      "unsafe asset policy remains blocked",
      "loaded in-memory fixture status remains visible without active catalog replacement",
      "warning and error totals remain visible",
      "safety flags remain closed",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "bridge remains serializable, React-free, in-memory, data-only, and UI-unwired",
    ],
  };
}

export const sampleCatalogBundleLoaderStatusBridgeValidation =
  validateCatalogBundleLoaderStatusBridge();
