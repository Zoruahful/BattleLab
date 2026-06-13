import { generateCatalogFromPokeApiSnapshot } from "./catalogGeneratorPrototype";
import { samplePokeApiCatalogGeneratorSnapshot } from "./catalogGeneratorFixtures";
import {
  validateGeneratedPokeApiCatalogPrototype,
  type CatalogGeneratorPrototypeValidationIssue,
  type CatalogGeneratorPrototypeValidationResult,
} from "./catalogGeneratorPrototypeValidation";
import {
  sampleCatalogFetchFixtureValidation,
  type CatalogFetchFixtureValidationIssue,
  type CatalogFetchFixtureValidationResult,
} from "./catalogFetchFixtureValidation";
import { validateSampleGeneratedPokeApiCatalogBundle } from "./catalogGeneratedBundleFixture";
import {
  validatePokeApiSourceSnapshot,
  type PokeApiSourceValidationIssue,
  type PokeApiSourceValidationResult,
} from "./pokeApiSourceValidation";

export type CatalogValidationPipelineStage =
  | "fetch-fixture"
  | "source-snapshot"
  | "generated-catalog"
  | "bundle-fixture";

export type CatalogValidationPipelineSeverity = "error" | "warning";

export type CatalogValidationPipelineStageStatus = "valid" | "invalid" | "skipped";

export interface CatalogValidationPipelineIssue {
  code: string;
  severity: CatalogValidationPipelineSeverity;
  message: string;
  path: string;
  stage: CatalogValidationPipelineStage;
}

export interface CatalogValidationPipelineStageResult {
  stage: CatalogValidationPipelineStage;
  status: CatalogValidationPipelineStageStatus;
  skippedReason?: string;
  issueCount: number;
  errorCount: number;
  warningCount: number;
}

export interface CatalogValidationPipelineResult {
  isValid: boolean;
  stageResults: CatalogValidationPipelineStageResult[];
  issues: CatalogValidationPipelineIssue[];
  fetchFixtureValidation: CatalogFetchFixtureValidationResult;
  sourceSnapshotValidation: PokeApiSourceValidationResult;
  generatedCatalogValidation: CatalogGeneratorPrototypeValidationResult | null;
  bundleFixtureValidation: Awaited<ReturnType<typeof validateSampleGeneratedPokeApiCatalogBundle>> | null;
}

const hasErrors = (issues: Array<{ severity: CatalogValidationPipelineSeverity }>) =>
  issues.some((issue) => issue.severity === "error");

const toPipelineIssue = (
  stage: CatalogValidationPipelineStage,
  issue:
    | CatalogFetchFixtureValidationIssue
    | PokeApiSourceValidationIssue
    | CatalogGeneratorPrototypeValidationIssue
    | Awaited<ReturnType<typeof validateSampleGeneratedPokeApiCatalogBundle>>["issues"][number],
): CatalogValidationPipelineIssue => ({
  code: issue.code,
  severity: issue.severity,
  message: issue.message,
  path: issue.path,
  stage,
});

const createStageResult = (
  stage: CatalogValidationPipelineStage,
  issues: CatalogValidationPipelineIssue[],
  skippedReason?: string,
): CatalogValidationPipelineStageResult => {
  const stageIssues = issues.filter((issue) => issue.stage === stage);
  const errorCount = stageIssues.filter((issue) => issue.severity === "error").length;
  const warningCount = stageIssues.filter((issue) => issue.severity === "warning").length;

  return {
    stage,
    status: skippedReason ? "skipped" : errorCount > 0 ? "invalid" : "valid",
    ...(skippedReason ? { skippedReason } : {}),
    issueCount: stageIssues.length,
    errorCount,
    warningCount,
  };
};

export async function validateCatalogDataFoundationPipeline(): Promise<CatalogValidationPipelineResult> {
  const issues: CatalogValidationPipelineIssue[] = [
    ...sampleCatalogFetchFixtureValidation.issues.map((issue) => toPipelineIssue("fetch-fixture", issue)),
  ];

  const sourceSnapshotValidation = validatePokeApiSourceSnapshot(samplePokeApiCatalogGeneratorSnapshot);
  issues.push(...sourceSnapshotValidation.issues.map((issue) => toPipelineIssue("source-snapshot", issue)));

  let generatedCatalogValidation: CatalogGeneratorPrototypeValidationResult | null = null;
  let bundleFixtureValidation: CatalogValidationPipelineResult["bundleFixtureValidation"] = null;
  let generatedCatalogSkippedReason: string | undefined;
  let bundleFixtureSkippedReason: string | undefined;

  if (hasErrors(sourceSnapshotValidation.issues)) {
    generatedCatalogSkippedReason = "Skipped because source snapshot validation has error-severity issues.";
  } else {
    try {
      generatedCatalogValidation = validateGeneratedPokeApiCatalogPrototype(
        generateCatalogFromPokeApiSnapshot(samplePokeApiCatalogGeneratorSnapshot),
      );
      issues.push(
        ...generatedCatalogValidation.issues.map((issue) => toPipelineIssue("generated-catalog", issue)),
      );
    } catch (error) {
      issues.push({
        code: "generator-normalization-failed",
        severity: "error",
        path: "generateCatalogFromPokeApiSnapshot",
        stage: "generated-catalog",
        message: error instanceof Error ? error.message : "Catalog generation failed for the source snapshot.",
      });
    }
  }

  if (generatedCatalogSkippedReason) {
    bundleFixtureSkippedReason = "Skipped because generated catalog validation did not run.";
  } else if (hasErrors(issues.filter((issue) => issue.stage === "generated-catalog"))) {
    bundleFixtureSkippedReason = "Skipped because generated catalog validation has error-severity issues.";
  } else {
    bundleFixtureValidation = await validateSampleGeneratedPokeApiCatalogBundle();
    issues.push(...bundleFixtureValidation.issues.map((issue) => toPipelineIssue("bundle-fixture", issue)));
  }

  const stageResults: CatalogValidationPipelineStageResult[] = [
    createStageResult("fetch-fixture", issues),
    createStageResult("source-snapshot", issues),
    createStageResult("generated-catalog", issues, generatedCatalogSkippedReason),
    createStageResult("bundle-fixture", issues, bundleFixtureSkippedReason),
  ];

  return {
    isValid: !hasErrors(issues),
    stageResults,
    issues,
    fetchFixtureValidation: sampleCatalogFetchFixtureValidation,
    sourceSnapshotValidation,
    generatedCatalogValidation,
    bundleFixtureValidation,
  };
}
