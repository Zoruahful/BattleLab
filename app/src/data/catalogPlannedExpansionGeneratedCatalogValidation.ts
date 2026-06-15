import { plannedCatalogCoverageExpansionResourceIds } from "./catalogSourceManifest";
import {
  createPlannedExpansionGeneratedCatalogFixture,
  type CatalogPlannedExpansionGeneratedCatalogFixture,
  type CatalogPlannedExpansionGeneratedCatalogSection,
} from "./catalogPlannedExpansionGeneratedCatalog";

export type CatalogPlannedExpansionGeneratedCatalogValidationSeverity = "error" | "warning";

export type CatalogPlannedExpansionGeneratedCatalogValidationCode =
  | "boundary-note-missing"
  | "catalog-missing"
  | "catalog-validation-failed"
  | "count-mismatch"
  | "picker-readiness-failed"
  | "safety-flag-open";

export interface CatalogPlannedExpansionGeneratedCatalogValidationIssue {
  code: CatalogPlannedExpansionGeneratedCatalogValidationCode;
  severity: CatalogPlannedExpansionGeneratedCatalogValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogPlannedExpansionGeneratedCatalogValidationResult {
  isValid: boolean;
  issues: CatalogPlannedExpansionGeneratedCatalogValidationIssue[];
  fixture: CatalogPlannedExpansionGeneratedCatalogFixture | null;
}

const createIssue = (
  code: CatalogPlannedExpansionGeneratedCatalogValidationCode,
  path: string,
  message: string,
): CatalogPlannedExpansionGeneratedCatalogValidationIssue => ({
  code,
  severity: "error",
  path,
  message,
});

const expectedCounts = {
  pokemon: plannedCatalogCoverageExpansionResourceIds.pokemon.length,
  moves: plannedCatalogCoverageExpansionResourceIds.moves.length,
  abilities: plannedCatalogCoverageExpansionResourceIds.abilities.length,
  items: plannedCatalogCoverageExpansionResourceIds.items.length,
  types: plannedCatalogCoverageExpansionResourceIds.types.length,
  natures: plannedCatalogCoverageExpansionResourceIds.natures.length,
} as const;

const requiredBoundaryFragments = [
  "data-only",
  "does not wire CatalogUpdatePanel",
  "Pokemon Editor",
  "enrichment-only",
  "Pokemon Showdown",
  "candidate-review-gated",
];

const hasBoundaryFragment = (
  fixture: CatalogPlannedExpansionGeneratedCatalogFixture,
  fragment: string,
) => fixture.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

const validateCount = (
  issues: CatalogPlannedExpansionGeneratedCatalogValidationIssue[],
  section: keyof typeof expectedCounts,
  actualCount: number,
) => {
  const expectedCount = expectedCounts[section];

  if (actualCount !== expectedCount) {
    issues.push(
      createIssue(
        "count-mismatch",
        `counts.${section}`,
        `Expected ${expectedCount} planned ${section} records, found ${actualCount}.`,
      ),
    );
  }
};

export async function validatePlannedExpansionGeneratedCatalogFixture(): Promise<CatalogPlannedExpansionGeneratedCatalogValidationResult> {
  const issues: CatalogPlannedExpansionGeneratedCatalogValidationIssue[] = [];
  let fixture: CatalogPlannedExpansionGeneratedCatalogFixture | null = null;

  try {
    fixture = await createPlannedExpansionGeneratedCatalogFixture();
  } catch (error) {
    issues.push(
      createIssue(
        "catalog-validation-failed",
        "createPlannedExpansionGeneratedCatalogFixture",
        error instanceof Error ? error.message : "Planned-expansion generated catalog fixture failed.",
      ),
    );

    return {
      isValid: false,
      issues,
      fixture,
    };
  }

  if (!fixture.catalog) {
    issues.push(
      createIssue("catalog-missing", "fixture.catalog", "Planned-expansion fixture must include a generated catalog."),
    );
  }

  if (!fixture.validation.isValid || fixture.validation.result.coverageMode !== "planned-expansion") {
    issues.push(
      createIssue(
        "catalog-validation-failed",
        "fixture.validation",
        "Planned-expansion fixture must come from valid planned-expansion live-fetch validation.",
      ),
    );
  }

  validateCount(issues, "pokemon", fixture.counts.pokemon);
  validateCount(issues, "moves", fixture.counts.moves);
  validateCount(issues, "abilities", fixture.counts.abilities);
  validateCount(issues, "items", fixture.counts.items);
  validateCount(issues, "types", fixture.counts.types);
  validateCount(issues, "natures", fixture.counts.natures);

  fixture.pickerReadiness.forEach((section) => {
    if (!section.readyForLocalPickerProjection) {
      issues.push(
        createIssue(
          "picker-readiness-failed",
          `pickerReadiness.${section.section}`,
          `Planned-expansion ${section.section} records must have search entries for later local picker projection.`,
        ),
      );
    }
  });

  const safety = fixture.updateReadModelProps.safety;
  if (
    safety.safeToCommitCatalog ||
    safety.safeToWriteBundle ||
    safety.safeToUseSpriteAssetsInProduction ||
    !safety.previewOnly ||
    safety.executionEnabled ||
    safety.fileIoEnabled
  ) {
    issues.push(
      createIssue(
        "safety-flag-open",
        "updateReadModelProps.safety",
        "Planned-expansion read-model props must keep all safety flags closed.",
      ),
    );
  }

  requiredBoundaryFragments.forEach((fragment) => {
    if (!hasBoundaryFragment(fixture, fragment)) {
      issues.push(
        createIssue(
          "boundary-note-missing",
          "fixture.notes",
          `Planned-expansion fixture notes must preserve '${fragment}' boundary language.`,
        ),
      );
    }
  });

  const expectedSections: CatalogPlannedExpansionGeneratedCatalogSection[] = [
    "pokemon",
    "moves",
    "abilities",
    "items",
    "types",
    "natures",
    "assets",
    "searchIndex",
  ];

  expectedSections.forEach((section) => {
    if (!fixture.comparison.sections.some((comparisonSection) => comparisonSection.section === section)) {
      issues.push(
        createIssue(
          "catalog-validation-failed",
          `comparison.sections.${section}`,
          `Planned-expansion fixture comparison must include ${section}.`,
        ),
      );
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    fixture,
  };
}
