import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleLoadStatus,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationIssue,
  BattleLabCatalogBundleValidationResult,
} from "../types/catalogBundle";
import type {
  BattleLabCatalogBundleAppCompatibilityCheck,
  BattleLabCatalogBundleAssetPolicyCheck,
  BattleLabCatalogBundleLoaderContract,
  BattleLabCatalogBundleLoaderProgress,
  BattleLabCatalogBundleLoaderRequest,
  BattleLabCatalogBundleLoaderResult,
  BattleLabCatalogBundleLoaderSafeFailurePolicy,
  BattleLabCatalogBundleLoaderSourceIdentity,
  BattleLabCatalogBundleLoaderStatus,
  BattleLabCatalogBundleManifestPreflightResult,
  BattleLabCatalogBundleSectionHashValidationHandoff,
  BattleLabCatalogBundleSectionValidationSummary,
  BattleLabCatalogBundleSignatureStatusHandoff,
  BattleLabCatalogBundleWholeHashValidationHandoff,
} from "../types/catalogBundleLoader";
import type { CatalogFetchExecutionProgress } from "../types/catalogFetchExecution";
import type { CatalogPipelineSectionProgress } from "../types/catalogPipeline";
import { sampleBattleLabCatalogBundle } from "./catalogBundleFixture";
import { battleLabCatalogBundleCanonicalization } from "./catalogBundleHashes";
import { catalogRuntimeAdapterSafetyPolicy } from "./catalogRuntimeAdapterBoundary";

export interface CatalogBundleLoaderFixtureExamples {
  request: BattleLabCatalogBundleLoaderRequest;
  manifestPreflightSuccess: BattleLabCatalogBundleManifestPreflightResult;
  appCompatibilityBlocked: BattleLabCatalogBundleLoaderResult;
  invalidSectionHashBlocked: BattleLabCatalogBundleLoaderResult;
  unsignedSignaturePreview: BattleLabCatalogBundleSignatureStatusHandoff;
  unsafeAssetPolicyBlocked: BattleLabCatalogBundleLoaderResult;
  loadedInMemorySampleBundle: BattleLabCatalogBundleLoaderResult;
  contract: BattleLabCatalogBundleLoaderContract;
}

const fixtureCreatedAt = "2026-06-14T18:00:00.000Z";

const bundleSections: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const recordCountBySection = (
  bundle: BattleLabCatalogBundle,
  section: BattleLabCatalogBundleSectionName,
): number => bundle.sections[section].length;

const expectedRecordCountBySection = (
  bundle: BattleLabCatalogBundle,
  section: BattleLabCatalogBundleSectionName,
): number => {
  if (section === "searchIndex") {
    return bundle.manifest.recordCounts.searchIndexEntries;
  }

  return bundle.manifest.recordCounts[section];
};

const createIssue = (
  code: string,
  severity: BattleLabCatalogBundleValidationIssue["severity"],
  path: string,
  message: string,
  section?: BattleLabCatalogBundleSectionName,
): BattleLabCatalogBundleValidationIssue => ({
  code,
  severity,
  path,
  message,
  section,
});

const sectionHashValue = (
  bundle: BattleLabCatalogBundle,
  section: BattleLabCatalogBundleSectionName,
): BattleLabCatalogBundleHash => bundle.manifest.sectionHashes[section];

export const sampleCatalogBundleLoaderSourceIdentity: BattleLabCatalogBundleLoaderSourceIdentity = {
  sourceKind: "test-fixture",
  displayName: "BattleLab local catalog bundle fixture",
  extension: ".bl",
  logicalSourceKey: "battlelab.catalog.bundle.loader.fixture",
  fileName: "battlelab-local-catalog-preview.bl",
  contentHash: sampleBattleLabCatalogBundle.manifest.bundleHash,
  notes: [
    "Fixture source identity is contract-only and in-memory.",
    "No file picker, file IO, cache file IO, or loader execution is implemented.",
  ],
};

export const sampleCatalogBundleLoaderRequest: BattleLabCatalogBundleLoaderRequest = {
  id: "catalog-bundle-loader-fixture-request",
  requestedAt: fixtureCreatedAt,
  boundary: "contract-only",
  source: sampleCatalogBundleLoaderSourceIdentity,
  expectedBundleFormat: "battlelab-catalog",
  expectedExtension: ".bl",
  readOnlyRequired: true,
  catalogOnlyRequired: true,
  allowFileIo: false,
  allowFilePicker: false,
  allowCacheFileIo: false,
  allowBundleWriting: false,
  allowUiExecution: false,
  safetyPolicy: {
    ...catalogRuntimeAdapterSafetyPolicy,
    allowNetwork: false,
    allowFileRead: false,
    allowFileWrite: false,
    allowRuntimeUiWiring: false,
    allowBundleWriting: false,
    requireLeadApprovalForExecution: true,
  },
  notes: [
    "Read-only .bl bundle loader request fixture only.",
    "PokeAPI/catalog data remains enrichment-only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
    "Sprite metadata remains candidate-review-gated.",
  ],
};

const sampleManifestPreflightSuccess: BattleLabCatalogBundleManifestPreflightResult = {
  status: "loaded",
  manifest: sampleBattleLabCatalogBundle.manifest,
  extensionValid: true,
  bundleFormatValid: true,
  readOnly: true,
  catalogOnly: true,
  recordCountsPresent: true,
  sectionHashesPresent: true,
  wholeBundleHashPresent: true,
  signaturePresent: true,
  issues: [],
  notes: [
    "Manifest preflight is successful for the in-memory sample bundle fixture.",
    "Preflight does not execute a loader or read a file.",
  ],
};

const createAppCompatibilityCheck = (
  compatible: boolean,
  issues: BattleLabCatalogBundleValidationIssue[] = [],
): BattleLabCatalogBundleAppCompatibilityCheck => ({
  appVersion: "0.3.0",
  compatibility: sampleBattleLabCatalogBundle.manifest.appCompatibility,
  compatible,
  blocking: !compatible,
  issues,
  notes: compatible
    ? ["App compatibility preflight passes for the sample bundle fixture."]
    : ["Incompatible bundles must fail safely and preserve the current catalog."],
});

const createSectionHashValidation = (
  invalidSections: BattleLabCatalogBundleSectionName[] = [],
): BattleLabCatalogBundleSectionHashValidationHandoff => {
  const issues = invalidSections.map((section) =>
    createIssue(
      "section-hash-invalid",
      "error",
      `manifest.sectionHashes.${section}`,
      "Fixture demonstrates that invalid section hashes block bundle loading.",
      section,
    ),
  );

  return {
    expectedHashes: sampleBattleLabCatalogBundle.manifest.sectionHashes,
    actualHashes: Object.fromEntries(
      bundleSections.map((section) => [
        section,
        invalidSections.includes(section)
          ? {
              ...sectionHashValue(sampleBattleLabCatalogBundle, section),
              value: "fixture-invalid-section-hash",
            }
          : sectionHashValue(sampleBattleLabCatalogBundle, section),
      ]),
    ) as Partial<BattleLabCatalogBundle["manifest"]["sectionHashes"]>,
    validatedSections: bundleSections.filter((section) => !invalidSections.includes(section)),
    missingSections: [],
    invalidSections,
    canonicalization: battleLabCatalogBundleCanonicalization,
    allSectionHashesValid: invalidSections.length === 0,
    issues,
    notes:
      invalidSections.length === 0
        ? ["Section hash validation handoff is represented for the sample fixture."]
        : ["Invalid section hash handoff blocks loading without changing the current catalog."],
  };
};

const createWholeHashValidation = (
  hashValid: boolean,
): BattleLabCatalogBundleWholeHashValidationHandoff => ({
  expectedHash: sampleBattleLabCatalogBundle.manifest.bundleHash,
  actualHash: hashValid
    ? sampleBattleLabCatalogBundle.manifest.bundleHash
    : {
        ...sampleBattleLabCatalogBundle.manifest.bundleHash,
        value: "fixture-invalid-whole-bundle-hash",
      },
  canonicalization: battleLabCatalogBundleCanonicalization,
  hashValid,
  blocking: !hashValid,
  issues: hashValid
    ? []
    : [
        createIssue(
          "bundle-hash-invalid",
          "error",
          "manifest.bundleHash",
          "Whole-bundle hash mismatch blocks bundle loading.",
        ),
      ],
  notes: [
    "Whole-bundle hash validation is a handoff shape only; this fixture does not implement loader execution.",
  ],
});

export const sampleCatalogBundleUnsignedSignaturePreview: BattleLabCatalogBundleSignatureStatusHandoff = {
  signature: sampleBattleLabCatalogBundle.manifest.signature,
  status: "unsigned",
  verificationRequired: false,
  verificationSupported: false,
  signatureValid: false,
  blocking: false,
  issues: [
    createIssue(
      "bundle-signature-unsigned",
      "warning",
      "manifest.signature.status",
      "Unsigned signature is preview metadata only and does not represent verified trust.",
    ),
  ],
  notes: [
    "Unsigned status is surfaced for review, not treated as verified integrity.",
    "Future signed bundles require a separate signature verification checkpoint.",
  ],
};

const createAssetPolicyCheck = (
  blocking: boolean,
): BattleLabCatalogBundleAssetPolicyCheck => ({
  policy: blocking
    ? {
        ...sampleBattleLabCatalogBundle.manifest.assetPolicy,
        allowRemoteUrls: true,
        allowUnreviewedCandidateSources: true,
      }
    : sampleBattleLabCatalogBundle.manifest.assetPolicy,
  remoteUrlsBlocked: true,
  unreviewedCandidateSourcesBlocked: true,
  fallbackRequired: true,
  safeToUseSpriteAssetsInProduction: false,
  blocking,
  issues: blocking
    ? [
        createIssue(
          "unsafe-asset-policy",
          "error",
          "manifest.assetPolicy",
          "Unsafe asset policy blocks bundle loading until sprite source review is approved.",
        ),
      ]
    : [],
  notes: [
    "Sprite metadata remains candidate-review-gated.",
    "Production sprite rendering is not approved by this fixture.",
  ],
});

const createSectionValidation = (
  invalidSections: BattleLabCatalogBundleSectionName[] = [],
): BattleLabCatalogBundleSectionValidationSummary[] =>
  bundleSections.map((section) => {
    const invalid = invalidSections.includes(section);

    return {
      section,
      status: invalid ? "invalid" : "valid",
      recordCount: recordCountBySection(sampleBattleLabCatalogBundle, section),
      expectedRecordCount: expectedRecordCountBySection(sampleBattleLabCatalogBundle, section),
      warningCount: 0,
      errorCount: invalid ? 1 : 0,
      hashValid: !invalid,
      issues: invalid
        ? [
            createIssue(
              "section-validation-invalid",
              "error",
              `sections.${section}`,
              "Invalid section validation keeps the bundle from loading.",
              section,
            ),
          ]
        : [],
    };
  });

const createBundleValidation = (
  status: BattleLabCatalogBundleLoadStatus,
  issues: BattleLabCatalogBundleValidationIssue[] = [],
): BattleLabCatalogBundleValidationResult => ({
  status,
  isValid: issues.every((issue) => issue.severity !== "error"),
  issues,
});

const createLoaderProgress = (
  status: BattleLabCatalogBundleLoaderStatus,
  sectionValidation: BattleLabCatalogBundleSectionValidationSummary[],
  message: string,
): BattleLabCatalogBundleLoaderProgress => {
  const warningCount = sectionValidation.reduce((total, section) => total + section.warningCount, 0);
  const errorCount = sectionValidation.reduce((total, section) => total + section.errorCount, 0);
  const loaded = status === "loaded";

  return {
    status,
    executionStatus: loaded ? "complete-with-warnings" : status === "blocked" ? "blocked" : "planned",
    currentStepId: loaded ? undefined : "loader-preflight",
    completedStepCount: loaded ? 7 : 0,
    totalStepCount: 7,
    progressPercent: loaded ? 100 : status === "blocked" ? 50 : 0,
    sections: sectionValidation,
    issueCount: warningCount + errorCount,
    warningCount,
    errorCount,
    message,
  };
};

const mergeIssues = (
  ...issueGroups: BattleLabCatalogBundleValidationIssue[][]
): BattleLabCatalogBundleValidationIssue[] => issueGroups.flat();

const createLoaderResult = ({
  id,
  status,
  loadStatus,
  appCompatible = true,
  invalidSections = [],
  unsafeAssetPolicy = false,
  loadedBundle,
  failureMode,
  notes,
}: {
  id: string;
  status: BattleLabCatalogBundleLoaderStatus;
  loadStatus: BattleLabCatalogBundleLoadStatus;
  appCompatible?: boolean;
  invalidSections?: BattleLabCatalogBundleSectionName[];
  unsafeAssetPolicy?: boolean;
  loadedBundle?: BattleLabCatalogBundle;
  failureMode: BattleLabCatalogBundleLoaderResult["failureMode"];
  notes: string[];
}): BattleLabCatalogBundleLoaderResult => {
  const appCompatibility = createAppCompatibilityCheck(
    appCompatible,
    appCompatible
      ? []
      : [
          createIssue(
            "app-compatibility-blocked",
            "error",
            "manifest.appCompatibility",
            "Bundle is incompatible with the current app version and must not replace the active catalog.",
          ),
        ],
  );
  const sectionHashValidation = createSectionHashValidation(invalidSections);
  const wholeBundleHashValidation = createWholeHashValidation(invalidSections.length === 0);
  const assetPolicyCheck = createAssetPolicyCheck(unsafeAssetPolicy);
  const sectionValidation = createSectionValidation(invalidSections);
  const issues = mergeIssues(
    appCompatibility.issues,
    sectionHashValidation.issues,
    wholeBundleHashValidation.issues,
    sampleCatalogBundleUnsignedSignaturePreview.issues,
    assetPolicyCheck.issues,
    sectionValidation.flatMap((section) => section.issues),
  );
  const bundleValidation = createBundleValidation(loadStatus, issues);
  const progress = createLoaderProgress(
    status,
    sectionValidation,
    status === "loaded"
      ? "Sample .bl catalog bundle is loaded in memory for fixture preview only."
      : "Sample .bl catalog bundle loading is blocked safely.",
  );

  return {
    id,
    requestId: sampleCatalogBundleLoaderRequest.id,
    status,
    loadStatus,
    source: sampleCatalogBundleLoaderSourceIdentity,
    manifestPreflight: sampleManifestPreflightSuccess,
    appCompatibility,
    sectionHashValidation,
    wholeBundleHashValidation,
    signatureStatus: sampleCatalogBundleUnsignedSignaturePreview,
    assetPolicyCheck,
    sectionValidation,
    bundleValidation,
    progress,
    loadedBundle,
    safeToReplaceActiveCatalog: false,
    safeToCommitCatalog: false,
    safeToWriteBundle: false,
    safeToUseSpriteAssetsInProduction: false,
    failureMode,
    issues,
    notes,
  };
};

export const sampleCatalogBundleLoaderLoadedInMemoryResult = createLoaderResult({
  id: "catalog-bundle-loader-loaded-in-memory-fixture",
  status: "loaded",
  loadStatus: "loaded",
  loadedBundle: sampleBattleLabCatalogBundle,
  failureMode: "keep-current-catalog",
  notes: [
    "Loaded state is in-memory fixture data only.",
    "Safe commit, .bl writing, and production sprite use remain closed.",
  ],
});

export const sampleCatalogBundleLoaderAppCompatibilityBlockedResult = createLoaderResult({
  id: "catalog-bundle-loader-app-compatibility-blocked-fixture",
  status: "blocked",
  loadStatus: "unsupported",
  appCompatible: false,
  failureMode: "block-incompatible-bundle",
  notes: [
    "Incompatible app fixture blocks loading and preserves the current catalog.",
    "User teams, settings, reports, saves, runtime output, and generated artifacts remain outside .bl.",
  ],
});

export const sampleCatalogBundleLoaderInvalidSectionHashBlockedResult = createLoaderResult({
  id: "catalog-bundle-loader-invalid-section-hash-blocked-fixture",
  status: "blocked",
  loadStatus: "invalid",
  invalidSections: ["moves"],
  failureMode: "block-invalid-hash",
  notes: [
    "Invalid section hash fixture blocks loading.",
    "No file IO, storage, cache file IO, or .bl writing is performed.",
  ],
});

export const sampleCatalogBundleLoaderUnsafeAssetPolicyBlockedResult = createLoaderResult({
  id: "catalog-bundle-loader-unsafe-asset-policy-blocked-fixture",
  status: "blocked",
  loadStatus: "invalid",
  unsafeAssetPolicy: true,
  failureMode: "block-unsafe-assets",
  notes: [
    "Unsafe asset policy fixture blocks loading.",
    "Sprite metadata remains candidate-review-gated and production sprite rendering remains unapproved.",
  ],
});

const expectedProgressSections: CatalogPipelineSectionProgress[] = bundleSections.map((section) => ({
  section,
  status: "pending",
  progressPercent: 0,
  recordsRead: 0,
  recordsWritten: 0,
  warningCount: 0,
  errorCount: 0,
  message: "Loader contract is fixture-only and does not execute.",
}));

const sampleLoaderExpectedProgress: CatalogFetchExecutionProgress = {
  status: "planned",
  currentStepId: "loader-preflight",
  completedStepCount: 0,
  totalStepCount: 7,
  progressPercent: 0,
  sections: expectedProgressSections,
  issueCount: 0,
  warningCount: 0,
  errorCount: 0,
  message: "Read-only .bl loader contract preview is planned only.",
};

export const sampleCatalogBundleLoaderSafeFailurePolicy: BattleLabCatalogBundleLoaderSafeFailurePolicy = {
  preserveCurrentCatalog: true,
  preserveUserTeams: true,
  preserveSettings: true,
  preserveReports: true,
  preserveSaves: true,
  preserveRuntimeOutput: true,
  discardGeneratedArtifacts: true,
  failureMode: "keep-current-catalog",
  notes: [
    "Safe failure preserves all user-owned and runtime-owned data outside the .bl bundle.",
    "Generated artifacts are discarded on failure.",
  ],
};

export const sampleCatalogBundleLoaderContract: BattleLabCatalogBundleLoaderContract = {
  id: "catalog-bundle-loader-contract-fixture",
  boundary: "contract-only",
  request: sampleCatalogBundleLoaderRequest,
  expectedProgress: sampleLoaderExpectedProgress,
  safeFailurePolicy: sampleCatalogBundleLoaderSafeFailurePolicy,
  catalogOnlyBoundary: {
    bundleExtension: ".bl",
    readOnly: true,
    catalogEnrichmentOnly: true,
    excludesUserTeams: true,
    excludesSettings: true,
    excludesReports: true,
    excludesSaves: true,
    excludesRuntimeOutput: true,
    excludesGeneratedArtifacts: true,
  },
  authorityBoundary: {
    pokeApiRole: "enrichment-only",
    showdownAuthority: "legality-and-simulation-source-of-truth",
    spriteMetadataPolicy: "candidate-review-gated",
  },
  implementationFlags: {
    loaderExecutionImplemented: false,
    fileIoImplemented: false,
    filePickerImplemented: false,
    cacheFileIoImplemented: false,
    bundleWritingImplemented: false,
    uiWiringImplemented: false,
    durablePersistenceImplemented: false,
  },
  notes: [
    "Contract fixture is serializable, data-only, in-memory, and UI-unwired.",
    "No loader execution, file IO, file picker behavior, storage, .bl writing, or simulation work is implemented.",
  ],
};

export const sampleCatalogBundleLoaderFixtureExamples: CatalogBundleLoaderFixtureExamples = {
  request: sampleCatalogBundleLoaderRequest,
  manifestPreflightSuccess: sampleManifestPreflightSuccess,
  appCompatibilityBlocked: sampleCatalogBundleLoaderAppCompatibilityBlockedResult,
  invalidSectionHashBlocked: sampleCatalogBundleLoaderInvalidSectionHashBlockedResult,
  unsignedSignaturePreview: sampleCatalogBundleUnsignedSignaturePreview,
  unsafeAssetPolicyBlocked: sampleCatalogBundleLoaderUnsafeAssetPolicyBlockedResult,
  loadedInMemorySampleBundle: sampleCatalogBundleLoaderLoadedInMemoryResult,
  contract: sampleCatalogBundleLoaderContract,
};
