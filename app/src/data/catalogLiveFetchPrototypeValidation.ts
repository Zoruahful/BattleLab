import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import {
  catalogLiveFetchPlannedCoverageResourceIds,
  catalogLiveFetchPrototypeResourceIds,
  normalizeFetchedPokeApiItemResourceForPrototype,
  runCatalogLiveFetchPrototype,
  type CatalogLiveFetchPrototypeResult,
  type CatalogLiveFetchPrototypeCoverageMode,
  type PokeApiItemResourceWithEffectEntries,
} from "./catalogLiveFetchPrototype";
import { approvedCatalogLiveFetchSampleManifest } from "./catalogSourceManifest";

export type CatalogLiveFetchPrototypeValidationStage =
  | "fetch"
  | "source-validation"
  | "generated-catalog-validation";

export type CatalogLiveFetchPrototypeCoverageValidationCode =
  | "section-count-mismatch"
  | "required-resource-missing"
  | "duplicate-resource-id"
  | "planned-resource-missing-active-baseline"
  | "item-fallback-missing";

export interface CatalogLiveFetchPrototypeCoverageValidationIssue {
  code: CatalogLiveFetchPrototypeCoverageValidationCode;
  severity: "error";
  path: string;
  message: string;
}

export interface CatalogLiveFetchPrototypeCoverageValidationResult {
  isValid: boolean;
  issues: CatalogLiveFetchPrototypeCoverageValidationIssue[];
  coverageMode: CatalogLiveFetchPrototypeCoverageMode;
  coverage: Record<CatalogLiveFetchPrototypeResourceSection, number>;
}

type CatalogLiveFetchPrototypeResourceSection = keyof typeof catalogLiveFetchPrototypeResourceIds;

export interface CatalogLiveFetchPrototypeValidationIssue {
  stage: CatalogLiveFetchPrototypeValidationStage;
  code: string;
  severity: "error" | "warning";
  path: string;
  message: string;
}

export interface CatalogLiveFetchPrototypeValidationResult {
  isValid: boolean;
  result: CatalogLiveFetchPrototypeResult;
  issues: CatalogLiveFetchPrototypeValidationIssue[];
}

const toValidationIssue = (
  stage: CatalogLiveFetchPrototypeValidationStage,
  issue: {
    code: string;
    severity: "error" | "warning";
    path?: string;
    message: string;
  },
): CatalogLiveFetchPrototypeValidationIssue => ({
  stage,
  code: issue.code,
  severity: issue.severity,
  path: issue.path ?? stage,
  message: issue.message,
});

const toFetchValidationIssue = (
  issue: CatalogSourceFetchIssue,
): CatalogLiveFetchPrototypeValidationIssue => ({
  stage: "fetch",
  code: issue.code,
  severity: issue.severity === "info" ? "warning" : issue.severity,
  path: issue.path ?? issue.resourceId ?? "fetch",
  message: issue.message,
});

const createCoverageIssue = (
  code: CatalogLiveFetchPrototypeCoverageValidationCode,
  path: string,
  message: string,
): CatalogLiveFetchPrototypeCoverageValidationIssue => ({
  code,
  severity: "error",
  path,
  message,
});

const createFallbackOnlyItem = (): PokeApiItemResourceWithEffectEntries => ({
  id: 999_001,
  name: "battlelab-fallback-test-item",
  flavor_text_entries: [],
  sprites: {
    default: null,
  },
  names: [
    {
      name: "BattleLab Fallback Test Item",
      language: {
        name: "en",
        url: "https://pokeapi.co/api/v2/language/9/",
      },
    },
  ],
});

export function validateCatalogLiveFetchPrototypeCoverage(): CatalogLiveFetchPrototypeCoverageValidationResult {
  const issues: CatalogLiveFetchPrototypeCoverageValidationIssue[] = [];
  const coverage = Object.fromEntries(
    Object.entries(catalogLiveFetchPrototypeResourceIds).map(([section, ids]) => [section, ids.length]),
  ) as Record<CatalogLiveFetchPrototypeResourceSection, number>;

  Object.entries(approvedCatalogLiveFetchSampleManifest.sections).forEach(([section, sectionManifest]) => {
    const typedSection = section as CatalogLiveFetchPrototypeResourceSection;
    const actualIds: readonly string[] = catalogLiveFetchPrototypeResourceIds[typedSection];
    const duplicateIds = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);

    if (actualIds.length !== sectionManifest.expectedCount) {
      issues.push(
        createCoverageIssue(
          "section-count-mismatch",
          `resourceIds.${section}`,
          `Expected ${sectionManifest.expectedCount} ${section} resources, but found ${actualIds.length}.`,
        ),
      );
    }

    duplicateIds.forEach((id) => {
      issues.push(
        createCoverageIssue(
          "duplicate-resource-id",
          `resourceIds.${section}.${id}`,
          `Duplicate ${section} resource id '${id}' is not allowed in the live-fetch prototype set.`,
        ),
      );
    });

    sectionManifest.resourceIds.forEach((id) => {
      if (!actualIds.includes(id)) {
        issues.push(
          createCoverageIssue(
            "required-resource-missing",
            `resourceIds.${section}.${id}`,
            `Required ${section} resource id '${id}' is missing from the live-fetch prototype set.`,
          ),
        );
      }
    });
  });

  const normalizedFallbackItem = normalizeFetchedPokeApiItemResourceForPrototype(createFallbackOnlyItem());
  const fallbackText = normalizedFallbackItem.flavor_text_entries.find((entry) => entry.language.name === "en")?.text;

  if (fallbackText !== "PokeAPI live item description unavailable for BattleLab Fallback Test Item.") {
    issues.push(
      createCoverageIssue(
        "item-fallback-missing",
        "itemFallback.flavorText",
        "PokeAPI item fallback text is not represented for English names without flavor or effect text.",
      ),
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    coverageMode: "active-sample",
    coverage,
  };
}

export function validateCatalogLiveFetchPrototypePlannedCoverage(): CatalogLiveFetchPrototypeCoverageValidationResult {
  const issues: CatalogLiveFetchPrototypeCoverageValidationIssue[] = [];
  const coverage = Object.fromEntries(
    Object.entries(catalogLiveFetchPlannedCoverageResourceIds).map(([section, ids]) => [section, ids.length]),
  ) as Record<CatalogLiveFetchPrototypeResourceSection, number>;

  Object.entries(approvedCatalogLiveFetchSampleManifest.sections).forEach(([section, sectionManifest]) => {
    const typedSection = section as CatalogLiveFetchPrototypeResourceSection;
    const actualIds: readonly string[] = catalogLiveFetchPlannedCoverageResourceIds[typedSection];
    const duplicateIds = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);

    if (actualIds.length !== sectionManifest.expansionPolicy.plannedResourceIds.length) {
      issues.push(
        createCoverageIssue(
          "section-count-mismatch",
          `plannedResourceIds.${section}`,
          `Expected ${sectionManifest.expansionPolicy.plannedResourceIds.length} planned ${section} resources, but found ${actualIds.length}.`,
        ),
      );
    }

    duplicateIds.forEach((id) => {
      issues.push(
        createCoverageIssue(
          "duplicate-resource-id",
          `plannedResourceIds.${section}.${id}`,
          `Duplicate planned ${section} resource id '${id}' is not allowed in the live-fetch prototype set.`,
        ),
      );
    });

    sectionManifest.expansionPolicy.plannedResourceIds.forEach((id) => {
      if (!actualIds.includes(id)) {
        issues.push(
          createCoverageIssue(
            "required-resource-missing",
            `plannedResourceIds.${section}.${id}`,
            `Required planned ${section} resource id '${id}' is missing from the planned live-fetch prototype set.`,
          ),
        );
      }
    });

    sectionManifest.resourceIds.forEach((id) => {
      if (!actualIds.includes(id)) {
        issues.push(
          createCoverageIssue(
            "planned-resource-missing-active-baseline",
            `plannedResourceIds.${section}.${id}`,
            `Planned ${section} coverage must preserve active baseline resource id '${id}'.`,
          ),
        );
      }
    });
  });

  const normalizedFallbackItem = normalizeFetchedPokeApiItemResourceForPrototype(createFallbackOnlyItem());
  const fallbackText = normalizedFallbackItem.flavor_text_entries.find((entry) => entry.language.name === "en")?.text;

  if (fallbackText !== "PokeAPI live item description unavailable for BattleLab Fallback Test Item.") {
    issues.push(
      createCoverageIssue(
        "item-fallback-missing",
        "itemFallback.flavorText",
        "PokeAPI item fallback text is not represented for English names without flavor or effect text.",
      ),
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    coverageMode: "planned-expansion",
    coverage,
  };
}

export async function validateCatalogLiveFetchPrototype(): Promise<CatalogLiveFetchPrototypeValidationResult> {
  const result = await runCatalogLiveFetchPrototype();
  const issues: CatalogLiveFetchPrototypeValidationIssue[] = result.issues.map(toFetchValidationIssue);

  if (!result.snapshot) {
    issues.push({
      stage: "fetch",
      code: "snapshot-missing",
      severity: "error",
      path: "snapshot",
      message: "Live-fetch prototype did not produce a source snapshot.",
    });
  }

  if (!result.sourceValidation) {
    issues.push({
      stage: "source-validation",
      code: "source-validation-missing",
      severity: "error",
      path: "sourceValidation",
      message: "Live-fetch prototype did not run source DTO validation.",
    });
  } else {
    issues.push(...result.sourceValidation.issues.map((issue) => toValidationIssue("source-validation", issue)));
  }

  if (!result.catalog) {
    issues.push({
      stage: "generated-catalog-validation",
      code: "generated-catalog-missing",
      severity: "error",
      path: "catalog",
      message: "Live-fetch prototype did not produce a generated catalog.",
    });
  }

  if (!result.generatedCatalogValidation) {
    issues.push({
      stage: "generated-catalog-validation",
      code: "generated-catalog-validation-missing",
      severity: "error",
      path: "generatedCatalogValidation",
      message: "Live-fetch prototype did not run generated catalog validation.",
    });
  } else {
    issues.push(
      ...result.generatedCatalogValidation.issues.map((issue) =>
        toValidationIssue("generated-catalog-validation", issue),
      ),
    );
  }

  return {
    isValid: result.status === "complete" && issues.every((issue) => issue.severity !== "error"),
    result,
    issues,
  };
}
