import type {
  CatalogCacheReadModelBridgeProps,
  CatalogCacheReadModelBridgeStatus,
} from "./catalogCacheReadModelBridge";
import { sampleCatalogCacheReadModelBridgeProps } from "./catalogCacheReadModelBridge";
import type { CatalogGeneratedSnapshotAssetReviewStatus } from "./catalogGeneratedSnapshotComparison";
import type {
  CatalogRuntimeAdapterPhase,
  CatalogRuntimeAdapterReadModel,
} from "./catalogRuntimeAdapterBoundary";
import type {
  CatalogRuntimeOrchestratorPreview,
  CatalogRuntimeOrchestratorPreviewStateKey,
} from "./catalogRuntimeOrchestratorPreview";
import { sampleCatalogRuntimeOrchestratorPreview } from "./catalogRuntimeOrchestratorPreview";
import type {
  CatalogUpdateReadModelProps,
  CatalogUpdateReadModelSafetyProps,
  CatalogUpdateReadModelSectionKey,
} from "./catalogUpdateReadModelProps";
import { sampleCatalogUpdateReadModelProps } from "./catalogUpdateReadModelProps";

export interface CatalogFoundationRuntimeSummary {
  previewId: string;
  stateCount: number;
  states: {
    key: CatalogRuntimeOrchestratorPreviewStateKey;
    label: string;
    phase: CatalogRuntimeAdapterPhase;
    status: CatalogRuntimeAdapterReadModel["status"];
    progressPercent: number;
    warningCount: number;
    errorCount: number;
  }[];
}

export interface CatalogFoundationComparisonSummary {
  sectionCount: number;
  expectedTotalCount: number;
  actualTotalCount: number;
  countDeltaTotal: number;
  matchedKeyTotal: number;
  missingKeyTotal: number;
  addedKeyTotal: number;
  candidateAssetReviewStatus: CatalogGeneratedSnapshotAssetReviewStatus;
}

export interface CatalogFoundationCacheSummary {
  namespace: string;
  rowCount: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  warningTotal: number;
  errorTotal: number;
  validationHandoffVisible: boolean;
  statuses: Record<CatalogCacheReadModelBridgeStatus, number>;
}

export interface CatalogFoundationSectionStatusSummary {
  section: CatalogUpdateReadModelSectionKey;
  label: string;
  progressPercent: number;
  expectedCount: number;
  actualCount: number;
  countDelta: number;
  matchedKeyCount: number;
  missingKeyCount: number;
  addedKeyCount: number;
  warningCount: number;
  errorCount: number;
  candidateAssetReviewStatus: CatalogGeneratedSnapshotAssetReviewStatus;
  cacheWarningCount: number;
  cacheErrorCount: number;
}

export interface CatalogFoundationStatusReadModel {
  id: string;
  phase: CatalogRuntimeAdapterPhase;
  status: CatalogRuntimeAdapterReadModel["status"];
  statusLabel: string;
  message: string;
  progressPercent: number;
  runtime: CatalogFoundationRuntimeSummary;
  comparison: CatalogFoundationComparisonSummary;
  cache: CatalogFoundationCacheSummary;
  sections: CatalogFoundationSectionStatusSummary[];
  warningCount: number;
  errorCount: number;
  validationHandoffVisible: boolean;
  safety: CatalogUpdateReadModelSafetyProps;
  boundaryNotes: string[];
}

const emptyCacheStatusCounts: Record<CatalogCacheReadModelBridgeStatus, number> = {
  ready: 0,
  warning: 0,
  blocked: 0,
};

const summarizeRuntime = (
  orchestratorPreview: CatalogRuntimeOrchestratorPreview,
): CatalogFoundationRuntimeSummary => ({
  previewId: orchestratorPreview.id,
  stateCount: orchestratorPreview.states.length,
  states: orchestratorPreview.states.map((state) => ({
    key: state.key,
    label: state.label,
    phase: state.readModel.phase,
    status: state.readModel.status,
    progressPercent: state.readModel.progress.progressPercent,
    warningCount: state.readModel.progress.warningCount,
    errorCount: state.readModel.progress.errorCount,
  })),
});

const summarizeComparison = (
  readModelProps: CatalogUpdateReadModelProps,
): CatalogFoundationComparisonSummary => {
  const candidateAssetReviewStatus = readModelProps.sections.find(
    (section) => section.section === "assets",
  )?.candidateAssetReviewStatus ?? "not-applicable";

  return {
    sectionCount: readModelProps.sections.length,
    expectedTotalCount: readModelProps.sections.reduce((total, section) => total + section.expectedCount, 0),
    actualTotalCount: readModelProps.sections.reduce((total, section) => total + section.actualCount, 0),
    countDeltaTotal: readModelProps.sections.reduce((total, section) => total + section.countDelta, 0),
    matchedKeyTotal: readModelProps.sections.reduce((total, section) => total + section.matchedKeyCount, 0),
    missingKeyTotal: readModelProps.sections.reduce((total, section) => total + section.missingKeyCount, 0),
    addedKeyTotal: readModelProps.sections.reduce((total, section) => total + section.addedKeyCount, 0),
    candidateAssetReviewStatus,
  };
};

const summarizeCache = (
  cacheBridgeProps: CatalogCacheReadModelBridgeProps,
): CatalogFoundationCacheSummary => {
  const statuses = cacheBridgeProps.rows.reduce(
    (counts, row) => ({
      ...counts,
      [row.status]: counts[row.status] + 1,
    }),
    { ...emptyCacheStatusCounts },
  );

  return {
    namespace: cacheBridgeProps.namespace,
    rowCount: cacheBridgeProps.rowCount,
    readyCount: statuses.ready,
    warningCount: statuses.warning,
    blockedCount: statuses.blocked,
    warningTotal: cacheBridgeProps.warningCount,
    errorTotal: cacheBridgeProps.errorCount,
    validationHandoffVisible: cacheBridgeProps.rows.every(
      (row) =>
        row.validationState.sourceValidationRequired &&
        row.validationState.generatedCatalogValidationRequired &&
        row.validationState.bundleHashValidationRequired,
    ),
    statuses,
  };
};

const createSectionSummaries = (
  readModelProps: CatalogUpdateReadModelProps,
  cacheBridgeProps: CatalogCacheReadModelBridgeProps,
): CatalogFoundationSectionStatusSummary[] => {
  const cacheWarningCount = cacheBridgeProps.rows.reduce((total, row) => total + row.warningCount, 0);
  const cacheErrorCount = cacheBridgeProps.rows.reduce((total, row) => total + row.errorCount, 0);

  return readModelProps.sections.map((section) => ({
    section: section.section,
    label: section.label,
    progressPercent: section.progressPercent,
    expectedCount: section.expectedCount,
    actualCount: section.actualCount,
    countDelta: section.countDelta,
    matchedKeyCount: section.matchedKeyCount,
    missingKeyCount: section.missingKeyCount,
    addedKeyCount: section.addedKeyCount,
    warningCount: section.warningCount,
    errorCount: section.errorCount,
    candidateAssetReviewStatus: section.candidateAssetReviewStatus,
    cacheWarningCount: section.section === "assets" ? cacheWarningCount : 0,
    cacheErrorCount: section.section === "assets" ? cacheErrorCount : 0,
  }));
};

export function createCatalogFoundationStatusReadModel(
  readModelProps: CatalogUpdateReadModelProps = sampleCatalogUpdateReadModelProps,
  cacheBridgeProps: CatalogCacheReadModelBridgeProps = sampleCatalogCacheReadModelBridgeProps,
  orchestratorPreview: CatalogRuntimeOrchestratorPreview = sampleCatalogRuntimeOrchestratorPreview,
): CatalogFoundationStatusReadModel {
  const runtime = summarizeRuntime(orchestratorPreview);
  const comparison = summarizeComparison(readModelProps);
  const cache = summarizeCache(cacheBridgeProps);
  const sections = createSectionSummaries(readModelProps, cacheBridgeProps);

  return {
    id: "catalog-foundation-status-read-model-preview",
    phase: readModelProps.phase,
    status: readModelProps.status,
    statusLabel: readModelProps.statusLabel,
    message: "Catalog Foundation status read-model aggregates preview-only runtime, comparison, and cache data.",
    progressPercent: readModelProps.progressPercent,
    runtime,
    comparison,
    cache,
    sections,
    warningCount:
      readModelProps.warningCount +
      cacheBridgeProps.warningCount +
      runtime.states.reduce((total, state) => total + state.warningCount, 0),
    errorCount:
      readModelProps.errorCount +
      cacheBridgeProps.errorCount +
      runtime.states.reduce((total, state) => total + state.errorCount, 0),
    validationHandoffVisible: cache.validationHandoffVisible,
    safety: readModelProps.safety,
    boundaryNotes: [
      "Catalog Foundation status read-model is serializable, React-free, data-only, and UI-unwired.",
      "Aggregate combines runtime preview, generated snapshot comparison, and cache bridge props.",
      "Aggregate does not import React or wire CatalogUpdatePanel.",
      "Aggregate does not trigger UI execution or call runCatalogLiveFetchPrototype().",
      "Aggregate does not write .bl files, implement loader behavior, or perform cache file IO.",
      "No localStorage, IndexedDB, SQLite, Electron, filesystem paths, backend storage, durable persistence, PDF, Theater decoding, report generation, production sprite rendering, finalized sprite licensing, or simulation work is implemented.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
    ],
  };
}

export const sampleCatalogFoundationStatusReadModel =
  createCatalogFoundationStatusReadModel();
