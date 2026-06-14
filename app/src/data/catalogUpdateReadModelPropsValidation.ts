import {
  sampleCatalogUpdateReadModelProps,
  type CatalogUpdateReadModelProps,
  type CatalogUpdateReadModelSectionKey,
} from "./catalogUpdateReadModelProps";

export type CatalogUpdateReadModelPropsValidationSeverity = "error" | "warning";

export type CatalogUpdateReadModelPropsValidationCode =
  | "authority-boundary-missing"
  | "expected-section-missing"
  | "non-serializable-value"
  | "runtime-behavior-implied"
  | "safety-flag-open"
  | "section-count-mismatch"
  | "warning-error-count-mismatch";

export interface CatalogUpdateReadModelPropsValidationIssue {
  code: CatalogUpdateReadModelPropsValidationCode;
  severity: CatalogUpdateReadModelPropsValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogUpdateReadModelPropsValidationResult {
  isValid: boolean;
  issues: CatalogUpdateReadModelPropsValidationIssue[];
  sectionCount: number;
  checkedRules: string[];
}

const expectedSections: CatalogUpdateReadModelSectionKey[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const forbiddenRuntimeFragments = [
  "wire CatalogUpdatePanel",
  "trigger UI execution",
  "call runCatalogLiveFetchPrototype",
  "write .bl",
  "loader behavior",
  "cache file IO",
  "durable persistence",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogUpdateReadModelPropsValidationIssue[],
  code: CatalogUpdateReadModelPropsValidationCode,
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

const notesContain = (props: CatalogUpdateReadModelProps, fragment: string) =>
  props.boundaryNotes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

const impliesRuntimeBehavior = (notes: readonly string[]) =>
  notes.some((note) =>
    forbiddenRuntimeFragments.some((fragment) => {
      const normalizedNote = note.toLowerCase();
      const normalizedFragment = fragment.toLowerCase();

      return (
        normalizedNote.includes(normalizedFragment) &&
        !normalizedNote.includes("does not") &&
        !normalizedNote.includes("do not") &&
        !normalizedNote.includes("no ") &&
        !normalizedNote.includes("without")
      );
    }),
  );

const isPlainSerializableValue = (
  value: unknown,
  issues: CatalogUpdateReadModelPropsValidationIssue[],
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
      "Catalog Update read-model props must not contain functions, symbols, bigint, Date, Promise, DOM refs, or runtime handles.",
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => isPlainSerializableValue(entry, issues, `${path}.${index}`));
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    isPlainSerializableValue(entry, issues, `${path}.${key}`);
  });
};

export function validateCatalogUpdateReadModelProps(
  props: CatalogUpdateReadModelProps = sampleCatalogUpdateReadModelProps,
): CatalogUpdateReadModelPropsValidationResult {
  const issues: CatalogUpdateReadModelPropsValidationIssue[] = [];
  const sectionKeys = props.sections.map((section) => section.section);

  expectedSections.forEach((section) => {
    if (!sectionKeys.includes(section)) {
      addIssue(
        issues,
        "expected-section-missing",
        "sections",
        `Catalog Update read-model props are missing ${section} section.`,
      );
    }
  });

  props.sections.forEach((section, index) => {
    if (section.expectedCount !== section.matchedKeyCount + section.missingKeyCount) {
      addIssue(
        issues,
        "section-count-mismatch",
        `sections.${index}.expectedCount`,
        `${section.section} expectedCount must equal matched plus missing key counts.`,
      );
    }

    if (section.actualCount !== section.matchedKeyCount + section.addedKeyCount) {
      addIssue(
        issues,
        "section-count-mismatch",
        `sections.${index}.actualCount`,
        `${section.section} actualCount must equal matched plus added key counts.`,
      );
    }

    if (section.countDelta !== section.actualCount - section.expectedCount) {
      addIssue(
        issues,
        "section-count-mismatch",
        `sections.${index}.countDelta`,
        `${section.section} countDelta must equal actual minus expected count.`,
      );
    }

    if (section.progressPercent < 0 || section.progressPercent > 100) {
      addIssue(
        issues,
        "section-count-mismatch",
        `sections.${index}.progressPercent`,
        `${section.section} progressPercent must stay within 0-100.`,
      );
    }
  });

  const sectionWarningCount = props.sections.reduce((total, section) => total + section.warningCount, 0);
  const sectionErrorCount = props.sections.reduce((total, section) => total + section.errorCount, 0);

  if (props.warningCount < sectionWarningCount) {
    addIssue(
      issues,
      "warning-error-count-mismatch",
      "warningCount",
      "Top-level warningCount must include section warnings.",
    );
  }

  if (props.errorCount < sectionErrorCount) {
    addIssue(
      issues,
      "warning-error-count-mismatch",
      "errorCount",
      "Top-level errorCount must include section errors.",
    );
  }

  if (
    props.safety.safeToCommitCatalog ||
    props.safety.safeToWriteBundle ||
    props.safety.safeToUseSpriteAssetsInProduction ||
    !props.safety.previewOnly ||
    props.safety.executionEnabled ||
    props.safety.fileIoEnabled
  ) {
    addIssue(
      issues,
      "safety-flag-open",
      "safety",
      "Catalog Update read-model props must remain preview-only with commit, .bl writing, production sprite use, execution, and file IO disabled.",
    );
  }

  if (!notesContain(props, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Props boundary notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!notesContain(props, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Props boundary notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notesContain(props, "candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "boundaryNotes",
      "Props boundary notes must preserve sprite candidate/review-gated boundary.",
    );
  }

  if (impliesRuntimeBehavior(props.boundaryNotes)) {
    addIssue(
      issues,
      "runtime-behavior-implied",
      "boundaryNotes",
      "Props boundary notes must not imply UI wiring, live execution, loader behavior, file IO, .bl writing, persistence, production sprite rendering, or simulation work.",
    );
  }

  isPlainSerializableValue(props, issues, "props");

  try {
    JSON.stringify(props);
  } catch (error) {
    addIssue(
      issues,
      "non-serializable-value",
      "props",
      error instanceof Error ? error.message : "Catalog Update read-model props must be JSON serializable.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sectionCount: props.sections.length,
    checkedRules: [
      "all expected sections are represented",
      "props are JSON serializable and UI-safe",
      "props do not contain functions, Date, Promise, DOM refs, or runtime handles",
      "section counts match matched/missing/added key counts",
      "top-level warning and error counts include section counts",
      "safety flags remain closed",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
      "props do not imply UI wiring, execution, loader behavior, file IO, .bl writing, persistence, production sprite rendering, or simulation work",
    ],
  };
}

export const sampleCatalogUpdateReadModelPropsValidation =
  validateCatalogUpdateReadModelProps();
