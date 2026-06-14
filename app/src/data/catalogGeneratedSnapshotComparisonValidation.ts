import {
  sampleCatalogGeneratedSnapshotComparison,
  type CatalogGeneratedSnapshotComparison,
  type CatalogGeneratedSnapshotComparisonSectionName,
} from "./catalogGeneratedSnapshotComparison";

export type CatalogGeneratedSnapshotComparisonValidationSeverity = "error" | "warning";

export type CatalogGeneratedSnapshotComparisonValidationCode =
  | "asset-review-not-gated"
  | "authority-boundary-missing"
  | "comparison-count-mismatch"
  | "expected-section-missing"
  | "runtime-behavior-implied"
  | "source-alignment-missing"
  | "user-data-section-present";

export interface CatalogGeneratedSnapshotComparisonValidationIssue {
  code: CatalogGeneratedSnapshotComparisonValidationCode;
  severity: CatalogGeneratedSnapshotComparisonValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogGeneratedSnapshotComparisonValidationResult {
  isValid: boolean;
  issues: CatalogGeneratedSnapshotComparisonValidationIssue[];
  sectionCount: number;
  checkedRules: string[];
}

const expectedSections: CatalogGeneratedSnapshotComparisonSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const forbiddenSectionNames = [
  "teams",
  "settings",
  "reports",
  "runtimeOutput",
  "saves",
];

const forbiddenRuntimeFragments = [
  "wire CatalogUpdatePanel",
  "trigger UI execution",
  "write .bl",
  "cache file IO",
  "durable persistence",
  "loader behavior",
  "production sprite rendering",
  "simulation work",
];

const addIssue = (
  issues: CatalogGeneratedSnapshotComparisonValidationIssue[],
  code: CatalogGeneratedSnapshotComparisonValidationCode,
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

const notesContain = (comparison: CatalogGeneratedSnapshotComparison, fragment: string) =>
  comparison.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

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

export function validateCatalogGeneratedSnapshotComparison(
  comparison: CatalogGeneratedSnapshotComparison = sampleCatalogGeneratedSnapshotComparison,
): CatalogGeneratedSnapshotComparisonValidationResult {
  const issues: CatalogGeneratedSnapshotComparisonValidationIssue[] = [];
  const sectionNames = comparison.sections.map((section) => section.section);

  expectedSections.forEach((sectionName) => {
    if (!sectionNames.includes(sectionName)) {
      addIssue(
        issues,
        "expected-section-missing",
        "sections",
        `Generated snapshot comparison is missing ${sectionName} section.`,
      );
    }
  });

  forbiddenSectionNames.forEach((sectionName) => {
    if (sectionNames.includes(sectionName as CatalogGeneratedSnapshotComparisonSectionName)) {
      addIssue(
        issues,
        "user-data-section-present",
        `sections.${sectionName}`,
        "Generated snapshot comparison must not include user teams, settings, reports, runtime output, or saves.",
      );
    }
  });

  comparison.sections.forEach((section, index) => {
    const expectedObservedCount = section.matchedCatalogKeys.length + section.missingCatalogKeys.length;
    const actualObservedCount = section.matchedCatalogKeys.length + section.addedCatalogKeys.length;

    if (section.expectedCount !== expectedObservedCount) {
      addIssue(
        issues,
        "comparison-count-mismatch",
        `sections.${index}.expectedCount`,
        `Expected count for ${section.section} must equal matched plus missing catalog keys.`,
      );
    }

    if (section.actualCount !== actualObservedCount) {
      addIssue(
        issues,
        "comparison-count-mismatch",
        `sections.${index}.actualCount`,
        `Actual count for ${section.section} must equal matched plus added catalog keys.`,
      );
    }

    if (section.countDelta !== section.actualCount - section.expectedCount) {
      addIssue(
        issues,
        "comparison-count-mismatch",
        `sections.${index}.countDelta`,
        `Count delta for ${section.section} must equal actual minus expected count.`,
      );
    }

    if (!section.sourceMetadataAlignment.actualSourceIds.length) {
      addIssue(
        issues,
        "source-alignment-missing",
        `sections.${index}.sourceMetadataAlignment.actualSourceIds`,
        `Source metadata alignment for ${section.section} must include actual source IDs.`,
      );
    }

    if (!section.sourceMetadataAlignment.pokeApiEnrichmentOnly) {
      addIssue(
        issues,
        "authority-boundary-missing",
        `sections.${index}.sourceMetadataAlignment.pokeApiEnrichmentOnly`,
        "Generated snapshot comparison must preserve PokeAPI/catalog enrichment-only boundary.",
      );
    }

    if (!section.sourceMetadataAlignment.showdownAuthorityPreserved) {
      addIssue(
        issues,
        "authority-boundary-missing",
        `sections.${index}.sourceMetadataAlignment.showdownAuthorityPreserved`,
        "Generated snapshot comparison must preserve Pokemon Showdown authority boundary.",
      );
    }

    if (
      section.section === "assets" &&
      section.candidateAssetReviewStatus.candidateAssetCount > 0 &&
      section.candidateAssetReviewStatus.status !== "review-gated"
    ) {
      addIssue(
        issues,
        "asset-review-not-gated",
        `sections.${index}.candidateAssetReviewStatus`,
        "Candidate asset sources must remain review-gated in generated snapshot comparison fixtures.",
      );
    }
  });

  if (!notesContain(comparison, "enrichment-only")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "notes",
      "Generated snapshot comparison notes must preserve PokeAPI/catalog enrichment-only boundary.",
    );
  }

  if (!notesContain(comparison, "Showdown")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "notes",
      "Generated snapshot comparison notes must preserve Pokemon Showdown authority boundary.",
    );
  }

  if (!notesContain(comparison, "candidate/review-gated")) {
    addIssue(
      issues,
      "authority-boundary-missing",
      "notes",
      "Generated snapshot comparison notes must preserve sprite candidate/review-gated boundary.",
    );
  }

  if (impliesRuntimeBehavior(comparison.notes)) {
    addIssue(
      issues,
      "runtime-behavior-implied",
      "notes",
      "Generated snapshot comparison notes must not imply UI wiring, runtime execution, file IO, .bl writing, persistence, loader behavior, or simulation work.",
    );
  }

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sectionCount: comparison.sections.length,
    checkedRules: [
      "all generated catalog sections are represented",
      "no user teams, settings, reports, runtime output, or saves are compared",
      "expected counts equal matched plus missing keys",
      "actual counts equal matched plus added keys",
      "count deltas equal actual minus expected counts",
      "source metadata alignment is present",
      "PokeAPI/catalog data remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "candidate asset metadata remains review-gated",
      "comparison does not imply UI wiring, loader behavior, file IO, .bl writing, persistence, or simulation work",
    ],
  };
}

export const sampleCatalogGeneratedSnapshotComparisonValidation =
  validateCatalogGeneratedSnapshotComparison();
