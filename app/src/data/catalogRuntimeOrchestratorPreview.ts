import type { CatalogSourceFetchIssue } from "../types/catalogFetch";
import type { CatalogFetchExecutionStatus } from "../types/catalogFetchExecution";
import type { CatalogRuntimeAdapterReadModel } from "./catalogRuntimeAdapterBoundary";
import { createCatalogRuntimeAdapterReadModel } from "./catalogRuntimeAdapterBoundary";
import type { CatalogLiveFetchPrototypeResult } from "./catalogLiveFetchPrototype";
import { createCatalogLiveFetchReadModel } from "./catalogLiveFetchReadModelAdapter";

export type CatalogRuntimeOrchestratorPreviewStateKey =
  | "planned"
  | "fetching"
  | "validatingSource"
  | "complete"
  | "completeWithWarnings"
  | "blocked"
  | "failed"
  | "cancelled";

export interface CatalogRuntimeOrchestratorPreviewState {
  key: CatalogRuntimeOrchestratorPreviewStateKey;
  label: string;
  readModel: CatalogRuntimeAdapterReadModel;
  notes: string[];
}

export interface CatalogRuntimeOrchestratorPreview {
  id: string;
  description: string;
  states: readonly CatalogRuntimeOrchestratorPreviewState[];
  notes: string[];
}

const fixtureTimestamp = "2026-06-14T19:00:00.000Z";
const liveFetchSourceId = "source-pokeapi-live-fetch-prototype";
const targetSections = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
] as const;

const createIssue = (
  code: CatalogSourceFetchIssue["code"],
  severity: CatalogSourceFetchIssue["severity"],
  message: string,
  path?: string,
): CatalogSourceFetchIssue => ({
  code,
  severity,
  sourceId: liveFetchSourceId,
  ...(path ? { path } : {}),
  message,
});

const createLiveFetchResult = (
  id: string,
  overrides: Partial<CatalogLiveFetchPrototypeResult> = {},
): CatalogLiveFetchPrototypeResult => ({
  status: "complete",
  coverageMode: "active-sample",
  fetchedAt: fixtureTimestamp,
  sourceVersion: `catalog-runtime-orchestrator-preview-${id}`,
  targetSections: [...targetSections],
  progress: [
    {
      status: "complete",
      completedRequests: 100,
      totalRequests: 100,
      progressPercent: 100,
      message: "Static live-fetch result fixture for runtime orchestrator preview.",
    },
  ],
  snapshot: null,
  sourceValidation: {
    isValid: true,
    issues: [],
  },
  catalog: null,
  generatedCatalogValidation: {
    isValid: true,
    issues: [],
  },
  issues: [],
  notes: [
    "PokeAPI live-fetch prototype is enrichment-only.",
    "Pokemon Showdown remains the legality and simulation source of truth.",
    "Sprite metadata is candidate/review-gated only.",
  ],
  ...overrides,
});

const previewWarningIssue = createIssue(
  "candidate-source-review-required",
  "warning",
  "Sprite metadata remains candidate/review-gated only.",
  "assets.animatedSpriteKey",
);

const previewFetchIssue = createIssue(
  "source-unavailable",
  "error",
  "PokeAPI source unavailable in orchestrator preview failure fixture.",
);

export const sampleCatalogRuntimeOrchestratorPreviewLiveFetchResults = {
  complete: createLiveFetchResult("complete"),
  completeWithWarnings: createLiveFetchResult("complete-with-warnings", {
    issues: [previewWarningIssue],
  }),
  failed: createLiveFetchResult("failed", {
    status: "failed",
    issues: [previewFetchIssue],
  }),
  blocked: createLiveFetchResult("blocked", {
    status: "failed",
    catalog: null,
    generatedCatalogValidation: null,
    sourceValidation: {
      isValid: false,
      issues: [
        {
          code: "missing-english-text",
          severity: "error",
          path: "moves.0.flavor_text_entries",
          message: "Move source record is missing English flavor text.",
        },
      ],
    },
  }),
} as const;

const withPreviewMessage = (
  readModel: CatalogRuntimeAdapterReadModel,
  key: CatalogRuntimeOrchestratorPreviewStateKey,
  message: string,
): CatalogRuntimeAdapterReadModel => ({
  ...readModel,
  id: `catalog-runtime-orchestrator-preview-${key}`,
  message,
  notes: [
    ...readModel.notes,
    "Runtime orchestrator preview is static, in-memory, data-only, and UI-unwired.",
    "This preview does not call runCatalogLiveFetchPrototype().",
  ],
});

export const createCatalogRuntimeOrchestratorPreviewReadModel = (
  key: CatalogRuntimeOrchestratorPreviewStateKey,
  status: CatalogFetchExecutionStatus,
  message: string,
  issues: CatalogSourceFetchIssue[] = [],
) => withPreviewMessage(createCatalogRuntimeAdapterReadModel(undefined, status, issues), key, message);

export const sampleCatalogRuntimeOrchestratorPreviewStates: readonly CatalogRuntimeOrchestratorPreviewState[] = [
  {
    key: "planned",
    label: "Catalog update planned",
    readModel: createCatalogRuntimeOrchestratorPreviewReadModel(
      "planned",
      "planned",
      "Catalog runtime orchestrator preview is ready and idle.",
    ),
    notes: ["Preview-only planned state; no live fetch is triggered."],
  },
  {
    key: "fetching",
    label: "Fetching enrichment data",
    readModel: createCatalogRuntimeOrchestratorPreviewReadModel(
      "fetching",
      "fetching",
      "Catalog runtime orchestrator preview is fetching enrichment data.",
    ),
    notes: ["Preview-only fetching state; this does not execute network requests."],
  },
  {
    key: "validatingSource",
    label: "Validating source snapshot",
    readModel: createCatalogRuntimeOrchestratorPreviewReadModel(
      "validatingSource",
      "validating-source",
      "Catalog runtime orchestrator preview is validating source DTO data.",
    ),
    notes: ["Preview-only source validation state."],
  },
  {
    key: "complete",
    label: "Catalog data validated",
    readModel: withPreviewMessage(
      createCatalogLiveFetchReadModel(sampleCatalogRuntimeOrchestratorPreviewLiveFetchResults.complete),
      "complete",
      "Catalog runtime orchestrator preview completed successfully.",
    ),
    notes: ["Successful live-fetch result mapped into a read model without authorizing commit."],
  },
  {
    key: "completeWithWarnings",
    label: "Catalog data validated with warnings",
    readModel: withPreviewMessage(
      createCatalogLiveFetchReadModel(sampleCatalogRuntimeOrchestratorPreviewLiveFetchResults.completeWithWarnings),
      "completeWithWarnings",
      "Catalog runtime orchestrator preview completed with warning-only issues.",
    ),
    notes: ["Warning-bearing live-fetch result remains visible and non-failing."],
  },
  {
    key: "blocked",
    label: "Catalog update blocked",
    readModel: withPreviewMessage(
      createCatalogLiveFetchReadModel(sampleCatalogRuntimeOrchestratorPreviewLiveFetchResults.blocked),
      "blocked",
      "Catalog runtime orchestrator preview blocked generated catalog handoff.",
    ),
    notes: ["Source validation error blocks normalization and generated catalog handoff."],
  },
  {
    key: "failed",
    label: "Catalog update failed safely",
    readModel: withPreviewMessage(
      createCatalogLiveFetchReadModel(sampleCatalogRuntimeOrchestratorPreviewLiveFetchResults.failed),
      "failed",
      "Catalog runtime orchestrator preview failed safely.",
    ),
    notes: ["Failure keeps the current trusted catalog in use."],
  },
  {
    key: "cancelled",
    label: "Catalog update cancelled",
    readModel: createCatalogRuntimeOrchestratorPreviewReadModel(
      "cancelled",
      "cancelled",
      "Catalog runtime orchestrator preview was cancelled without committing catalog data.",
    ),
    notes: ["Cancellation is modeled without runtime execution or file writes."],
  },
] as const;

export const sampleCatalogRuntimeOrchestratorPreview: CatalogRuntimeOrchestratorPreview = {
  id: "catalog-runtime-orchestrator-preview",
  description: "Static in-memory read-model states for future Catalog Update consumption.",
  states: sampleCatalogRuntimeOrchestratorPreviewStates,
  notes: [
    "Preview is data-only and does not wire CatalogUpdatePanel.",
    "Preview does not call runCatalogLiveFetchPrototype().",
    "PokeAPI/catalog data remains enrichment-only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
    "Sprite metadata remains candidate/review-gated only.",
    "No .bl writing, cache file IO, backend, Electron, SQLite, PDF, persistence, or simulation work is implemented.",
  ],
};
