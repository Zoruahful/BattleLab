import type { CatalogPickerOption, CatalogSearchIndexEntry } from "../types/catalog";
import {
  createPlannedExpansionLocalPickerProjection,
  type CatalogPlannedExpansionPickerProjection,
  type CatalogPlannedExpansionPickerProjectionSection,
} from "./catalogPlannedExpansionPickerProjection";

export type CatalogPlannedExpansionPickerCoverageValidationSeverity = "error" | "warning";

export type CatalogPlannedExpansionPickerCoverageValidationCode =
  | "asset-review-policy-open"
  | "duplicate-catalog-key"
  | "duplicate-showdown-id"
  | "identity-label-coupled"
  | "metadata-weak"
  | "projection-failed"
  | "search-token-missing";

export interface CatalogPlannedExpansionPickerCoverageValidationIssue {
  code: CatalogPlannedExpansionPickerCoverageValidationCode;
  severity: CatalogPlannedExpansionPickerCoverageValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogPlannedExpansionPickerCoverageSectionSummary {
  section: CatalogPlannedExpansionPickerProjectionSection;
  optionCount: number;
  searchIndexCount: number;
  duplicateCatalogKeys: string[];
  duplicateShowdownIds: string[];
  missingSearchTokenCount: number;
  weakMetadataCount: number;
}

export interface CatalogPlannedExpansionPickerCoverageValidationResult {
  isValid: boolean;
  issues: CatalogPlannedExpansionPickerCoverageValidationIssue[];
  projection: CatalogPlannedExpansionPickerProjection | null;
  sectionSummaries: CatalogPlannedExpansionPickerCoverageSectionSummary[];
}

const pickerSectionToKind = {
  pokemon: "pokemon",
  moves: "move",
  abilities: "ability",
  items: "item",
  types: "type",
  natures: "nature",
} as const;

const createIssue = (
  code: CatalogPlannedExpansionPickerCoverageValidationCode,
  severity: CatalogPlannedExpansionPickerCoverageValidationSeverity,
  path: string,
  message: string,
): CatalogPlannedExpansionPickerCoverageValidationIssue => ({
  code,
  severity,
  path,
  message,
});

const findDuplicates = (values: string[]) =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

const hasUsefulSearchTokens = (option: CatalogPickerOption, searchEntry?: CatalogSearchIndexEntry) => {
  if (!searchEntry || searchEntry.tokens.length === 0) {
    return false;
  }

  const tokenValues = searchEntry.tokens.map((token) => token.value.trim().toLowerCase()).filter(Boolean);

  return tokenValues.includes(option.displayName.toLowerCase()) || Boolean(option.showdownId && tokenValues.includes(option.showdownId));
};

const hasUsefulMetadata = (
  section: CatalogPlannedExpansionPickerProjectionSection,
  option: CatalogPickerOption,
) => {
  if (section === "pokemon") {
    return Boolean(option.primaryType && option.tags.length > 0);
  }

  if (section === "moves") {
    return Boolean(option.primaryType && option.description && option.tags.length >= 2);
  }

  if (section === "types") {
    return Boolean(option.primaryType && option.tags.includes("type"));
  }

  return Boolean(option.description || option.tags.length > 0 || option.aliases.length > 0);
};

const validateSection = (
  projection: CatalogPlannedExpansionPickerProjection,
  section: CatalogPlannedExpansionPickerProjectionSection,
  issues: CatalogPlannedExpansionPickerCoverageValidationIssue[],
): CatalogPlannedExpansionPickerCoverageSectionSummary => {
  const options = projection.optionSets[section];
  const searchEntries = projection.searchIndex.filter((entry) => entry.kind === pickerSectionToKind[section]);
  const searchEntryByCatalogKey = new Map(searchEntries.map((entry) => [entry.catalogKey, entry]));
  const duplicateCatalogKeys = findDuplicates(options.map((option) => option.catalogKey));
  const duplicateShowdownIds = findDuplicates(
    options.map((option) => option.showdownId).filter((showdownId): showdownId is string => Boolean(showdownId)),
  );
  let missingSearchTokenCount = 0;
  let weakMetadataCount = 0;

  duplicateCatalogKeys.forEach((catalogKey) => {
    issues.push(
      createIssue(
        "duplicate-catalog-key",
        "error",
        `optionSets.${section}.${catalogKey}`,
        `Duplicate catalogKey '${catalogKey}' found in planned-expansion ${section} picker options.`,
      ),
    );
  });

  duplicateShowdownIds.forEach((showdownId) => {
    issues.push(
      createIssue(
        "duplicate-showdown-id",
        "error",
        `optionSets.${section}.${showdownId}`,
        `Duplicate showdownId '${showdownId}' found in planned-expansion ${section} picker options.`,
      ),
    );
  });

  options.forEach((option) => {
    if (option.displayName === option.catalogKey || option.displayName === option.showdownId) {
      issues.push(
        createIssue(
          "identity-label-coupled",
          "error",
          `optionSets.${section}.${option.catalogKey}.displayName`,
          `${section} displayName must remain separate from catalog identity.`,
        ),
      );
    }

    if (!hasUsefulSearchTokens(option, searchEntryByCatalogKey.get(option.catalogKey))) {
      missingSearchTokenCount += 1;
      issues.push(
        createIssue(
          "search-token-missing",
          "error",
          `optionSets.${section}.${option.catalogKey}.searchIndex`,
          `${section} option '${option.displayName}' must have useful search tokens for large local picker lists.`,
        ),
      );
    }

    if (!hasUsefulMetadata(section, option)) {
      weakMetadataCount += 1;
      issues.push(
        createIssue(
          "metadata-weak",
          "warning",
          `optionSets.${section}.${option.catalogKey}`,
          `${section} option '${option.displayName}' has sparse metadata for large-list picker display.`,
        ),
      );
    }
  });

  return {
    section,
    optionCount: options.length,
    searchIndexCount: searchEntries.length,
    duplicateCatalogKeys,
    duplicateShowdownIds,
    missingSearchTokenCount,
    weakMetadataCount,
  };
};

export async function validatePlannedExpansionPickerCoverageQuality(): Promise<CatalogPlannedExpansionPickerCoverageValidationResult> {
  const issues: CatalogPlannedExpansionPickerCoverageValidationIssue[] = [];
  let projection: CatalogPlannedExpansionPickerProjection | null = null;

  try {
    projection = await createPlannedExpansionLocalPickerProjection();
  } catch (error) {
    issues.push(
      createIssue(
        "projection-failed",
        "error",
        "createPlannedExpansionLocalPickerProjection",
        error instanceof Error ? error.message : "Planned-expansion picker projection failed.",
      ),
    );

    return {
      isValid: false,
      issues,
      projection,
      sectionSummaries: [],
    };
  }

  const assetKeys = new Set(projection.fixture.catalog.assets.map((asset) => asset.assetKey));
  const unsafeAssets = projection.fixture.catalog.assets.filter(
    (asset) =>
      (assetKeys.has(asset.assetKey) && asset.candidateSourceUrl && asset.licenseReviewStatus !== "needsReview") ||
      Boolean(asset.sourceUrl),
  );

  unsafeAssets.forEach((asset) => {
    issues.push(
      createIssue(
        "asset-review-policy-open",
        "error",
        `assets.${asset.assetKey}.licenseReviewStatus`,
        `Asset '${asset.assetKey}' must remain candidate-review-gated and must not expose approved production source URLs.`,
      ),
    );
  });

  const sectionSummaries = (Object.keys(pickerSectionToKind) as CatalogPlannedExpansionPickerProjectionSection[]).map(
    (section) => validateSection(projection, section, issues),
  );

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    projection,
    sectionSummaries,
  };
}
