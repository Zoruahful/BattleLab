import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import type { CatalogFetchExecutionStatus } from "../types/catalogFetchExecution";
import {
  createCatalogRuntimeAdapterReadModel,
  type CatalogRuntimeAdapterReadModel,
} from "./catalogRuntimeAdapterBoundary";
import type { CatalogLiveFetchPrototypeResult } from "./catalogLiveFetchPrototype";

export interface CatalogLiveFetchReadModelAdapterOptions {
  id?: string;
  planId?: string;
}

const liveFetchSourceId = "source-pokeapi-live-fetch-prototype";

const hasError = (issues: readonly { severity: string }[]) =>
  issues.some((issue) => issue.severity === "error");

const hasWarning = (issues: readonly { severity: string }[]) =>
  issues.some((issue) => issue.severity === "warning" || issue.severity === "info");

const toFetchIssue = (
  issue: {
    code: string;
    severity: "error" | "warning" | "info";
    message: string;
    path?: string;
  },
  fallbackPath: string,
): CatalogSourceFetchIssue => ({
  code: issue.code === "candidate-asset-review-required" ? "candidate-source-review-required" : "response-invalid",
  severity: issue.severity,
  sourceId: liveFetchSourceId,
  path: issue.path ?? fallbackPath,
  message: issue.message,
});

export const collectCatalogLiveFetchReadModelIssues = (
  result: CatalogLiveFetchPrototypeResult,
): CatalogSourceFetchIssue[] => [
  ...result.issues,
  ...(result.sourceValidation?.issues.map((issue) =>
    toFetchIssue(issue, "sourceValidation"),
  ) ?? []),
  ...(result.generatedCatalogValidation?.issues.map((issue) =>
    toFetchIssue(issue, "generatedCatalogValidation"),
  ) ?? []),
];

export const getCatalogLiveFetchReadModelStatus = (
  result: CatalogLiveFetchPrototypeResult,
  issues: readonly CatalogSourceFetchIssue[] = collectCatalogLiveFetchReadModelIssues(result),
): CatalogFetchExecutionStatus => {
  const sourceValidationHasErrors = hasError(result.sourceValidation?.issues ?? []);

  if (sourceValidationHasErrors || (!result.sourceValidation && result.status === "failed")) {
    return "blocked";
  }

  if (result.status === "failed" || hasError(issues)) {
    return "failed";
  }

  if (hasWarning(issues)) {
    return "complete-with-warnings";
  }

  return "complete";
};

export function createCatalogLiveFetchReadModel(
  result: CatalogLiveFetchPrototypeResult,
  options: CatalogLiveFetchReadModelAdapterOptions = {},
): CatalogRuntimeAdapterReadModel {
  const issues = collectCatalogLiveFetchReadModelIssues(result);
  const status = getCatalogLiveFetchReadModelStatus(result, issues);
  const warningCount = issues.filter((issue) => issue.severity === "warning" || issue.severity === "info").length;
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const baseReadModel = createCatalogRuntimeAdapterReadModel(undefined, status, issues);
  const hasIssues = warningCount > 0 || errorCount > 0;

  return {
    ...baseReadModel,
    id: options.id ?? `catalog-live-fetch-read-model-${result.status}`,
    planId: options.planId ?? baseReadModel.planId,
    message:
      status === "complete"
        ? "Live-fetch prototype result validated and mapped to the Catalog Update read model."
        : status === "complete-with-warnings"
          ? "Live-fetch prototype result mapped with warnings; generated catalog commit remains disabled."
          : "Live-fetch prototype result mapped to a safe failure state. Current trusted catalog remains in use.",
    progress: {
      ...baseReadModel.progress,
      issueCount: issues.length,
      warningCount,
      errorCount,
      message: hasIssues
        ? "Live-fetch result mapped with visible validation issues."
        : "Live-fetch result mapped without validation issues.",
    },
    safetyStatus: {
      ...baseReadModel.safetyStatus,
      safeToCommitCatalog: false,
      safeToWriteBundle: false,
      safeToUseSpriteAssetsInProduction: false,
      failureMode: errorCount > 0 ? "block-generated-catalog" : "keep-current-catalog",
      notes: [
        "Read model is suitable for future Catalog Update status display only.",
        "It does not authorize committing generated catalog data or writing .bl bundles.",
        "Live-fetch result mapping does not trigger UI execution or persistence.",
      ],
    },
    issues,
    notes: [
      ...baseReadModel.notes,
      "Live-fetch result adapter is data-only and UI-unwired.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
    ],
  };
}
