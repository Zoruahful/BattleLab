import type {
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleManifest,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationIssue,
} from "./catalogBundle";
import type {
  BattleLabCatalog,
  CatalogAssetKind,
  CatalogKey,
  CatalogPickerKind,
  CatalogSourceKind,
  CatalogSourceMetadata,
  CatalogValidationStatus,
  ShowdownId,
} from "./catalog";

export type CatalogPipelineSourceRole =
  | "enrichment"
  | "legalityAuthority"
  | "simulationAuthority"
  | "assetCandidate"
  | "manualSeed";

export type CatalogPipelineRunMode =
  | "validateOnly"
  | "generateSeed"
  | "generateBundle"
  | "dryRun";

export type CatalogPipelineStatus =
  | "idle"
  | "queued"
  | "running"
  | "complete"
  | "completeWithWarnings"
  | "failed"
  | "blocked";

export type CatalogPipelineSectionStatus =
  | "pending"
  | "reading"
  | "normalizing"
  | "validating"
  | "complete"
  | "warning"
  | "failed"
  | "skipped";

export type CatalogPipelineWarningSeverity = "info" | "warning" | "error";

export type CatalogPipelineWarningCode =
  | "asset-license-review-required"
  | "candidate-source-unavailable"
  | "duplicate-normalized-id"
  | "missing-catalog-key"
  | "missing-showdown-id"
  | "showdown-authority-required"
  | "source-field-missing"
  | "source-mismatch"
  | "unsupported-form"
  | "validation-deferred";

export type CatalogPipelineMismatchKind =
  | "displayName"
  | "alias"
  | "form"
  | "type"
  | "move"
  | "ability"
  | "item"
  | "nature"
  | "asset"
  | "availability";

export interface CatalogPipelineSourceSnapshot {
  sourceId: string;
  role: CatalogPipelineSourceRole;
  kind: CatalogSourceKind;
  name: string;
  version?: string;
  dataVersion?: string;
  fetchedAt?: string;
  generatedAt?: string;
  documentationUrl?: string;
  recordCount?: number;
  contentHash?: BattleLabCatalogBundleHash;
  requiresAttribution: boolean;
  notes?: string[];
}

export interface CatalogPipelineAssetPolicyInput {
  includeCandidateUrls: boolean;
  requireLicenseReview: boolean;
  allowedAssetKinds: CatalogAssetKind[];
  allowRemoteRuntimeUrls: false;
  defaultFallbackBehavior: "use-static" | "use-icon" | "use-text" | "hide";
}

export interface CatalogPipelineGenerationRequest {
  id: string;
  mode: CatalogPipelineRunMode;
  requestedAt: string;
  catalogVersion: string;
  targetBundleExtension: ".bl";
  sourceSnapshots: CatalogPipelineSourceSnapshot[];
  sourceMetadata: CatalogSourceMetadata[];
  sectionNames: BattleLabCatalogBundleSectionName[];
  assetPolicy: CatalogPipelineAssetPolicyInput;
  includeSearchIndex: boolean;
  includeVisualAssetMetadata: boolean;
  notes?: string[];
}

export interface CatalogPipelineSectionProgress {
  section: BattleLabCatalogBundleSectionName;
  status: CatalogPipelineSectionStatus;
  progressPercent: number;
  recordsRead: number;
  recordsWritten: number;
  warningCount: number;
  errorCount: number;
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CatalogPipelineNormalizationWarning {
  id: string;
  code: CatalogPipelineWarningCode;
  severity: CatalogPipelineWarningSeverity;
  section: BattleLabCatalogBundleSectionName;
  sourceId?: string;
  catalogKey?: CatalogKey;
  showdownId?: ShowdownId;
  message: string;
  deferredToShowdown?: boolean;
}

export interface CatalogPipelineSourceMismatch {
  id: string;
  kind: CatalogPipelineMismatchKind;
  section: BattleLabCatalogBundleSectionName;
  catalogKey?: CatalogKey;
  showdownId?: ShowdownId;
  sourceId: string;
  sourceValue: string;
  normalizedValue: string;
  status: CatalogValidationStatus;
  resolution: "use-showdown" | "use-enrichment" | "manual-review" | "defer";
  message: string;
}

export interface CatalogPipelineGeneratedSectionSummary {
  section: BattleLabCatalogBundleSectionName;
  recordCount: number;
  sourceIds: string[];
  hash?: BattleLabCatalogBundleHash;
  warningCount: number;
  errorCount: number;
  generatedAt: string;
}

export type CatalogPipelineGeneratedSectionSummaries = Record<
  BattleLabCatalogBundleSectionName,
  CatalogPipelineGeneratedSectionSummary
>;

export interface CatalogPipelineGeneratedCatalogSummary {
  catalogVersion: string;
  generatedAt: string;
  catalog: BattleLabCatalog;
  sections: CatalogPipelineGeneratedSectionSummaries;
  warnings: CatalogPipelineNormalizationWarning[];
  mismatches: CatalogPipelineSourceMismatch[];
}

export interface CatalogPipelineBundleEmissionSummary {
  bundleFormat: "battlelab-catalog";
  fileExtension: ".bl";
  readOnly: true;
  manifest: BattleLabCatalogBundleManifest;
  sectionHashes: Record<BattleLabCatalogBundleSectionName, BattleLabCatalogBundleHash>;
  bundleHash: BattleLabCatalogBundleHash;
  signatureStatus: "unsigned" | "present" | "verified" | "failed" | "unsupported";
  emittedAt: string;
  warningCount: number;
  errorCount: number;
}

export interface CatalogPipelineValidationResult {
  status: CatalogPipelineStatus;
  isValid: boolean;
  generatedCatalog?: CatalogPipelineGeneratedCatalogSummary;
  bundleEmission?: CatalogPipelineBundleEmissionSummary;
  sections: CatalogPipelineSectionProgress[];
  warnings: CatalogPipelineNormalizationWarning[];
  mismatches: CatalogPipelineSourceMismatch[];
  bundleIssues?: BattleLabCatalogBundleValidationIssue[];
  message?: string;
}

export interface CatalogPipelinePickerSearchPlan {
  pickerKinds: CatalogPickerKind[];
  includeAliases: boolean;
  includeDescriptions: boolean;
  includeShowdownIds: boolean;
  includeTypeTokens: boolean;
  expectedIndexSections: BattleLabCatalogBundleSectionName[];
}
