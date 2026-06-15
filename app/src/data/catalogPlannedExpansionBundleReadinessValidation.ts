import type { BattleLabCatalogBundleSectionName } from "../types/catalogBundle";
import { validateBattleLabCatalogBundleHashes } from "./catalogBundleHashes";
import {
  createPlannedExpansionBundleReadiness,
  type CatalogPlannedExpansionBundleReadiness,
} from "./catalogPlannedExpansionBundleReadiness";

export type CatalogPlannedExpansionBundleReadinessValidationSeverity = "error" | "warning";

export type CatalogPlannedExpansionBundleReadinessValidationCode =
  | "asset-review-policy-open"
  | "boundary-note-missing"
  | "bundle-hash-invalid"
  | "bundle-readiness-failed"
  | "coverage-validation-failed"
  | "safety-flag-open"
  | "section-not-ready";

export interface CatalogPlannedExpansionBundleReadinessValidationIssue {
  code: CatalogPlannedExpansionBundleReadinessValidationCode;
  severity: CatalogPlannedExpansionBundleReadinessValidationSeverity;
  path: string;
  message: string;
  section?: BattleLabCatalogBundleSectionName;
}

export interface CatalogPlannedExpansionBundleReadinessValidationResult {
  isValid: boolean;
  issues: CatalogPlannedExpansionBundleReadinessValidationIssue[];
  readiness: CatalogPlannedExpansionBundleReadiness | null;
}

const requiredSections: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const requiredBoundaryFragments = [
  "does not trigger live fetch at import time",
  "in-memory data only",
  "does not write .bl files",
  "does not implement loader execution",
  "does not wire Pokemon Editor",
  "CatalogUpdatePanel",
  "enrichment-only",
  "Pokemon Showdown",
  "candidate-review-gated",
];

const createIssue = (
  code: CatalogPlannedExpansionBundleReadinessValidationCode,
  path: string,
  message: string,
  section?: BattleLabCatalogBundleSectionName,
): CatalogPlannedExpansionBundleReadinessValidationIssue => ({
  code,
  severity: "error",
  path,
  message,
  ...(section ? { section } : {}),
});

const hasBoundaryFragment = (readiness: CatalogPlannedExpansionBundleReadiness, fragment: string) =>
  readiness.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase())) ||
  readiness.bundle.manifest.warnings.some((warning) => warning.toLowerCase().includes(fragment.toLowerCase()));

export async function validatePlannedExpansionBundleReadiness(): Promise<CatalogPlannedExpansionBundleReadinessValidationResult> {
  const issues: CatalogPlannedExpansionBundleReadinessValidationIssue[] = [];
  let readiness: CatalogPlannedExpansionBundleReadiness | null = null;

  try {
    readiness = await createPlannedExpansionBundleReadiness();
  } catch (error) {
    issues.push(
      createIssue(
        "bundle-readiness-failed",
        "createPlannedExpansionBundleReadiness",
        error instanceof Error ? error.message : "Planned-expansion bundle readiness failed.",
      ),
    );

    return {
      isValid: false,
      issues,
      readiness,
    };
  }

  if (!readiness.coverageValidation.isValid) {
    issues.push(
      createIssue(
        "coverage-validation-failed",
        "coverageValidation",
        "Planned-expansion picker coverage validation must pass before bundle readiness is valid.",
      ),
    );
  }

  const bundleHashValidation = await validateBattleLabCatalogBundleHashes(readiness.bundle);
  bundleHashValidation.issues.forEach((issue) => {
    issues.push({
      code: "bundle-hash-invalid",
      severity: issue.severity,
      path: `bundle.${issue.path}`,
      message: issue.message,
      ...(issue.section ? { section: issue.section } : {}),
    });
  });

  requiredSections.forEach((section) => {
    const summary = readiness.sectionSummaries.find((sectionSummary) => sectionSummary.section === section);

    if (!summary?.readyForBundle) {
      issues.push(
        createIssue(
          "section-not-ready",
          `sectionSummaries.${section}`,
          `Planned-expansion bundle readiness must include a non-empty ${section} section.`,
          section,
        ),
      );
    }
  });

  if (!readiness.assetReview.isReviewGated || readiness.assetReview.productionSourceUrlCount > 0) {
    issues.push(
      createIssue(
        "asset-review-policy-open",
        "assetReview",
        "Planned-expansion asset metadata must remain candidate-review-gated with no production source URLs.",
        "assets",
      ),
    );
  }

  const safety = readiness.safety;
  if (
    !safety.previewOnly ||
    safety.fileIoEnabled ||
    safety.loaderExecutionEnabled ||
    safety.pokemonEditorWiringEnabled ||
    safety.catalogUpdatePanelWiringEnabled ||
    safety.safeToWriteBundle ||
    safety.safeToUseSpriteAssetsInProduction
  ) {
    issues.push(
      createIssue(
        "safety-flag-open",
        "safety",
        "Planned-expansion bundle readiness must keep all execution, writing, UI wiring, and production sprite safety flags closed.",
      ),
    );
  }

  requiredBoundaryFragments.forEach((fragment) => {
    if (!hasBoundaryFragment(readiness, fragment)) {
      issues.push(
        createIssue(
          "boundary-note-missing",
          "notes",
          `Planned-expansion bundle readiness must preserve '${fragment}' boundary language.`,
        ),
      );
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    readiness,
  };
}
