import type {
  BattleLabCatalog,
  CatalogAssetMetadata,
  CatalogManifest,
  CatalogSourceMetadata,
} from "./catalog";
import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleManifest,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleSourceVersion,
} from "./catalogBundle";
import type { PokeApiCatalogSourceSnapshot } from "./pokeApiSource";

export type CatalogStorageContractVersion = "phase3-catalog-storage-v1";

export type CatalogStorageSchemaVersion = "battlelab-catalog-storage-schema-v1";

export type CatalogStorageAdapterKind =
  | "electron-documents-file-storage"
  | "browser-indexeddb-current"
  | "future-packaged-app-local-store"
  | "future-readonly-bundle-store";

export type CatalogStorageRecordKind =
  | "generated-catalog"
  | "source-snapshot"
  | "section-metadata"
  | "section-payload"
  | "asset-metadata"
  | "bundle-manifest";

export type CatalogStorageSourceSectionId =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures";

export type CatalogStorageHealthStatus =
  | "healthy"
  | "stale"
  | "migration-required"
  | "malformed"
  | "unavailable"
  | "blocked";

export type CatalogStorageMigrationStatus =
  | "not-needed"
  | "planned"
  | "running"
  | "complete"
  | "failed"
  | "blocked";

export type CatalogStorageSafeFallbackStatus =
  | "use-current-cache"
  | "use-bundled-seed"
  | "use-readonly-bundle"
  | "block-and-keep-current"
  | "unavailable";

export interface CatalogStorageSourceSignature {
  sourceId: string;
  sourceKind: CatalogSourceMetadata["kind"];
  sourceVersion?: string;
  sourceBaseUrl?: string;
  fetchedAt?: string;
  listSignature?: string;
  section?: CatalogStorageSourceSectionId;
  expectedRecordCount?: number;
}

export interface CatalogStorageSectionManifest {
  section: BattleLabCatalogBundleSectionName;
  recordKind: CatalogStorageRecordKind;
  schemaVersion: CatalogStorageSchemaVersion;
  sourceSignature?: CatalogStorageSourceSignature;
  recordCount: number;
  generatedAt?: string;
  fetchedAt?: string;
  staleAfter?: string;
  hash?: string;
  notes: string[];
}

export interface CatalogStorageGeneratedCatalogEntry {
  id: "latest" | string;
  schemaVersion: CatalogStorageSchemaVersion;
  catalogVersion: string;
  catalog: BattleLabCatalog;
  manifest: CatalogManifest;
  sourceVersions: BattleLabCatalogBundleSourceVersion[];
  generatedAt: string;
  validatedAt?: string;
  sectionManifests: CatalogStorageSectionManifest[];
  readOnly: true;
}

export interface CatalogStorageSourceSnapshotEntry {
  id: string;
  schemaVersion: CatalogStorageSchemaVersion;
  source: CatalogStorageSourceSignature;
  snapshot: PokeApiCatalogSourceSnapshot;
  fetchedAt: string;
  validatedAt?: string;
  staleAfter?: string;
  readOnly: true;
}

export interface CatalogStorageAssetMetadataEntry {
  id: string;
  schemaVersion: CatalogStorageSchemaVersion;
  assets: CatalogAssetMetadata[];
  candidateSpriteUrlsAllowedForReview: true;
  productionSpriteUseApproved: false;
  fetchedAt?: string;
  reviewedAt?: string;
  notes: string[];
}

export interface CatalogStorageBundleHandoff {
  direction: "import-readonly" | "export-future";
  bundle?: BattleLabCatalogBundle;
  manifest?: BattleLabCatalogBundleManifest;
  readOnlyRequired: true;
  catalogOnlyRequired: true;
  excludesUserTeams: true;
  excludesSettings: true;
  excludesReports: true;
  excludesSaves: true;
  excludesRuntimeOutput: true;
  bundleWritingImplemented: false;
  notes: string[];
}

export interface CatalogStorageManifest {
  id: string;
  contractVersion: CatalogStorageContractVersion;
  schemaVersion: CatalogStorageSchemaVersion;
  catalogVersion: string;
  generatedAt: string;
  adapterKind: CatalogStorageAdapterKind;
  sources: CatalogSourceMetadata[];
  sectionManifests: CatalogStorageSectionManifest[];
  recordKinds: CatalogStorageRecordKind[];
  userDataBoundary: {
    excludesUserTeams: true;
    excludesSettings: true;
    excludesReports: true;
    excludesSaves: true;
    excludesRuntimeOutput: true;
    excludesSimulationResults: true;
  };
  assetPolicy: {
    candidateSpriteUrlsAllowedForReview: true;
    productionSpriteUseApproved: false;
    finalizedSpriteLicensingApproved: false;
  };
}

export interface CatalogStorageMigrationPlan {
  id: string;
  fromSchemaVersion: string;
  toSchemaVersion: CatalogStorageSchemaVersion;
  status: CatalogStorageMigrationStatus;
  destructive: false;
  preserveCurrentCatalogUntilSuccess: true;
  malformedCacheBehavior: Extract<CatalogStorageSafeFallbackStatus, "block-and-keep-current" | "use-bundled-seed">;
  steps: Array<{
    id: string;
    label: string;
    recordKinds: CatalogStorageRecordKind[];
    required: boolean;
  }>;
  notes: string[];
}

export interface CatalogStorageMigrationResult {
  planId: string;
  status: CatalogStorageMigrationStatus;
  startedAt?: string;
  completedAt?: string;
  migratedRecordKinds: CatalogStorageRecordKind[];
  skippedRecordKinds: CatalogStorageRecordKind[];
  warnings: string[];
  errors: string[];
  safeFallbackStatus: CatalogStorageSafeFallbackStatus;
}

export interface CatalogStorageCacheHealthReport {
  status: CatalogStorageHealthStatus;
  checkedAt: string;
  adapterKind: CatalogStorageAdapterKind;
  schemaVersion?: string;
  generatedCatalogPresent: boolean;
  sourceSnapshotsPresent: boolean;
  sectionMetadataPresent: boolean;
  sectionSignaturesCurrent: boolean;
  generatedCatalogVersion?: string;
  sourceVersions: CatalogStorageSourceSignature[];
  malformedEntries: Array<{
    recordKind: CatalogStorageRecordKind;
    id: string;
    message: string;
  }>;
  warnings: string[];
  errors: string[];
}

export interface CatalogStorageSafeFallback {
  status: CatalogStorageSafeFallbackStatus;
  reason: string;
  preserveCurrentGeneratedCatalog: true;
  preserveUserTeams: true;
  preserveSettings: true;
  preserveReports: true;
  preserveSaves: true;
  allowBundledSeedFallback: boolean;
  allowReadonlyBundleFallback: boolean;
  message: string;
}

export interface CatalogStorageAdapterBoundary {
  id: string;
  contractVersion: CatalogStorageContractVersion;
  currentAdapter: Extract<CatalogStorageAdapterKind, "electron-documents-file-storage">;
  fallbackAdapters: Extract<CatalogStorageAdapterKind, "browser-indexeddb-current">[];
  futureAdapters: Exclude<CatalogStorageAdapterKind, "electron-documents-file-storage" | "browser-indexeddb-current">[];
  currentIndexedDbRemainsSupported: true;
  implementationFlags: {
    durablePackagedStorageImplemented: true;
    sqliteImplemented: false;
    electronImplemented: true;
    bundleWritingImplemented: false;
    loaderExecutionImplemented: false;
  };
  notes: string[];
}

export type CatalogStorageAdapterCapability =
  | "read-generated-catalog"
  | "write-generated-catalog-after-validation"
  | "read-source-snapshots"
  | "write-source-snapshots-after-validation"
  | "read-section-metadata"
  | "write-section-metadata"
  | "read-list-signatures"
  | "bundle-handoff-metadata";

export type CatalogStorageBoundaryIssueSeverity = "info" | "warning" | "error";

export interface CatalogStorageAdapterDescriptor {
  id: string;
  kind: CatalogStorageAdapterKind;
  schemaVersion: CatalogStorageSchemaVersion;
  label: string;
  current: boolean;
  implemented: boolean;
  storageMedium:
    | "desktop-documents-file-storage"
    | "browser-indexeddb"
    | "future-packaged-local"
    | "future-readonly-bundle";
  capabilities: CatalogStorageAdapterCapability[];
  disallowedCapabilities: Array<
    | "electron"
    | "sqlite"
    | "filesystem-writes"
    | "bundle-writing"
    | "loader-execution"
    | "user-team-storage"
    | "simulation-output-storage"
  >;
  notes: string[];
}

export interface CatalogStorageBoundaryIssue {
  code: string;
  severity: CatalogStorageBoundaryIssueSeverity;
  message: string;
  path: string;
  section?: BattleLabCatalogBundleSectionName;
}

export interface CatalogStorageBoundarySectionState {
  section: BattleLabCatalogBundleSectionName;
  status: CatalogStorageHealthStatus;
  schemaVersion: CatalogStorageSchemaVersion;
  sourceSignature?: CatalogStorageSourceSignature;
  recordCount: number;
  generatedAt?: string;
  fetchedAt?: string;
  staleAfter?: string;
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  hasListSignature: boolean;
  hasCachedPayload: boolean;
  hasGeneratedCatalogCoverage: boolean;
  safeToReuse: boolean;
  messages: string[];
}

export interface CatalogStorageBoundaryReadModel {
  id: string;
  contractVersion: CatalogStorageContractVersion;
  schemaVersion: CatalogStorageSchemaVersion;
  checkedAt: string;
  currentAdapter: CatalogStorageAdapterDescriptor;
  futurePackagedAdapter: CatalogStorageAdapterDescriptor;
  readonlyBundleAdapter: CatalogStorageAdapterDescriptor;
  health: CatalogStorageCacheHealthReport;
  safeFallback: CatalogStorageSafeFallback;
  migrationPlan: CatalogStorageMigrationPlan;
  bundleHandoff: CatalogStorageBundleHandoff;
  sections: CatalogStorageBoundarySectionState[];
  generatedCatalog: {
    present: boolean;
    catalogVersion?: string;
    fetchedAt?: string;
    schemaVersion: CatalogStorageSchemaVersion;
    preserveUntilReplacementValidates: true;
  };
  safety: {
    indexedDbCurrentAdapterPreserved: true;
    packagedLocalAdapterImplemented: true;
    sqliteImplemented: false;
    electronImplemented: true;
    filesystemWritesImplemented: true;
    bundleWritingImplemented: false;
    loaderExecutionImplemented: false;
    storesUserTeams: false;
    storesSettings: false;
    storesReports: false;
    storesRuntimeOutput: false;
    pokeApiEnrichmentOnly: true;
    showdownLegalityAuthority: true;
  };
  issues: CatalogStorageBoundaryIssue[];
  notes: string[];
}

export interface CatalogStoragePlanningContract {
  manifest: CatalogStorageManifest;
  migrationPlan: CatalogStorageMigrationPlan;
  healthReport: CatalogStorageCacheHealthReport;
  safeFallback: CatalogStorageSafeFallback;
  adapterBoundary: CatalogStorageAdapterBoundary;
  bundleHandoff: CatalogStorageBundleHandoff;
}
