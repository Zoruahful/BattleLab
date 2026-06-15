import {
  createPlannedExpansionLocalPickerProjection,
  type CatalogPlannedExpansionPickerProjection,
  type CatalogPlannedExpansionPickerProjectionSection,
} from "./catalogPlannedExpansionPickerProjection";

export type CatalogPlannedExpansionPickerProjectionValidationSeverity = "error" | "warning";

export type CatalogPlannedExpansionPickerProjectionValidationCode =
  | "boundary-note-missing"
  | "count-mismatch"
  | "identity-missing"
  | "projection-failed"
  | "search-index-missing"
  | "source-fixture-invalid";

export interface CatalogPlannedExpansionPickerProjectionValidationIssue {
  code: CatalogPlannedExpansionPickerProjectionValidationCode;
  severity: CatalogPlannedExpansionPickerProjectionValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogPlannedExpansionPickerProjectionValidationResult {
  isValid: boolean;
  issues: CatalogPlannedExpansionPickerProjectionValidationIssue[];
  projection: CatalogPlannedExpansionPickerProjection | null;
}

const createIssue = (
  code: CatalogPlannedExpansionPickerProjectionValidationCode,
  path: string,
  message: string,
): CatalogPlannedExpansionPickerProjectionValidationIssue => ({
  code,
  severity: "error",
  path,
  message,
});

const requiredBoundaryFragments = [
  "does not trigger live fetch at import time",
  "data-only",
  "does not wire Pokemon Editor",
  "CatalogUpdatePanel",
  "catalogKey/showdownId",
  "displayName",
  "enrichment-only",
  "Pokemon Showdown",
  "candidate-review-gated",
];

const expectedSectionCounts = (
  projection: CatalogPlannedExpansionPickerProjection,
): Record<CatalogPlannedExpansionPickerProjectionSection, number> => ({
  pokemon: projection.counts.pokemon,
  moves: projection.counts.moves,
  abilities: projection.counts.abilities,
  items: projection.counts.items,
  types: projection.counts.types,
  natures: projection.counts.natures,
});

const hasBoundaryFragment = (projection: CatalogPlannedExpansionPickerProjection, fragment: string) =>
  projection.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

export async function validatePlannedExpansionLocalPickerProjection(): Promise<CatalogPlannedExpansionPickerProjectionValidationResult> {
  const issues: CatalogPlannedExpansionPickerProjectionValidationIssue[] = [];
  let projection: CatalogPlannedExpansionPickerProjection | null = null;

  try {
    projection = await createPlannedExpansionLocalPickerProjection();
  } catch (error) {
    issues.push(
      createIssue(
        "projection-failed",
        "createPlannedExpansionLocalPickerProjection",
        error instanceof Error ? error.message : "Planned-expansion picker projection failed.",
      ),
    );

    return {
      isValid: false,
      issues,
      projection,
    };
  }

  if (!projection.fixture.validation.isValid || projection.fixture.validation.result.coverageMode !== "planned-expansion") {
    issues.push(
      createIssue(
        "source-fixture-invalid",
        "projection.fixture.validation",
        "Picker projection must come from a valid planned-expansion generated catalog fixture.",
      ),
    );
  }

  const counts = expectedSectionCounts(projection);
  projection.sectionSummaries.forEach((summary) => {
    const expectedCount = counts[summary.section];

    if (summary.optionCount !== expectedCount) {
      issues.push(
        createIssue(
          "count-mismatch",
          `sectionSummaries.${summary.section}.optionCount`,
          `Expected ${expectedCount} ${summary.section} picker options, found ${summary.optionCount}.`,
        ),
      );
    }

    if (summary.searchIndexCount < expectedCount) {
      issues.push(
        createIssue(
          "search-index-missing",
          `sectionSummaries.${summary.section}.searchIndexCount`,
          `Expected at least ${expectedCount} ${summary.section} search entries, found ${summary.searchIndexCount}.`,
        ),
      );
    }

    if (!summary.hasCatalogIdentity) {
      issues.push(
        createIssue(
          "identity-missing",
          `sectionSummaries.${summary.section}.hasCatalogIdentity`,
          `${summary.section} picker options must preserve catalogKey/showdownId identity.`,
        ),
      );
    }

    if (!summary.displayLabelsAreSeparate) {
      issues.push(
        createIssue(
          "identity-missing",
          `sectionSummaries.${summary.section}.displayLabelsAreSeparate`,
          `${summary.section} picker options must keep display labels separate from catalog identity.`,
        ),
      );
    }
  });

  requiredBoundaryFragments.forEach((fragment) => {
    if (!hasBoundaryFragment(projection, fragment)) {
      issues.push(
        createIssue(
          "boundary-note-missing",
          "projection.notes",
          `Picker projection notes must preserve '${fragment}' boundary language.`,
        ),
      );
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    projection,
  };
}
