import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleAssetPolicy,
  BattleLabCatalogBundleCompatibility,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleLoadStatus,
  BattleLabCatalogBundleManifest,
  BattleLabCatalogBundleSectionHashes,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleSignature,
  BattleLabCatalogBundleSignatureStatus,
  BattleLabCatalogBundleValidationIssue,
  BattleLabCatalogBundleValidationResult,
} from "./catalogBundle";
import type {
  CatalogFetchExecutionProgress,
  CatalogFetchExecutionSafetyPolicy,
  CatalogFetchExecutionStatus,
} from "./catalogFetchExecution";

export type BattleLabCatalogBundleLoaderBoundary =
  | "contract-only"
  | "future-local-file-read"
  | "future-bundled-resource-read";

export type BattleLabCatalogBundleLoaderSourceKind =
  | "user-selected-file"
  | "bundled-default"
  | "generated-preview"
  | "test-fixture";

export type BattleLabCatalogBundleLoaderStatus =
  | "idle"
  | "preflighting-manifest"
  | "checking-compatibility"
  | "validating-section-hashes"
  | "validating-bundle-hash"
  | "checking-signature"
  | "checking-asset-policy"
  | "validating-sections"
  | "loaded"
  | "blocked"
  | "failed"
  | "cancelled";

export type BattleLabCatalogBundleLoaderFailureMode =
  | "keep-current-catalog"
  | "block-incompatible-bundle"
  | "block-invalid-hash"
  | "block-invalid-signature"
  | "block-unsafe-assets"
  | "cancel-without-change";

export type BattleLabCatalogBundleSectionValidationStatus =
  | "pending"
  | "valid"
  | "valid-with-warnings"
  | "invalid"
  | "skipped";

export interface BattleLabCatalogBundleLoaderSourceIdentity {
  sourceKind: BattleLabCatalogBundleLoaderSourceKind;
  displayName: string;
  extension: ".bl";
  logicalSourceKey?: string;
  fileName?: string;
  contentHash?: BattleLabCatalogBundleHash;
  notes: string[];
}

export interface BattleLabCatalogBundleLoaderRequest {
  id: string;
  requestedAt: string;
  boundary: BattleLabCatalogBundleLoaderBoundary;
  source: BattleLabCatalogBundleLoaderSourceIdentity;
  expectedBundleFormat: "battlelab-catalog";
  expectedExtension: ".bl";
  readOnlyRequired: true;
  catalogOnlyRequired: true;
  allowFileIo: false;
  allowFilePicker: false;
  allowCacheFileIo: false;
  allowBundleWriting: false;
  allowUiExecution: false;
  safetyPolicy: CatalogFetchExecutionSafetyPolicy;
  notes: string[];
}

export interface BattleLabCatalogBundleManifestPreflightResult {
  status: BattleLabCatalogBundleLoadStatus;
  manifest?: BattleLabCatalogBundleManifest;
  extensionValid: boolean;
  bundleFormatValid: boolean;
  readOnly: true;
  catalogOnly: true;
  recordCountsPresent: boolean;
  sectionHashesPresent: boolean;
  wholeBundleHashPresent: boolean;
  signaturePresent: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleAppCompatibilityCheck {
  appVersion: string;
  compatibility: BattleLabCatalogBundleCompatibility;
  compatible: boolean;
  blocking: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleSectionHashValidationHandoff {
  expectedHashes: BattleLabCatalogBundleSectionHashes;
  actualHashes?: Partial<BattleLabCatalogBundleSectionHashes>;
  validatedSections: BattleLabCatalogBundleSectionName[];
  missingSections: BattleLabCatalogBundleSectionName[];
  invalidSections: BattleLabCatalogBundleSectionName[];
  canonicalization: string;
  allSectionHashesValid: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleWholeHashValidationHandoff {
  expectedHash: BattleLabCatalogBundleHash;
  actualHash?: BattleLabCatalogBundleHash;
  canonicalization: string;
  hashValid: boolean;
  blocking: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleSignatureStatusHandoff {
  signature: BattleLabCatalogBundleSignature;
  status: BattleLabCatalogBundleSignatureStatus;
  verificationRequired: boolean;
  verificationSupported: boolean;
  signatureValid: boolean;
  blocking: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleAssetPolicyCheck {
  policy: BattleLabCatalogBundleAssetPolicy;
  remoteUrlsBlocked: boolean;
  unreviewedCandidateSourcesBlocked: boolean;
  fallbackRequired: boolean;
  safeToUseSpriteAssetsInProduction: false;
  blocking: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleSectionValidationSummary {
  section: BattleLabCatalogBundleSectionName;
  status: BattleLabCatalogBundleSectionValidationStatus;
  recordCount: number;
  expectedRecordCount: number;
  warningCount: number;
  errorCount: number;
  hashValid: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
}

export interface BattleLabCatalogBundleLoaderProgress {
  status: BattleLabCatalogBundleLoaderStatus;
  executionStatus: CatalogFetchExecutionStatus;
  currentStepId?: string;
  completedStepCount: number;
  totalStepCount: number;
  progressPercent: number;
  sections: BattleLabCatalogBundleSectionValidationSummary[];
  issueCount: number;
  warningCount: number;
  errorCount: number;
  message: string;
}

export interface BattleLabCatalogBundleLoaderResult {
  id: string;
  requestId: string;
  status: BattleLabCatalogBundleLoaderStatus;
  loadStatus: BattleLabCatalogBundleLoadStatus;
  source: BattleLabCatalogBundleLoaderSourceIdentity;
  manifestPreflight: BattleLabCatalogBundleManifestPreflightResult;
  appCompatibility: BattleLabCatalogBundleAppCompatibilityCheck;
  sectionHashValidation: BattleLabCatalogBundleSectionHashValidationHandoff;
  wholeBundleHashValidation: BattleLabCatalogBundleWholeHashValidationHandoff;
  signatureStatus: BattleLabCatalogBundleSignatureStatusHandoff;
  assetPolicyCheck: BattleLabCatalogBundleAssetPolicyCheck;
  sectionValidation: BattleLabCatalogBundleSectionValidationSummary[];
  bundleValidation: BattleLabCatalogBundleValidationResult;
  progress: BattleLabCatalogBundleLoaderProgress;
  loadedBundle?: BattleLabCatalogBundle;
  safeToReplaceActiveCatalog: false;
  safeToCommitCatalog: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
  failureMode: BattleLabCatalogBundleLoaderFailureMode;
  issues: BattleLabCatalogBundleValidationIssue[];
  notes: string[];
}

export interface BattleLabCatalogBundleLoaderSafeFailurePolicy {
  preserveCurrentCatalog: true;
  preserveUserTeams: true;
  preserveSettings: true;
  preserveReports: true;
  preserveSaves: true;
  preserveRuntimeOutput: true;
  discardGeneratedArtifacts: true;
  failureMode: BattleLabCatalogBundleLoaderFailureMode;
  notes: string[];
}

export interface BattleLabCatalogBundleLoaderContract {
  id: string;
  boundary: Extract<BattleLabCatalogBundleLoaderBoundary, "contract-only">;
  request: BattleLabCatalogBundleLoaderRequest;
  expectedProgress: CatalogFetchExecutionProgress;
  safeFailurePolicy: BattleLabCatalogBundleLoaderSafeFailurePolicy;
  catalogOnlyBoundary: {
    bundleExtension: ".bl";
    readOnly: true;
    catalogEnrichmentOnly: true;
    excludesUserTeams: true;
    excludesSettings: true;
    excludesReports: true;
    excludesSaves: true;
    excludesRuntimeOutput: true;
    excludesGeneratedArtifacts: true;
  };
  authorityBoundary: {
    pokeApiRole: "enrichment-only";
    showdownAuthority: "legality-and-simulation-source-of-truth";
    spriteMetadataPolicy: "candidate-review-gated";
  };
  implementationFlags: {
    loaderExecutionImplemented: false;
    fileIoImplemented: false;
    filePickerImplemented: false;
    cacheFileIoImplemented: false;
    bundleWritingImplemented: false;
    uiWiringImplemented: false;
    durablePersistenceImplemented: false;
  };
  notes: string[];
}
