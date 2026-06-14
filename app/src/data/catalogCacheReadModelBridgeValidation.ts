import {
  sampleCatalogCacheContractFixture,
  type CatalogCacheContractFixture,
} from "./catalogCacheContracts";
import { validateCatalogCacheContracts } from "./catalogCacheContractsValidation";
import {
  createCatalogCacheReadModelBridgeProps,
  sampleCatalogCacheReadModelBridgeProps,
  type CatalogCacheReadModelBridgeProps,
  type CatalogCacheReadModelBridgeRow,
} from "./catalogCacheReadModelBridge";

export type CatalogCacheReadModelBridgeValidationSeverity = "error" | "warning";

export type CatalogCacheReadModelBridgeValidationCode =
  | "authority-boundary-missing"
  | "cache-contract-invalid"
  | "cache-row-missing"
  | "blocked-cache-open"
  | "non-serializable-value"
  | "runtime-behavior-implied"
  | "safety-flag-open"
  | "stale-cache-not-warning-bearing"
  | "validation-handoff-hidden";

export interface CatalogCacheReadModelBridgeValidationIssue {
  code: CatalogCacheReadModelBridgeValidationCode;
  severity: CatalogCacheReadModelBridgeValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogCacheReadModelBridgeValidationResult {
  isValid: boolean;
  issues: CatalogCacheReadModelBridgeValidationIssue[];
  rowCount: number;
  checkedRules: string[];
}

const runtimeFragments = [
  "wire CatalogUpdatePanel",
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
  "UI-triggered execution",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogCacheReadModelBridgeValidationIssue[],
  code: CatalogCacheReadModelBridgeValidationCode,
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
  issues: CatalogCacheReadModelBridgeValidationIssue[],
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
      "Catalog cache read-model bridge props must not contain functions, symbols, bigint, Date, Promise, DOM refs, or runtime handles.",
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

  Object.entries(value).forEach(([key, entry]) => {
    isPlainSerializableValue(entry, issues, `${path}.${key}`);
  });
};

const validateSafety = (
  issues: CatalogCacheReadModelBridgeValidationIssue[],
  path: string,
  safety: CatalogCacheReadModelBridgeProps["safety"],
) => {
  if (
    safety.safeToCommitCatalog ||
    safety.safeToWriteBundle ||
    safety.safeToUseSpriteAssetsInProduction ||
    !safety.previewOnly ||
    safety.executionEnabled ||
    safety.fileIoEnabled
  ) {
    addIssue(
      issues,
      "safety-flag-open",
      path,
      "Safety flags must keep catalog commit, .bl writing, production sprite use, execution, and file IO closed.",
    );
  }
};

const validateRow = (
  issues: CatalogCacheReadModelBridgeValidationIssue[],
  row: CatalogCacheReadModelBridgeRow,
  index: number,
) => {
  const path = `rows.${index}`;

  if (row.freshnessStatus === "stale" && (row.status !== "warning" || row.warningCount < 1)) {
    addIssue(
      issues,
      "stale-cache-not-warning-bearing",
      path,
      "Stale cache rows must remain warning-bearing.",
    );
  }

  if (
    (row.freshnessStatus === "expired" || row.freshnessStatus === "invalid") &&
    (row.status !== "blocked" || row.fallbackEligible)
  ) {
    addIssue(
      issues,
      "blocked-cache-open",
      path,
      "Expired and invalid cache rows must remain blocked from fallback use.",
    );
  }

  if (
    !row.validationState.sourceValidationRequired ||
    !row.validationState.generatedCatalogValidationRequired ||
    !row.validationState.bundleHashValidationRequired ||
    !row.validationState.sourceErrorsBlockGeneratedCatalog ||
    !row.validationState.generatedCatalogErrorsBlockBundle
  ) {
    addIssue(
      issues,
      "validation-handoff-hidden",
      `${path}.validationState`,
      "Source/generated validation handoff requirements must remain visible on each row.",
    );
  }

  validateSafety(issues, `${path}.safety`, row.safety);

  row.notes.forEach((note, noteIndex) => {
    if (textImpliesRuntimeBehavior(note)) {
      addIssue(
        issues,
        "runtime-behavior-implied",
        `${path}.notes.${noteIndex}`,
        "Cache row notes must not imply runtime storage, UI wiring, cache file IO, .bl writing, or live execution.",
      );
    }
  });
};

export function validateCatalogCacheReadModelBridge(
  props: CatalogCacheReadModelBridgeProps = sampleCatalogCacheReadModelBridgeProps,
  fixture: CatalogCacheContractFixture = sampleCatalogCacheContractFixture,
): CatalogCacheReadModelBridgeValidationResult {
  const issues: CatalogCacheReadModelBridgeValidationIssue[] = [];
  const cacheContractValidation = validateCatalogCacheContracts(fixture);

  if (!cacheContractValidation.isValid) {
    addIssue(
      issues,
      "cache-contract-invalid",
      "fixture",
      "Cache contract validation must pass before bridge props are considered valid.",
    );
  }

  const expectedProps = createCatalogCacheReadModelBridgeProps(fixture);

  if (props.rowCount !== props.rows.length || props.rowCount !== fixture.entries.length) {
    addIssue(
      issues,
      "cache-row-missing",
      "rowCount",
      "Cache bridge row count must match the cache entries projected from the contract fixture.",
    );
  }

  fixture.entries.forEach((entry) => {
    if (!props.rows.some((row) => row.id === entry.id && row.logicalKey === entry.logicalKey)) {
      addIssue(
        issues,
        "cache-row-missing",
        "rows",
        `Cache bridge row for '${entry.id}' is missing.`,
      );
    }
  });

  props.rows.forEach((row, index) => validateRow(issues, row, index));
  validateSafety(issues, "safety", props.safety);

  if (props.warningCount !== props.rows.reduce((total, row) => total + row.warningCount, 0)) {
    addIssue(
      issues,
      "validation-handoff-hidden",
      "warningCount",
      "Top-level warningCount must match projected cache row warnings.",
    );
  }

  if (props.errorCount !== props.rows.reduce((total, row) => total + row.errorCount, 0)) {
    addIssue(
      issues,
      "validation-handoff-hidden",
      "errorCount",
      "Top-level errorCount must match projected cache row errors.",
    );
  }

  if (props.namespace !== expectedProps.namespace || props.version !== expectedProps.version) {
    addIssue(
      issues,
      "cache-row-missing",
      "namespace",
      "Cache bridge props must preserve the cache namespace and version from the contract fixture.",
    );
  }

  if (!notesContain(props.boundaryNotes, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Bridge boundary notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!notesContain(props.boundaryNotes, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Bridge boundary notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notesContain(props.boundaryNotes, "candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Bridge boundary notes must preserve sprite candidate/review-gated boundary.",
    );
  }

  props.boundaryNotes.forEach((note, index) => {
    if (textImpliesRuntimeBehavior(note)) {
      addIssue(
        issues,
        "runtime-behavior-implied",
        `boundaryNotes.${index}`,
        "Bridge boundary notes must not imply UI wiring, live execution, cache file IO, .bl writing, persistence, or storage behavior.",
      );
    }
  });

  isPlainSerializableValue(props, issues, "props");

  try {
    JSON.stringify(props);
  } catch (error) {
    addIssue(
      issues,
      "non-serializable-value",
      "props",
      error instanceof Error ? error.message : "Catalog cache read-model bridge props must be JSON serializable.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    rowCount: props.rows.length,
    checkedRules: [
      "cache contract validation passes before bridge props are valid",
      "source snapshot and generated catalog cache rows are projected",
      "logical cache key, entry kind, freshness, cache status, trust level, fallback eligibility, counts, handoff state, and safety are surfaced",
      "stale cache remains warning-bearing",
      "expired and invalid cache entries remain blocked",
      "source/generated validation handoff requirements remain visible",
      "safeToCommitCatalog, safeToWriteBundle, safeToUseSpriteAssetsInProduction, execution, and file IO remain closed",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "props remain serializable, data-only, React-free, UI-unwired, and do not call runCatalogLiveFetchPrototype",
    ],
  };
}

export const sampleCatalogCacheReadModelBridgeValidation =
  validateCatalogCacheReadModelBridge();
