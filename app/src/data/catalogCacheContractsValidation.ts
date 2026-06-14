import {
  sampleCatalogCacheContractFixture,
  type CatalogCacheContractFixture,
  type CatalogCacheEntryMetadata,
  type CatalogCacheFallbackDecision,
} from "./catalogCacheContracts";

export type CatalogCacheContractsValidationSeverity = "error" | "warning";

export type CatalogCacheContractsValidationCode =
  | "cache-entry-missing"
  | "cache-key-unsafe"
  | "fallback-policy-mismatch"
  | "read-model-safety-open"
  | "runtime-storage-implied"
  | "trust-gate-open"
  | "validation-requirement-missing";

export interface CatalogCacheContractsValidationIssue {
  code: CatalogCacheContractsValidationCode;
  severity: CatalogCacheContractsValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogCacheContractsValidationResult {
  isValid: boolean;
  issues: CatalogCacheContractsValidationIssue[];
  contractCount: number;
  checkedRules: string[];
}

const requiredFreshnessStatuses: CatalogCacheEntryMetadata["freshnessStatus"][] = [
  "fresh",
  "stale",
  "expired",
  "invalid",
];

const forbiddenKeyFragments = [
  "\\",
  "://",
  "file:",
  "localStorage",
  "IndexedDB",
  "SQLite",
  ".sqlite",
  ".db",
  "Electron",
  "filesystem",
  "backend",
];

const runtimeStorageFragments = [
  "use localStorage",
  "use IndexedDB",
  "use SQLite",
  "write .bl",
  "cache file IO",
  "filesystem path",
  "backend storage",
  "durable persistence",
  "UI wiring",
  "runCatalogLiveFetchPrototype",
];

const addIssue = (
  issues: CatalogCacheContractsValidationIssue[],
  code: CatalogCacheContractsValidationCode,
  path: string,
  message: string,
) => {
  issues.push({
    code,
    severity: "error",
    path,
    message,
  });
};

const keyLooksUnsafe = (key: string) => {
  if (/^[a-zA-Z]:/.test(key) || key.startsWith("/")) {
    return true;
  }

  return forbiddenKeyFragments.some((fragment) =>
    key.toLowerCase().includes(fragment.toLowerCase()),
  );
};

const textImpliesRuntimeStorage = (text: string) => {
  const normalized = text.toLowerCase();

  return runtimeStorageFragments.some((fragment) => {
    const normalizedFragment = fragment.toLowerCase();

    return (
      normalized.includes(normalizedFragment) &&
      !normalized.includes("do not") &&
      !normalized.includes("does not") &&
      !normalized.includes("no ") &&
      !normalized.includes("without") &&
      !normalized.includes("not implement")
    );
  });
};

const validateNotes = (
  issues: CatalogCacheContractsValidationIssue[],
  path: string,
  notes: readonly string[],
) => {
  notes.forEach((note, index) => {
    if (textImpliesRuntimeStorage(note)) {
      addIssue(
        issues,
        "runtime-storage-implied",
        `${path}[${index}]`,
        "Cache contract notes must not imply runtime storage, UI wiring, cache file IO, or .bl writing.",
      );
    }
  });
};

const validateEntry = (
  issues: CatalogCacheContractsValidationIssue[],
  entry: CatalogCacheEntryMetadata,
  index: number,
) => {
  const path = `sampleCatalogCacheContractFixture.entries[${index}]`;

  if (keyLooksUnsafe(entry.logicalKey)) {
    addIssue(
      issues,
      "cache-key-unsafe",
      `${path}.logicalKey`,
      "Cache keys must stay logical and metadata-only, with no paths, schemes, or storage backend names.",
    );
  }

  if (
    entry.freshnessStatus === "stale" ||
    entry.freshnessStatus === "expired" ||
    entry.freshnessStatus === "invalid"
  ) {
    if (!entry.warningRequired) {
      addIssue(
        issues,
        "fallback-policy-mismatch",
        `${path}.warningRequired`,
        "Stale, expired, and invalid cache examples must remain warning-bearing.",
      );
    }
  }

  if (entry.freshnessStatus === "expired" && entry.canUseForOfflineFallback) {
    addIssue(
      issues,
      "fallback-policy-mismatch",
      `${path}.canUseForOfflineFallback`,
      "Expired cache examples must not be usable for offline fallback.",
    );
  }

  if (entry.freshnessStatus === "invalid" && entry.trustLevel !== "untrusted") {
    addIssue(
      issues,
      "trust-gate-open",
      `${path}.trustLevel`,
      "Invalid cache examples must remain untrusted.",
    );
  }

  if (
    entry.safeToCommitCatalog ||
    entry.safeToWriteBundle ||
    entry.safeToUseSpriteAssetsInProduction
  ) {
    addIssue(
      issues,
      "trust-gate-open",
      path,
      "Cache contract examples must keep commit, bundle write, and production sprite safety flags closed.",
    );
  }

  validateNotes(issues, `${path}.notes`, entry.notes);
};

const validateDecision = (
  issues: CatalogCacheContractsValidationIssue[],
  decision: CatalogCacheFallbackDecision,
  entriesById: Map<string, CatalogCacheEntryMetadata>,
  index: number,
) => {
  const path = `sampleCatalogCacheContractFixture.fallbackDecisions[${index}]`;

  if (decision.cacheEntryId && !entriesById.has(decision.cacheEntryId)) {
    addIssue(
      issues,
      "cache-entry-missing",
      `${path}.cacheEntryId`,
      `Fallback decision references missing cache entry '${decision.cacheEntryId}'.`,
    );
  }

  if (decision.decision.startsWith("block") && decision.canUseEntry) {
    addIssue(
      issues,
      "fallback-policy-mismatch",
      `${path}.canUseEntry`,
      "Blocked fallback decisions must not allow cache entry use.",
    );
  }

  if (
    (decision.fromStatus === "stale" ||
      decision.fromStatus === "expired" ||
      decision.fromStatus === "invalid") &&
    !decision.warningRequired
  ) {
    addIssue(
      issues,
      "fallback-policy-mismatch",
      `${path}.warningRequired`,
      "Stale, expired, and invalid fallback decisions must stay warning-bearing.",
    );
  }

  if (
    !decision.requiresSourceValidation ||
    !decision.requiresGeneratedCatalogValidation
  ) {
    addIssue(
      issues,
      "validation-requirement-missing",
      path,
      "Fallback decisions must require source and generated catalog validation before trust.",
    );
  }

  if (decision.safeToCommitCatalog) {
    addIssue(
      issues,
      "trust-gate-open",
      `${path}.safeToCommitCatalog`,
      "Fallback decisions must not open a catalog commit path.",
    );
  }

  validateNotes(issues, `${path}.notes`, decision.notes);
};

export function validateCatalogCacheContracts(
  fixture: CatalogCacheContractFixture = sampleCatalogCacheContractFixture,
): CatalogCacheContractsValidationResult {
  const issues: CatalogCacheContractsValidationIssue[] = [];
  const entriesById = new Map(fixture.entries.map((entry) => [entry.id, entry]));
  const statuses = new Set(fixture.entries.map((entry) => entry.freshnessStatus));

  requiredFreshnessStatuses.forEach((status) => {
    if (!statuses.has(status)) {
      addIssue(
        issues,
        "cache-entry-missing",
        "sampleCatalogCacheContractFixture.entries",
        `Expected cache freshness example '${status}' is missing.`,
      );
    }
  });

  if (keyLooksUnsafe(fixture.namespacePolicy.namespace)) {
    addIssue(
      issues,
      "cache-key-unsafe",
      "sampleCatalogCacheContractFixture.namespacePolicy.namespace",
      "Cache namespace must be a logical identifier only.",
    );
  }

  validateNotes(
    issues,
    "sampleCatalogCacheContractFixture.namespacePolicy.notes",
    fixture.namespacePolicy.notes,
  );
  validateNotes(issues, "sampleCatalogCacheContractFixture.notes", fixture.notes);

  fixture.entries.forEach((entry, index) => validateEntry(issues, entry, index));
  fixture.fallbackDecisions.forEach((decision, index) =>
    validateDecision(issues, decision, entriesById, index),
  );

  const requirements = fixture.validationRequirements;

  if (
    !requirements.sourceValidationRequired ||
    !requirements.generatedCatalogValidationRequired ||
    !requirements.bundleHashValidationRequired ||
    !requirements.sourceErrorsBlockGeneratedCatalog ||
    !requirements.generatedCatalogErrorsBlockBundle ||
    !requirements.errorsBlockTrust
  ) {
    addIssue(
      issues,
      "validation-requirement-missing",
      "sampleCatalogCacheContractFixture.validationRequirements",
      "Source, generated catalog, bundle hash, and blocking validation requirements must remain enabled.",
    );
  }

  if (requirements.bundleSignatureRequired) {
    addIssue(
      issues,
      "validation-requirement-missing",
      "sampleCatalogCacheContractFixture.validationRequirements.bundleSignatureRequired",
      "Bundle signatures are future fields and must not be required by this preview fixture.",
    );
  }

  if (
    fixture.readModelSafety.safeToCommitCatalog ||
    fixture.readModelSafety.safeToWriteBundle ||
    fixture.readModelSafety.safeToUseSpriteAssetsInProduction ||
    !fixture.readModelSafety.previewOnly ||
    fixture.readModelSafety.executionEnabled ||
    fixture.readModelSafety.fileIoEnabled
  ) {
    addIssue(
      issues,
      "read-model-safety-open",
      "sampleCatalogCacheContractFixture.readModelSafety",
      "Read-model safety flags must remain preview-only with commit, bundle write, production sprite use, execution, and file IO closed.",
    );
  }

  validateNotes(
    issues,
    "sampleCatalogCacheContractFixture.validationRequirements.notes",
    requirements.notes,
  );

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    contractCount: fixture.entries.length + fixture.fallbackDecisions.length,
    checkedRules: [
      "cache namespace and keys are logical metadata only",
      "fresh, stale, expired, and invalid cache status examples are present",
      "stale, expired, and invalid examples remain warning-bearing",
      "expired and invalid cache examples are blocked from trusted fallback",
      "fallback decisions require source and generated catalog validation",
      "source and generated catalog errors block downstream trust",
      "bundle hash validation remains required while signatures stay future-only",
      "commit, .bl writing, production sprite, execution, and file IO safety flags remain closed",
      "PokeAPI remains enrichment-only",
      "Pokemon Showdown remains legality and simulation source of truth",
      "sprite metadata remains candidate-review-gated",
    ],
  };
}

export const sampleCatalogCacheContractsValidation = validateCatalogCacheContracts();
