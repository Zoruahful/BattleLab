import type {
  BattleLabCatalogBundleLoadStatus,
  BattleLabCatalogBundleSignatureStatus,
} from "../types/catalogBundle";
import type {
  BattleLabCatalogBundleLoaderBoundary,
  BattleLabCatalogBundleLoaderResult,
  BattleLabCatalogBundleLoaderStatus,
} from "../types/catalogBundleLoader";
import {
  sampleCatalogBundleLoaderAppCompatibilityBlockedResult,
  sampleCatalogBundleLoaderFixtureExamples,
  sampleCatalogBundleLoaderInvalidSectionHashBlockedResult,
  sampleCatalogBundleLoaderLoadedInMemoryResult,
  sampleCatalogBundleLoaderUnsafeAssetPolicyBlockedResult,
} from "./catalogBundleLoaderFixtures";
import {
  sampleCatalogFoundationStatusReadModel,
  type CatalogFoundationStatusReadModel,
} from "./catalogFoundationStatusReadModel";

export type CatalogBundleLoaderStatusBridgeState =
  | "ready"
  | "warning"
  | "blocked";

export interface CatalogBundleLoaderStatusBridgeSafety {
  safeToReplaceActiveCatalog: false;
  safeToCommitCatalog: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
  loaderExecutionEnabled: false;
  fileIoEnabled: false;
  filePickerEnabled: false;
  cacheFileIoEnabled: false;
  storageEnabled: false;
  uiExecutionEnabled: false;
  previewOnly: true;
}

export interface CatalogBundleLoaderStatusBridgeProps {
  id: string;
  foundationStatusReadModelId: CatalogFoundationStatusReadModel["id"];
  requestBoundary: BattleLabCatalogBundleLoaderBoundary;
  manifestPreflightStatus: BattleLabCatalogBundleLoadStatus;
  appCompatibilityStatus: CatalogBundleLoaderStatusBridgeState;
  sectionHashValidationStatus: CatalogBundleLoaderStatusBridgeState;
  wholeBundleHashValidationStatus: CatalogBundleLoaderStatusBridgeState;
  signatureStatus: BattleLabCatalogBundleSignatureStatus;
  signatureVerified: boolean;
  unsignedSignaturePreviewMetadata: boolean;
  assetPolicyStatus: CatalogBundleLoaderStatusBridgeState;
  loadedInMemoryFixtureStatus: BattleLabCatalogBundleLoaderStatus;
  blockedFixtureCount: number;
  warningCount: number;
  errorCount: number;
  safety: CatalogBundleLoaderStatusBridgeSafety;
  boundaryNotes: string[];
}

const blockedFixtureResults: BattleLabCatalogBundleLoaderResult[] = [
  sampleCatalogBundleLoaderAppCompatibilityBlockedResult,
  sampleCatalogBundleLoaderInvalidSectionHashBlockedResult,
  sampleCatalogBundleLoaderUnsafeAssetPolicyBlockedResult,
];

const countIssues = (
  results: readonly BattleLabCatalogBundleLoaderResult[],
  severity: "warning" | "error",
) => results.reduce(
  (total, result) =>
    total + result.issues.filter((issue) => issue.severity === severity).length,
  0,
);

const toState = (blocked: boolean, warning: boolean): CatalogBundleLoaderStatusBridgeState => {
  if (blocked) return "blocked";
  if (warning) return "warning";

  return "ready";
};

export function createCatalogBundleLoaderStatusBridge(
  foundationStatusReadModel: CatalogFoundationStatusReadModel = sampleCatalogFoundationStatusReadModel,
): CatalogBundleLoaderStatusBridgeProps {
  const fixtures = sampleCatalogBundleLoaderFixtureExamples;
  const loadedResult = sampleCatalogBundleLoaderLoadedInMemoryResult;
  const warningCount =
    countIssues([loadedResult, ...blockedFixtureResults], "warning") +
    fixtures.unsignedSignaturePreview.issues.filter((issue) => issue.severity === "warning").length;
  const errorCount = countIssues(blockedFixtureResults, "error");

  return {
    id: "catalog-bundle-loader-status-bridge-preview",
    foundationStatusReadModelId: foundationStatusReadModel.id,
    requestBoundary: fixtures.request.boundary,
    manifestPreflightStatus: fixtures.manifestPreflightSuccess.status,
    appCompatibilityStatus: toState(
      fixtures.appCompatibilityBlocked.appCompatibility.blocking,
      fixtures.appCompatibilityBlocked.appCompatibility.issues.some(
        (issue) => issue.severity === "warning",
      ),
    ),
    sectionHashValidationStatus: toState(
      !loadedResult.sectionHashValidation.allSectionHashesValid ||
        fixtures.invalidSectionHashBlocked.sectionHashValidation.invalidSections.length > 0,
      loadedResult.sectionHashValidation.issues.some((issue) => issue.severity === "warning"),
    ),
    wholeBundleHashValidationStatus: toState(
      !loadedResult.wholeBundleHashValidation.hashValid ||
        fixtures.invalidSectionHashBlocked.wholeBundleHashValidation.blocking,
      loadedResult.wholeBundleHashValidation.issues.some((issue) => issue.severity === "warning"),
    ),
    signatureStatus: fixtures.unsignedSignaturePreview.status,
    signatureVerified: fixtures.unsignedSignaturePreview.signatureValid,
    unsignedSignaturePreviewMetadata:
      fixtures.unsignedSignaturePreview.status === "unsigned" &&
      !fixtures.unsignedSignaturePreview.verificationSupported &&
      !fixtures.unsignedSignaturePreview.blocking,
    assetPolicyStatus: toState(
      fixtures.unsafeAssetPolicyBlocked.assetPolicyCheck.blocking,
      loadedResult.assetPolicyCheck.issues.some((issue) => issue.severity === "warning"),
    ),
    loadedInMemoryFixtureStatus: fixtures.loadedInMemorySampleBundle.status,
    blockedFixtureCount: blockedFixtureResults.filter((result) => result.status === "blocked").length,
    warningCount,
    errorCount,
    safety: {
      safeToReplaceActiveCatalog: false,
      safeToCommitCatalog: false,
      safeToWriteBundle: false,
      safeToUseSpriteAssetsInProduction: false,
      loaderExecutionEnabled: false,
      fileIoEnabled: false,
      filePickerEnabled: false,
      cacheFileIoEnabled: false,
      storageEnabled: false,
      uiExecutionEnabled: false,
      previewOnly: true,
    },
    boundaryNotes: [
      "Catalog bundle loader status bridge is serializable, React-free, in-memory, data-only, and UI-unwired.",
      "Bridge summarizes read-only .bl loader fixture readiness for future status surfaces.",
      "Bridge does not implement loader execution, file IO, file picker behavior, cache file IO, storage, UI execution, or .bl writing.",
      "Loaded status is an in-memory fixture state only and does not replace the active catalog.",
      "Unsigned signature is preview metadata only and does not represent verified trust.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate-review-gated.",
    ],
  };
}

export const sampleCatalogBundleLoaderStatusBridge =
  createCatalogBundleLoaderStatusBridge();
