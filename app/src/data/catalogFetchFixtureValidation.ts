import type { BattleLabCatalogBundleSectionName } from "../types/catalogBundle";
import type {
  CatalogFetchNormalizationHandoff,
  CatalogSourceFetchRequest,
  CatalogSourceFetchResponse,
} from "../types/catalogFetch";
import type { PokeApiCatalogGeneratorSnapshot } from "./catalogGeneratorFixtures";
import {
  sampleCatalogFetchNormalizationHandoff,
  sampleCatalogFetchSectionNames,
  sampleCatalogSourceFetchRequest,
  sampleCatalogSourceFetchResponses,
} from "./catalogFetchFixtures";

export type CatalogFetchFixtureValidationSeverity = "error" | "warning";

export type CatalogFetchFixtureValidationCode =
  | "authority-boundary-missing"
  | "cache-policy-missing"
  | "fetch-response-request-mismatch"
  | "handoff-section-mismatch"
  | "rate-limit-state-incomplete"
  | "retry-policy-implies-execution"
  | "section-mismatch"
  | "snapshot-source-mismatch"
  | "source-role-invalid"
  | "sprite-review-gate-missing";

export interface CatalogFetchFixtureValidationIssue {
  code: CatalogFetchFixtureValidationCode;
  severity: CatalogFetchFixtureValidationSeverity;
  message: string;
  path: string;
}

export interface CatalogFetchFixtureValidationResult {
  isValid: boolean;
  issues: CatalogFetchFixtureValidationIssue[];
}

const addIssue = (
  issues: CatalogFetchFixtureValidationIssue[],
  issue: CatalogFetchFixtureValidationIssue,
) => {
  issues.push(issue);
};

const sameSections = (
  left: BattleLabCatalogBundleSectionName[],
  right: BattleLabCatalogBundleSectionName[],
) => left.length === right.length && left.every((section) => right.includes(section));

const validateSectionAlignment = (
  issues: CatalogFetchFixtureValidationIssue[],
  request: CatalogSourceFetchRequest,
  response: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot>,
  responseIndex: number,
) => {
  if (response.sourceSnapshot && !sameSections(request.targetSections, response.sourceSnapshot.metadata.targetSections)) {
    addIssue(issues, {
      code: "section-mismatch",
      severity: "error",
      path: `responses.${responseIndex}.sourceSnapshot.metadata.targetSections`,
      message: "Fetch response snapshot sections must match the request target sections.",
    });
  }

  if (response.pipelineSnapshot && response.sourceSnapshot) {
    const snapshotSections = response.sourceSnapshot.metadata.targetSections;

    if (!sameSections(request.targetSections, snapshotSections)) {
      addIssue(issues, {
        code: "section-mismatch",
        severity: "error",
        path: `responses.${responseIndex}.pipelineSnapshot`,
        message: "Pipeline snapshot handoff must represent the same target sections as the fetch request.",
      });
    }
  }
};

const validateSourceAlignment = (
  issues: CatalogFetchFixtureValidationIssue[],
  request: CatalogSourceFetchRequest,
  response: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot>,
  responseIndex: number,
) => {
  if (response.requestId !== request.id) {
    addIssue(issues, {
      code: "fetch-response-request-mismatch",
      severity: "error",
      path: `responses.${responseIndex}.requestId`,
      message: "Fetch response requestId must match the sample fetch request.",
    });
  }

  if (response.sourceSnapshot?.metadata.sourceId !== undefined &&
    response.sourceSnapshot.metadata.sourceId !== request.source.sourceId) {
    addIssue(issues, {
      code: "snapshot-source-mismatch",
      severity: "error",
      path: `responses.${responseIndex}.sourceSnapshot.metadata.sourceId`,
      message: "Fetch response snapshot sourceId must match the request source.",
    });
  }

  if (response.pipelineSnapshot?.sourceId !== undefined && response.pipelineSnapshot.sourceId !== request.source.sourceId) {
    addIssue(issues, {
      code: "snapshot-source-mismatch",
      severity: "error",
      path: `responses.${responseIndex}.pipelineSnapshot.sourceId`,
      message: "Pipeline snapshot sourceId must match the request source.",
    });
  }
};

const validateRetryAndRateLimitState = (
  issues: CatalogFetchFixtureValidationIssue[],
  response: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot>,
  responseIndex: number,
) => {
  if (response.retryPolicy.attempt > response.retryPolicy.maxAttempts) {
    addIssue(issues, {
      code: "retry-policy-implies-execution",
      severity: "error",
      path: `responses.${responseIndex}.retryPolicy`,
      message: "Retry policy attempt cannot exceed maxAttempts in planning fixtures.",
    });
  }

  if (response.status === "rate-limited" && (!response.rateLimitStatus?.isLimited || !response.rateLimitStatus.retryAfterMs)) {
    addIssue(issues, {
      code: "rate-limit-state-incomplete",
      severity: "error",
      path: `responses.${responseIndex}.rateLimitStatus`,
      message: "Rate-limited fixture responses must include limited state and retry timing.",
    });
  }
};

const validateHandoff = (
  issues: CatalogFetchFixtureValidationIssue[],
  handoff: CatalogFetchNormalizationHandoff<PokeApiCatalogGeneratorSnapshot>,
  request: CatalogSourceFetchRequest,
) => {
  if (!sameSections(handoff.generationRequest.sectionNames, request.targetSections)) {
    addIssue(issues, {
      code: "handoff-section-mismatch",
      severity: "error",
      path: "handoff.generationRequest.sectionNames",
      message: "Normalization handoff sections must match fetch request target sections.",
    });
  }

  const handoffSourceIds = new Set(handoff.sourceSnapshots.map((snapshot) => snapshot.sourceId));
  const generationSourceIds = new Set(handoff.generationRequest.sourceSnapshots.map((snapshot) => snapshot.sourceId));

  if (!handoffSourceIds.has(request.source.sourceId) || !generationSourceIds.has(request.source.sourceId)) {
    addIssue(issues, {
      code: "snapshot-source-mismatch",
      severity: "error",
      path: "handoff.sourceSnapshots",
      message: "Normalization handoff must carry the PokeAPI source snapshot into the pipeline request.",
    });
  }

  const notes = [
    ...(handoff.notes ?? []),
    ...(handoff.generationRequest.notes ?? []),
    ...(request.notes ?? []),
  ].join(" ");

  if (!notes.includes("PokeAPI remains enrichment-only")) {
    addIssue(issues, {
      code: "authority-boundary-missing",
      severity: "error",
      path: "handoff.notes",
      message: "Fixture notes must keep PokeAPI explicitly enrichment-only.",
    });
  }

  if (!notes.includes("Pokemon Showdown remains legality and simulation source of truth")) {
    addIssue(issues, {
      code: "authority-boundary-missing",
      severity: "error",
      path: "handoff.notes",
      message: "Fixture notes must keep Pokemon Showdown as legality and simulation authority.",
    });
  }
};

export function validateCatalogFetchFixtureExamples(
  request: CatalogSourceFetchRequest = sampleCatalogSourceFetchRequest,
  responses: CatalogSourceFetchResponse<PokeApiCatalogGeneratorSnapshot>[] = sampleCatalogSourceFetchResponses,
  handoff: CatalogFetchNormalizationHandoff<PokeApiCatalogGeneratorSnapshot> =
    sampleCatalogFetchNormalizationHandoff,
): CatalogFetchFixtureValidationResult {
  const issues: CatalogFetchFixtureValidationIssue[] = [];

  if (request.source.kind !== "pokeapi" || request.role !== "enrichment") {
    addIssue(issues, {
      code: "source-role-invalid",
      severity: "error",
      path: "request.source",
      message: "The live-fetch planning fixture must keep PokeAPI as enrichment only.",
    });
  }

  if (!sameSections(request.targetSections, sampleCatalogFetchSectionNames)) {
    addIssue(issues, {
      code: "section-mismatch",
      severity: "error",
      path: "request.targetSections",
      message: "Fetch request must target every catalog section represented by the sample fixtures.",
    });
  }

  if (
    !request.cachePolicy.enabled ||
    !request.cachePolicy.cacheKey ||
    request.cachePolicy.offlineFallback === "none"
  ) {
    addIssue(issues, {
      code: "cache-policy-missing",
      severity: "error",
      path: "request.cachePolicy",
      message: "Fetch fixture must keep cache policy and offline fallback explicit.",
    });
  }

  responses.forEach((response, index) => {
    validateSourceAlignment(issues, request, response, index);
    validateSectionAlignment(issues, request, response, index);
    validateRetryAndRateLimitState(issues, response, index);
  });

  const blockedAssetResponse = responses.find((response) => response.status === "blocked");
  const hasReviewGate = blockedAssetResponse?.issues.some(
    (issue) => issue.code === "candidate-source-review-required" && issue.severity === "warning",
  );

  if (!hasReviewGate) {
    addIssue(issues, {
      code: "sprite-review-gate-missing",
      severity: "error",
      path: "responses",
      message: "Blocked sprite candidate fixture must remain license-review gated.",
    });
  }

  validateHandoff(issues, handoff, request);

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export const sampleCatalogFetchFixtureValidation = validateCatalogFetchFixtureExamples();
