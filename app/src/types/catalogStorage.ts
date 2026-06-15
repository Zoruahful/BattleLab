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
  currentAdapter: Extract<CatalogStorageAdapterKind, "browser-indexeddb-current">;
  futureAdapters: Exclude<CatalogStorageAdapterKind, "browser-indexeddb-current">[];
  currentIndexedDbRemainsSupported: true;
  implementationFlags: {
    durablePackagedStorageImplemented: false;
    sqliteImplemented: false;
    electronImplemented: false;
    bundleWritingImplemented: false;
    loaderExecutionImplemented: false;
  };
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
