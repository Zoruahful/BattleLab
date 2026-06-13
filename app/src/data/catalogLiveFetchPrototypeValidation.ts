import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import {
  runCatalogLiveFetchPrototype,
  type CatalogLiveFetchPrototypeResult,
} from "./catalogLiveFetchPrototype";

export type CatalogLiveFetchPrototypeValidationStage =
  | "fetch"
  | "source-validation"
  | "generated-catalog-validation";

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
