import {
  catalogCoverageExpansionPlan,
  type CatalogCoverageExpansionExecutionBoundary,
  type CatalogCoverageExpansionPlan,
  type CatalogCoverageExpansionStage,
} from "./catalogCoverageExpansionPlan";
import type { CatalogSourceManifestSection } from "./catalogSourceManifest";

export type CatalogCoverageExpansionPlanValidationSeverity = "error" | "warning";

export type CatalogCoverageExpansionPlanValidationCode =
  | "authority-mismatch"
  | "boundary-missing"
  | "forbidden-note"
  | "required-section-missing"
  | "section-name-mismatch"
  | "source-role-mismatch"
  | "sprite-policy-mismatch"
  | "stage-gate-missing"
  | "validation-helper-missing";

export interface CatalogCoverageExpansionPlanValidationIssue {
  code: CatalogCoverageExpansionPlanValidationCode;
  severity: CatalogCoverageExpansionPlanValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogCoverageExpansionPlanValidationResult {
  isValid: boolean;
  issues: CatalogCoverageExpansionPlanValidationIssue[];
  sectionCount: number;
  stageGateCount: number;
}

const requiredSections: CatalogSourceManifestSection[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
];

const requiredStageGates: CatalogCoverageExpansionStage[] = [
  "source-manifest-expansion",
  "live-fetch-prototype-scaling",
  "generated-catalog-validation",
  "cache-bundle-readiness",
  "pokemon-editor-picker-readiness",
];

const requiredBoundaries: CatalogCoverageExpansionExecutionBoundary[] = [
  "data-only",
  "no-ui-wiring",
  "no-persistence",
  "no-file-io",
  "no-bl-writing",
  "no-showdown-runtime",
  "no-simulation",
];

const requiredValidationHelpers = [
  "validateCatalogSourceManifest",
  "validateCatalogLiveFetchPrototypeCoverage",
  "validateCatalogLiveFetchPrototype",
  "validateGeneratedPokeApiCatalogPipeline",
  "validateCatalogCacheContracts",
];

const forbiddenPositiveSemantics = [
  "CatalogUpdatePanel execution is approved",
  "Pokemon Editor live wiring is approved",
  ".bl writing is approved",
  "production sprite source is approved",
  "Pokemon Showdown replacement",
  "PokeAPI legality authority",
];

const createIssue = (
  code: CatalogCoverageExpansionPlanValidationCode,
  severity: CatalogCoverageExpansionPlanValidationSeverity,
  path: string,
  message: string,
): CatalogCoverageExpansionPlanValidationIssue => ({
  code,
  severity,
  path,
  message,
});

const includesText = (values: readonly string[], fragment: string) =>
  values.some((value) => value.toLowerCase().includes(fragment.toLowerCase()));

const allPlanText = (plan: CatalogCoverageExpansionPlan) => [
  ...plan.notes,
  ...Object.values(plan.sections).flatMap((section) => [
    section.currentCoverage,
    section.targetCoverage,
    ...section.sourceManifestWork,
    ...section.liveFetchWork,
    ...section.generatorValidationWork,
    ...section.cacheBundleReadinessWork,
    ...section.laterPickerIntegrationWork,
    ...section.mismatchRisks,
  ]),
  ...plan.stageGates.flatMap((gate) => [
    gate.description,
    ...gate.requiredBeforeNextStage,
    ...gate.validationHelpers,
    ...(gate.blockedUntilLeadApproval ?? []),
  ]),
];

export function validateCatalogCoverageExpansionPlan(
  plan: CatalogCoverageExpansionPlan = catalogCoverageExpansionPlan,
): CatalogCoverageExpansionPlanValidationResult {
  const issues: CatalogCoverageExpansionPlanValidationIssue[] = [];

  if (plan.sourceRole !== "enrichment") {
    issues.push(
      createIssue(
        "source-role-mismatch",
        "error",
        "sourceRole",
        "Catalog coverage expansion plan must keep PokeAPI as enrichment-only.",
      ),
    );
  }

  if (plan.legalityAuthority !== "pokemon-showdown") {
    issues.push(
      createIssue(
        "authority-mismatch",
        "error",
        "legalityAuthority",
        "Catalog coverage expansion plan must keep Pokemon Showdown as legality authority.",
      ),
    );
  }

  if (plan.simulationAuthority !== "pokemon-showdown") {
    issues.push(
      createIssue(
        "authority-mismatch",
        "error",
        "simulationAuthority",
        "Catalog coverage expansion plan must keep Pokemon Showdown as simulation authority.",
      ),
    );
  }

  if (plan.spriteMetadataPolicy !== "candidate-review-gated") {
    issues.push(
      createIssue(
        "sprite-policy-mismatch",
        "error",
        "spriteMetadataPolicy",
        "Catalog coverage expansion plan must keep sprite metadata candidate-review-gated.",
      ),
    );
  }

  requiredBoundaries.forEach((boundary) => {
    if (!plan.executionBoundaries.includes(boundary)) {
      issues.push(
        createIssue(
          "boundary-missing",
          "error",
          "executionBoundaries",
          `Catalog coverage expansion plan must include '${boundary}'.`,
        ),
      );
    }
  });

  requiredSections.forEach((section) => {
    const sectionPlan = plan.sections[section];

    if (!sectionPlan) {
      issues.push(
        createIssue(
          "required-section-missing",
          "error",
          `sections.${section}`,
          `Catalog coverage expansion plan is missing ${section}.`,
        ),
      );
      return;
    }

    if (sectionPlan.section !== section) {
      issues.push(
        createIssue(
          "section-name-mismatch",
          "error",
          `sections.${section}.section`,
          `Catalog coverage expansion section key '${section}' must match '${sectionPlan.section}'.`,
        ),
      );
    }
  });

  requiredStageGates.forEach((stage) => {
    if (!plan.stageGates.some((gate) => gate.stage === stage)) {
      issues.push(
        createIssue(
          "stage-gate-missing",
          "error",
          "stageGates",
          `Catalog coverage expansion plan is missing '${stage}' stage gate.`,
        ),
      );
    }
  });

  requiredValidationHelpers.forEach((helper) => {
    if (!plan.stageGates.some((gate) => gate.validationHelpers.includes(helper))) {
      issues.push(
        createIssue(
          "validation-helper-missing",
          "error",
          "stageGates.validationHelpers",
          `Catalog coverage expansion plan must reference ${helper}.`,
        ),
      );
    }
  });

  const planText = allPlanText(plan);

  forbiddenPositiveSemantics.forEach((fragment) => {
    if (includesText(planText, fragment)) {
      issues.push(
        createIssue(
          "forbidden-note",
          "warning",
          "notes",
          `Review wording around '${fragment}' to ensure it is blocked/deferred rather than approved in this lane.`,
        ),
      );
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sectionCount: Object.keys(plan.sections).length,
    stageGateCount: plan.stageGates.length,
  };
}

export const catalogCoverageExpansionPlanValidation =
  validateCatalogCoverageExpansionPlan(catalogCoverageExpansionPlan);
