import { catalogLiveFetchPrototypeResourceIds } from "./catalogLiveFetchPrototype";
import {
  approvedCatalogLiveFetchSampleManifest,
  approvedCatalogLiveFetchSampleResourceIds,
  plannedCatalogCoverageExpansionResourceIds,
  type CatalogSourceManifestSection,
} from "./catalogSourceManifest";
import { approvedCatalogLiveFetchSampleManifestValidation } from "./catalogSourceManifestValidation";
import {
  validateCatalogLiveFetchPrototypeCoverage,
  validateCatalogLiveFetchPrototypePlannedCoverage,
} from "./catalogLiveFetchPrototypeValidation";

export type CatalogSourceManifestBridgeValidationSeverity = "error" | "warning";

export type CatalogSourceManifestBridgeValidationCode =
  | "authority-mismatch"
  | "coverage-count-mismatch"
  | "coverage-validation-failed"
  | "manifest-validation-failed"
  | "planned-coverage-validation-failed"
  | "resource-id-mismatch"
  | "source-role-mismatch"
  | "sprite-policy-mismatch";

export interface CatalogSourceManifestBridgeValidationIssue {
  code: CatalogSourceManifestBridgeValidationCode;
  severity: CatalogSourceManifestBridgeValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogSourceManifestBridgeValidationResult {
  isValid: boolean;
  issues: CatalogSourceManifestBridgeValidationIssue[];
  manifestIssueCount: number;
  coverageIssueCount: number;
  plannedCoverageIssueCount: number;
  sectionCount: number;
}

const createBridgeIssue = (
  code: CatalogSourceManifestBridgeValidationCode,
  path: string,
  message: string,
): CatalogSourceManifestBridgeValidationIssue => ({
  code,
  severity: "error",
  path,
  message,
});

const resourceIdsMatch = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export function validateCatalogSourceManifestLiveFetchBridge(): CatalogSourceManifestBridgeValidationResult {
  const issues: CatalogSourceManifestBridgeValidationIssue[] = [];
  const coverageValidation = validateCatalogLiveFetchPrototypeCoverage();
  const plannedCoverageValidation = validateCatalogLiveFetchPrototypePlannedCoverage();

  if (!approvedCatalogLiveFetchSampleManifestValidation.isValid) {
    issues.push(
      createBridgeIssue(
        "manifest-validation-failed",
        "approvedCatalogLiveFetchSampleManifestValidation",
        "Catalog Source Manifest validation must pass before checking live-fetch bridge alignment.",
      ),
    );
  }

  if (!coverageValidation.isValid) {
    issues.push(
      createBridgeIssue(
        "coverage-validation-failed",
        "validateCatalogLiveFetchPrototypeCoverage",
        "Live-fetch prototype coverage validation must pass before checking manifest bridge alignment.",
      ),
    );
  }

  if (!plannedCoverageValidation.isValid) {
    issues.push(
      createBridgeIssue(
        "planned-coverage-validation-failed",
        "validateCatalogLiveFetchPrototypePlannedCoverage",
        "Planned live-fetch prototype coverage validation must pass before checking manifest bridge alignment.",
      ),
    );
  }

  if (approvedCatalogLiveFetchSampleManifest.sourceRole !== "enrichment") {
    issues.push(
      createBridgeIssue(
        "source-role-mismatch",
        "approvedCatalogLiveFetchSampleManifest.sourceRole",
        "PokeAPI catalog source manifest must remain enrichment-only.",
      ),
    );
  }

  if (
    approvedCatalogLiveFetchSampleManifest.legalityAuthority !== "pokemon-showdown" ||
    approvedCatalogLiveFetchSampleManifest.simulationAuthority !== "pokemon-showdown"
  ) {
    issues.push(
      createBridgeIssue(
        "authority-mismatch",
        "approvedCatalogLiveFetchSampleManifest",
        "Pokemon Showdown must remain the legality and simulation source of truth.",
      ),
    );
  }

  if (approvedCatalogLiveFetchSampleManifest.spriteMetadataPolicy !== "candidate-review-gated") {
    issues.push(
      createBridgeIssue(
        "sprite-policy-mismatch",
        "approvedCatalogLiveFetchSampleManifest.spriteMetadataPolicy",
        "Sprite metadata must remain candidate-review-gated.",
      ),
    );
  }

  Object.entries(approvedCatalogLiveFetchSampleManifest.sections).forEach(([section, sectionManifest]) => {
    const typedSection = section as CatalogSourceManifestSection;
    const manifestResourceIds = sectionManifest.resourceIds;
    const plannedManifestResourceIds = sectionManifest.expansionPolicy.plannedResourceIds;
    const approvedResourceIds = approvedCatalogLiveFetchSampleResourceIds[typedSection];
    const plannedApprovedResourceIds = plannedCatalogCoverageExpansionResourceIds[typedSection];
    const prototypeResourceIds = catalogLiveFetchPrototypeResourceIds[typedSection];

    if (!resourceIdsMatch(prototypeResourceIds, approvedResourceIds)) {
      issues.push(
        createBridgeIssue(
          "resource-id-mismatch",
          `catalogLiveFetchPrototypeResourceIds.${section}`,
          `Live-fetch prototype ${section} IDs must match approved manifest resource IDs.`,
        ),
      );
    }

    if (!resourceIdsMatch(prototypeResourceIds, manifestResourceIds)) {
      issues.push(
        createBridgeIssue(
          "resource-id-mismatch",
          `approvedCatalogLiveFetchSampleManifest.sections.${section}.resourceIds`,
          `Manifest ${section} IDs must match live-fetch prototype resource IDs.`,
        ),
      );
    }

    if (coverageValidation.coverage[typedSection] !== sectionManifest.expectedCount) {
      issues.push(
        createBridgeIssue(
          "coverage-count-mismatch",
          `coverage.${section}`,
          `Coverage count for ${section} must match manifest expectedCount.`,
        ),
      );
    }

    if (!resourceIdsMatch(plannedApprovedResourceIds, plannedManifestResourceIds)) {
      issues.push(
        createBridgeIssue(
          "resource-id-mismatch",
          `plannedCatalogCoverageExpansionResourceIds.${section}`,
          `Planned live-fetch prototype ${section} IDs must match manifest expansion policy resource IDs.`,
        ),
      );
    }

    if (plannedCoverageValidation.coverage[typedSection] !== plannedManifestResourceIds.length) {
      issues.push(
        createBridgeIssue(
          "coverage-count-mismatch",
          `plannedCoverage.${section}`,
          `Planned coverage count for ${section} must match manifest expansion policy plannedResourceIds length.`,
        ),
      );
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    manifestIssueCount: approvedCatalogLiveFetchSampleManifestValidation.issues.length,
    coverageIssueCount: coverageValidation.issues.length,
    plannedCoverageIssueCount: plannedCoverageValidation.issues.length,
    sectionCount: Object.keys(approvedCatalogLiveFetchSampleManifest.sections).length,
  };
}

export const approvedCatalogLiveFetchSampleBridgeValidation =
  validateCatalogSourceManifestLiveFetchBridge();
