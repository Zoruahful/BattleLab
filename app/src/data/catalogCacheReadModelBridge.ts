import type {
  CatalogCacheContractFixture,
  CatalogCacheEntryKind,
  CatalogCacheEntryMetadata,
  CatalogCacheFreshnessStatus,
  CatalogCacheTrustLevel,
} from "./catalogCacheContracts";
import { sampleCatalogCacheContractFixture } from "./catalogCacheContracts";
import type { CatalogSourceCacheStatus } from "../types/catalogFetch";
import type {
  CatalogFetchExecutionCacheHandoff,
  CatalogFetchExecutionValidationHandoff,
} from "../types/catalogFetchExecution";
import type { CatalogUpdateReadModelSafetyProps } from "./catalogUpdateReadModelProps";
import { sampleCatalogUpdateReadModelProps } from "./catalogUpdateReadModelProps";

export type CatalogCacheReadModelBridgeStatus =
  | "ready"
  | "warning"
  | "blocked";

export interface CatalogCacheReadModelBridgeValidationState {
  sourceValidationRequired: boolean;
  generatedCatalogValidationRequired: boolean;
  bundleHashValidationRequired: boolean;
  sourceErrorsBlockGeneratedCatalog: boolean;
  generatedCatalogErrorsBlockBundle: boolean;
  warningRequired: boolean;
}

export interface CatalogCacheReadModelBridgeRow {
  id: string;
  logicalKey: string;
  entryKind: CatalogCacheEntryKind;
  sourceId: string;
  freshnessStatus: CatalogCacheFreshnessStatus;
  cacheStatus: CatalogSourceCacheStatus;
  trustLevel: CatalogCacheTrustLevel;
  fallbackEligible: boolean;
  warningCount: number;
  errorCount: number;
  status: CatalogCacheReadModelBridgeStatus;
  statusLabel: string;
  cacheHandoffState?: CatalogFetchExecutionCacheHandoff["status"];
  validationHandoffState?: NonNullable<CatalogFetchExecutionValidationHandoff["validationResult"]>["status"];
  validationState: CatalogCacheReadModelBridgeValidationState;
  safety: CatalogUpdateReadModelSafetyProps;
  notes: string[];
}

export interface CatalogCacheReadModelBridgeProps {
  id: string;
  namespace: string;
  version: CatalogCacheContractFixture["namespacePolicy"]["version"];
  rowCount: number;
  warningCount: number;
  errorCount: number;
  rows: CatalogCacheReadModelBridgeRow[];
  safety: CatalogUpdateReadModelSafetyProps;
  boundaryNotes: string[];
}

const statusLabelByBridgeStatus: Record<CatalogCacheReadModelBridgeStatus, string> = {
  ready: "Cache metadata ready",
  warning: "Cache metadata needs review",
  blocked: "Cache metadata blocked",
};

const getBridgeStatus = (entry: CatalogCacheEntryMetadata): CatalogCacheReadModelBridgeStatus => {
  if (
    entry.freshnessStatus === "expired" ||
    entry.freshnessStatus === "invalid" ||
    !entry.canUseForOfflineFallback
  ) {
    return "blocked";
  }

  if (entry.warningRequired || entry.freshnessStatus === "stale") {
    return "warning";
  }

  return "ready";
};

const getWarningCount = (entry: CatalogCacheEntryMetadata) =>
  Number(entry.warningRequired) +
  Number(entry.freshnessStatus === "stale") +
  Number(entry.cacheHandoff?.status === "using-cache" || entry.cacheHandoff?.status === "rate-limited") +
  (entry.validationHandoff?.validationResult?.warnings.length ?? 0);

const getErrorCount = (entry: CatalogCacheEntryMetadata) =>
  Number(entry.freshnessStatus === "expired") +
  Number(entry.freshnessStatus === "invalid") +
  (entry.validationHandoff?.validationResult?.sections.reduce(
    (total, section) => total + section.errorCount,
    0,
  ) ?? 0);

const toBridgeRow = (
  entry: CatalogCacheEntryMetadata,
  fixture: CatalogCacheContractFixture,
): CatalogCacheReadModelBridgeRow => {
  const status = getBridgeStatus(entry);

  return {
    id: entry.id,
    logicalKey: entry.logicalKey,
    entryKind: entry.kind,
    sourceId: entry.sourceId,
    freshnessStatus: entry.freshnessStatus,
    cacheStatus: entry.cacheStatus,
    trustLevel: entry.trustLevel,
    fallbackEligible: entry.canUseForOfflineFallback,
    warningCount: getWarningCount(entry),
    errorCount: getErrorCount(entry),
    status,
    statusLabel: statusLabelByBridgeStatus[status],
    cacheHandoffState: entry.cacheHandoff?.status,
    validationHandoffState: entry.validationHandoff?.validationResult?.status,
    validationState: {
      sourceValidationRequired: fixture.validationRequirements.sourceValidationRequired,
      generatedCatalogValidationRequired: fixture.validationRequirements.generatedCatalogValidationRequired,
      bundleHashValidationRequired: fixture.validationRequirements.bundleHashValidationRequired,
      sourceErrorsBlockGeneratedCatalog:
        fixture.validationRequirements.sourceErrorsBlockGeneratedCatalog,
      generatedCatalogErrorsBlockBundle:
        fixture.validationRequirements.generatedCatalogErrorsBlockBundle,
      warningRequired: entry.warningRequired,
    },
    safety: sampleCatalogUpdateReadModelProps.safety,
    notes: [
      ...entry.notes,
      "Cache read-model bridge props are serializable, data-only, and UI-unwired.",
    ],
  };
};

export function createCatalogCacheReadModelBridgeProps(
  fixture: CatalogCacheContractFixture = sampleCatalogCacheContractFixture,
): CatalogCacheReadModelBridgeProps {
  const rows = fixture.entries.map((entry) => toBridgeRow(entry, fixture));

  return {
    id: "catalog-cache-read-model-bridge-preview",
    namespace: fixture.namespacePolicy.namespace,
    version: fixture.namespacePolicy.version,
    rowCount: rows.length,
    warningCount: rows.reduce((total, row) => total + row.warningCount, 0),
    errorCount: rows.reduce((total, row) => total + row.errorCount, 0),
    rows,
    safety: sampleCatalogUpdateReadModelProps.safety,
    boundaryNotes: [
      "Catalog cache read-model bridge props are serializable and data-only.",
      "Props do not import React or wire CatalogUpdatePanel.",
      "Props do not call runCatalogLiveFetchPrototype().",
      "Props do not write .bl files or implement loader behavior.",
      "No cache file IO, localStorage, IndexedDB, SQLite, Electron, filesystem paths, backend storage, durable persistence, or UI-triggered execution is implemented.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
    ],
  };
}

export const sampleCatalogCacheReadModelBridgeProps =
  createCatalogCacheReadModelBridgeProps();
