import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleValidationIssue,
} from "../types/catalogBundle";
import type {
  BattleLabCatalogBundleLoaderContract,
  BattleLabCatalogBundleLoaderRequest,
  BattleLabCatalogBundleLoaderResult,
  BattleLabCatalogBundleSignatureStatusHandoff,
} from "../types/catalogBundleLoader";
import {
  sampleCatalogBundleLoaderFixtureExamples,
  type CatalogBundleLoaderFixtureExamples,
} from "./catalogBundleLoaderFixtures";

export type CatalogBundleLoaderFixtureValidationSeverity = "error" | "warning";

export type CatalogBundleLoaderFixtureValidationCode =
  | "active-catalog-replacement-enabled"
  | "authority-boundary-violation"
  | "blocked-fixture-not-blocked"
  | "bundle-not-catalog-only"
  | "bundle-not-read-only"
  | "execution-flag-enabled"
  | "fixture-not-serializable"
  | "missing-loader-fixture"
  | "signature-trust-overstated"
  | "unsafe-policy-not-blocked";

export interface CatalogBundleLoaderFixtureValidationIssue {
  code: CatalogBundleLoaderFixtureValidationCode;
  severity: CatalogBundleLoaderFixtureValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogBundleLoaderFixtureValidationResult {
  isValid: boolean;
  fixtureCount: number;
  checkedRules: string[];
  issues: CatalogBundleLoaderFixtureValidationIssue[];
}

const catalogOnlyTopLevelKeys = new Set(["fileExtension", "readOnly", "manifest", "sections"]);
const requiredBundleSections = new Set([
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
]);

const createIssue = (
  code: CatalogBundleLoaderFixtureValidationCode,
  path: string,
  message: string,
  severity: CatalogBundleLoaderFixtureValidationSeverity = "error",
): CatalogBundleLoaderFixtureValidationIssue => ({
  code,
  severity,
  path,
  message,
});

const pushIssue = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  code: CatalogBundleLoaderFixtureValidationCode,
  path: string,
  message: string,
  severity?: CatalogBundleLoaderFixtureValidationSeverity,
) => {
  issues.push(createIssue(code, path, message, severity));
};

const hasErrorSeverityIssue = (
  issues: BattleLabCatalogBundleValidationIssue[],
): boolean => issues.some((issue) => issue.severity === "error");

const validateSerializable = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  fixtures: CatalogBundleLoaderFixtureExamples,
) => {
  try {
    JSON.stringify(fixtures);
  } catch {
    pushIssue(
      issues,
      "fixture-not-serializable",
      "sampleCatalogBundleLoaderFixtureExamples",
      "Catalog bundle loader fixtures must remain serializable and data-only.",
    );
  }
};

const validateBundleBoundary = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  bundle: BattleLabCatalogBundle | undefined,
  path: string,
) => {
  if (!bundle) {
    return;
  }

  if (bundle.fileExtension !== ".bl" || bundle.manifest.fileExtension !== ".bl") {
    pushIssue(
      issues,
      "bundle-not-read-only",
      `${path}.fileExtension`,
      "Catalog loader fixtures must use the .bl extension.",
    );
  }

  if (bundle.readOnly !== true) {
    pushIssue(
      issues,
      "bundle-not-read-only",
      `${path}.readOnly`,
      "Catalog loader fixtures must keep .bl bundles read-only.",
    );
  }

  Object.keys(bundle).forEach((key) => {
    if (!catalogOnlyTopLevelKeys.has(key)) {
      pushIssue(
        issues,
        "bundle-not-catalog-only",
        `${path}.${key}`,
        "Catalog bundle fixtures must not include user teams, settings, reports, saves, runtime output, or generated artifacts.",
      );
    }
  });

  Object.keys(bundle.sections).forEach((key) => {
    if (!requiredBundleSections.has(key)) {
      pushIssue(
        issues,
        "bundle-not-catalog-only",
        `${path}.sections.${key}`,
        "Catalog bundle fixtures must contain catalog sections only.",
      );
    }
  });

  if (
    bundle.manifest.assetPolicy.allowUnreviewedCandidateSources ||
    !bundle.manifest.assetPolicy.licenseReviewRequired ||
    !bundle.manifest.assetPolicy.fallbackRequired
  ) {
    pushIssue(
      issues,
      "authority-boundary-violation",
      `${path}.manifest.assetPolicy`,
      "Sprite metadata must remain candidate-review-gated with fallback behavior.",
    );
  }
};

const validateRequestClosedFlags = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  request: BattleLabCatalogBundleLoaderRequest,
  path: string,
) => {
  const enabledFlags = [
    ["allowFileIo", request.allowFileIo],
    ["allowFilePicker", request.allowFilePicker],
    ["allowCacheFileIo", request.allowCacheFileIo],
    ["allowBundleWriting", request.allowBundleWriting],
    ["allowUiExecution", request.allowUiExecution],
    ["safetyPolicy.allowNetwork", request.safetyPolicy.allowNetwork],
    ["safetyPolicy.allowFileRead", request.safetyPolicy.allowFileRead],
    ["safetyPolicy.allowFileWrite", request.safetyPolicy.allowFileWrite],
    ["safetyPolicy.allowRuntimeUiWiring", request.safetyPolicy.allowRuntimeUiWiring],
    ["safetyPolicy.allowBundleWriting", request.safetyPolicy.allowBundleWriting],
  ];

  enabledFlags.forEach(([flagPath, enabled]) => {
    if (enabled) {
      pushIssue(
        issues,
        "execution-flag-enabled",
        `${path}.${flagPath}`,
        "Loader fixture flags must keep file IO, picker behavior, cache IO, storage, UI execution, and .bl writing closed.",
      );
    }
  });

  if (request.safetyPolicy.pokeApiRole !== "enrichment-only") {
    pushIssue(
      issues,
      "authority-boundary-violation",
      `${path}.safetyPolicy.pokeApiRole`,
      "PokeAPI/catalog data must remain enrichment-only.",
    );
  }

  if (request.safetyPolicy.showdownAuthority !== "legality-and-simulation-source-of-truth") {
    pushIssue(
      issues,
      "authority-boundary-violation",
      `${path}.safetyPolicy.showdownAuthority`,
      "Pokemon Showdown must remain legality and simulation source of truth.",
    );
  }

  if (!request.safetyPolicy.requireSpriteLicenseReview) {
    pushIssue(
      issues,
      "authority-boundary-violation",
      `${path}.safetyPolicy.requireSpriteLicenseReview`,
      "Sprite metadata must remain candidate-review-gated.",
    );
  }
};

const validateResultClosedFlags = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  result: BattleLabCatalogBundleLoaderResult,
  path: string,
) => {
  if (
    result.safeToReplaceActiveCatalog ||
    result.safeToCommitCatalog ||
    result.safeToWriteBundle ||
    result.safeToUseSpriteAssetsInProduction
  ) {
    pushIssue(
      issues,
      "active-catalog-replacement-enabled",
      path,
      "Loader result fixtures must keep replacement, commit, .bl writing, and production sprite-use safety flags closed.",
    );
  }

  validateBundleBoundary(issues, result.loadedBundle, `${path}.loadedBundle`);
};

const validateContractClosedFlags = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  contract: BattleLabCatalogBundleLoaderContract,
) => {
  validateRequestClosedFlags(issues, contract.request, "contract.request");

  const implementationFlags = contract.implementationFlags;
  Object.entries(implementationFlags).forEach(([key, enabled]) => {
    if (enabled) {
      pushIssue(
        issues,
        "execution-flag-enabled",
        `contract.implementationFlags.${key}`,
        "Contract fixture must not enable loader execution, file IO, file picker behavior, cache file IO, .bl writing, UI wiring, or durable persistence.",
      );
    }
  });

  const boundary = contract.catalogOnlyBoundary;
  if (
    boundary.bundleExtension !== ".bl" ||
    !boundary.readOnly ||
    !boundary.catalogEnrichmentOnly ||
    !boundary.excludesUserTeams ||
    !boundary.excludesSettings ||
    !boundary.excludesReports ||
    !boundary.excludesSaves ||
    !boundary.excludesRuntimeOutput ||
    !boundary.excludesGeneratedArtifacts
  ) {
    pushIssue(
      issues,
      "bundle-not-catalog-only",
      "contract.catalogOnlyBoundary",
      "Contract fixture must keep user teams, settings, reports, saves, runtime output, and generated artifacts outside .bl.",
    );
  }

  if (
    contract.authorityBoundary.pokeApiRole !== "enrichment-only" ||
    contract.authorityBoundary.showdownAuthority !== "legality-and-simulation-source-of-truth" ||
    contract.authorityBoundary.spriteMetadataPolicy !== "candidate-review-gated"
  ) {
    pushIssue(
      issues,
      "authority-boundary-violation",
      "contract.authorityBoundary",
      "Authority boundaries must preserve PokeAPI enrichment-only, Pokemon Showdown authority, and candidate-review-gated sprites.",
    );
  }
};

const validateUnsignedSignature = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  signature: BattleLabCatalogBundleSignatureStatusHandoff,
) => {
  if (
    signature.status !== "unsigned" ||
    signature.verificationRequired ||
    signature.verificationSupported ||
    signature.signatureValid ||
    signature.blocking
  ) {
    pushIssue(
      issues,
      "signature-trust-overstated",
      "unsignedSignaturePreview",
      "Unsigned signature fixture must remain status metadata only, not verified trust.",
    );
  }

  if (!signature.issues.some((issue) => issue.severity === "warning")) {
    pushIssue(
      issues,
      "signature-trust-overstated",
      "unsignedSignaturePreview.issues",
      "Unsigned signature status should remain visible as warning metadata.",
    );
  }
};

const validateBlockedFixture = (
  issues: CatalogBundleLoaderFixtureValidationIssue[],
  result: BattleLabCatalogBundleLoaderResult,
  path: string,
  expectedFailureMode: BattleLabCatalogBundleLoaderResult["failureMode"],
) => {
  if (result.status !== "blocked" || result.failureMode !== expectedFailureMode || !hasErrorSeverityIssue(result.issues)) {
    pushIssue(
      issues,
      "blocked-fixture-not-blocked",
      path,
      "Blocked loader fixture must expose blocked status, expected failure mode, and error-severity issues.",
    );
  }

  if (result.loadedBundle) {
    pushIssue(
      issues,
      "blocked-fixture-not-blocked",
      `${path}.loadedBundle`,
      "Blocked loader fixtures must not expose a loaded bundle.",
    );
  }

  validateResultClosedFlags(issues, result, path);
};

export function validateCatalogBundleLoaderFixtures(
  fixtures: CatalogBundleLoaderFixtureExamples = sampleCatalogBundleLoaderFixtureExamples,
): CatalogBundleLoaderFixtureValidationResult {
  const issues: CatalogBundleLoaderFixtureValidationIssue[] = [];

  validateSerializable(issues, fixtures);
  validateRequestClosedFlags(issues, fixtures.request, "request");

  if (
    fixtures.manifestPreflightSuccess.status !== "loaded" ||
    !fixtures.manifestPreflightSuccess.extensionValid ||
    !fixtures.manifestPreflightSuccess.bundleFormatValid ||
    !fixtures.manifestPreflightSuccess.readOnly ||
    !fixtures.manifestPreflightSuccess.catalogOnly
  ) {
    pushIssue(
      issues,
      "missing-loader-fixture",
      "manifestPreflightSuccess",
      "Manifest preflight success fixture must represent a readable, catalog-only .bl manifest shape.",
    );
  }

  validateUnsignedSignature(issues, fixtures.unsignedSignaturePreview);

  validateBlockedFixture(
    issues,
    fixtures.appCompatibilityBlocked,
    "appCompatibilityBlocked",
    "block-incompatible-bundle",
  );

  if (!fixtures.appCompatibilityBlocked.appCompatibility.blocking) {
    pushIssue(
      issues,
      "blocked-fixture-not-blocked",
      "appCompatibilityBlocked.appCompatibility",
      "Incompatible app fixture must block loading.",
    );
  }

  validateBlockedFixture(
    issues,
    fixtures.invalidSectionHashBlocked,
    "invalidSectionHashBlocked",
    "block-invalid-hash",
  );

  if (
    fixtures.invalidSectionHashBlocked.sectionHashValidation.allSectionHashesValid ||
    fixtures.invalidSectionHashBlocked.sectionHashValidation.invalidSections.length === 0
  ) {
    pushIssue(
      issues,
      "blocked-fixture-not-blocked",
      "invalidSectionHashBlocked.sectionHashValidation",
      "Invalid section hash fixture must explicitly fail section hash validation.",
    );
  }

  validateBlockedFixture(
    issues,
    fixtures.unsafeAssetPolicyBlocked,
    "unsafeAssetPolicyBlocked",
    "block-unsafe-assets",
  );

  if (
    !fixtures.unsafeAssetPolicyBlocked.assetPolicyCheck.blocking ||
    !fixtures.unsafeAssetPolicyBlocked.assetPolicyCheck.policy.allowUnreviewedCandidateSources
  ) {
    pushIssue(
      issues,
      "unsafe-policy-not-blocked",
      "unsafeAssetPolicyBlocked.assetPolicyCheck",
      "Unsafe asset policy fixture must block loading and demonstrate unreviewed candidate source rejection.",
    );
  }

  if (fixtures.loadedInMemorySampleBundle.status !== "loaded" || !fixtures.loadedInMemorySampleBundle.loadedBundle) {
    pushIssue(
      issues,
      "missing-loader-fixture",
      "loadedInMemorySampleBundle",
      "Loaded fixture must expose an in-memory sample .bl bundle state.",
    );
  }

  validateResultClosedFlags(issues, fixtures.loadedInMemorySampleBundle, "loadedInMemorySampleBundle");
  validateContractClosedFlags(issues, fixtures.contract);

  const checkedRules = [
    ".bl bundle fixtures stay read-only",
    "Catalog bundle data remains enrichment-only and catalog-only",
    "User teams, settings, reports, saves, runtime output, and generated artifacts remain outside .bl",
    "File IO, file picker behavior, cache file IO, storage, UI execution, and .bl writing remain closed",
    "Invalid hash, incompatible app, and unsafe asset policy examples block loading",
    "Unsigned signature is represented as status metadata only",
    "PokeAPI/catalog data remains enrichment-only",
    "Pokemon Showdown remains legality and simulation source of truth",
    "Sprite metadata remains candidate-review-gated",
  ];

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    fixtureCount: Object.keys(fixtures).length,
    checkedRules,
    issues,
  };
}

export const sampleCatalogBundleLoaderFixtureValidation =
  validateCatalogBundleLoaderFixtures();
