import type {
  BattleLabCatalog,
  CatalogAssetReference,
  CatalogKey,
  CatalogRecordBase,
  CatalogSearchIndexEntry,
  ShowdownId,
} from "../types/catalog";
import { sampleGeneratedPokeApiCatalog } from "./catalogGeneratorPrototype";

export type CatalogGeneratorPrototypeValidationSeverity = "error" | "warning";

export type CatalogGeneratorPrototypeValidationCode =
  | "candidate-asset-review-required"
  | "duplicate-asset-key"
  | "duplicate-catalog-key"
  | "duplicate-showdown-id"
  | "invalid-asset-reference"
  | "invalid-search-reference"
  | "invalid-source-reference"
  | "missing-required-section"
  | "record-count-mismatch";

export interface CatalogGeneratorPrototypeValidationIssue {
  code: CatalogGeneratorPrototypeValidationCode;
  severity: CatalogGeneratorPrototypeValidationSeverity;
  message: string;
  path: string;
}

export interface CatalogGeneratorPrototypeValidationResult {
  isValid: boolean;
  issues: CatalogGeneratorPrototypeValidationIssue[];
}

type GeneratedRecord = CatalogRecordBase & {
  kind: string;
};

const addIssue = (
  issues: CatalogGeneratorPrototypeValidationIssue[],
  issue: CatalogGeneratorPrototypeValidationIssue,
) => {
  issues.push(issue);
};

const collectDuplicates = <TValue extends string>(
  values: Array<{ value?: TValue; path: string }>,
) => {
  const seen = new Map<TValue, string[]>();

  values.forEach(({ value, path }) => {
    if (!value) return;
    seen.set(value, [...(seen.get(value) ?? []), path]);
  });

  return [...seen.entries()].filter(([, paths]) => paths.length > 1);
};

const validateCount = (
  issues: CatalogGeneratorPrototypeValidationIssue[],
  path: string,
  expected: number | undefined,
  actual: number,
) => {
  if (expected !== actual) {
    addIssue(issues, {
      code: "record-count-mismatch",
      severity: "error",
      path,
      message: `Expected ${expected ?? "missing"} records, found ${actual}.`,
    });
  }
};

const validateNonEmpty = (
  issues: CatalogGeneratorPrototypeValidationIssue[],
  section: keyof Pick<
    BattleLabCatalog,
    "pokemon" | "moves" | "abilities" | "items" | "types" | "natures" | "assets" | "searchIndex"
  >,
  count: number | undefined,
) => {
  if (!count) {
    addIssue(issues, {
      code: "missing-required-section",
      severity: "error",
      path: section,
      message: `Generated prototype catalog must include at least one ${section} record.`,
    });
  }
};

const validateAssetReference = (
  issues: CatalogGeneratorPrototypeValidationIssue[],
  asset: CatalogAssetReference | undefined,
  path: string,
  knownAssetKeys: Set<CatalogKey>,
) => {
  if (!asset) return;

  const refs = [
    { key: asset.iconKey, label: "iconKey" },
    { key: asset.spriteKey, label: "spriteKey" },
    { key: asset.animatedSpriteKey, label: "animatedSpriteKey" },
    { key: asset.artworkKey, label: "artworkKey" },
  ];

  refs.forEach(({ key, label }) => {
    if (key && !knownAssetKeys.has(key)) {
      addIssue(issues, {
        code: "invalid-asset-reference",
        severity: "error",
        path: `${path}.${label}`,
        message: `Unknown asset key "${key}".`,
      });
    }
  });
};

const getSearchRecordKey = (entry: CatalogSearchIndexEntry) => `${entry.kind}:${entry.catalogKey}`;

export function validateGeneratedPokeApiCatalogPrototype(
  catalog: BattleLabCatalog = sampleGeneratedPokeApiCatalog,
): CatalogGeneratorPrototypeValidationResult {
  const issues: CatalogGeneratorPrototypeValidationIssue[] = [];
  const knownSourceIds = new Set(catalog.manifest.sources.map((source) => source.sourceId));
  const knownAssetKeys = new Set(catalog.assets.map((asset) => asset.assetKey));
  const records: GeneratedRecord[] = [
    ...catalog.pokemon,
    ...catalog.moves,
    ...catalog.abilities,
    ...catalog.items,
    ...catalog.types,
    ...catalog.natures,
  ];
  const knownRecordKeys = new Set(records.map((record) => `${record.kind}:${record.catalogKey}`));

  validateCount(issues, "manifest.recordCounts.pokemon", catalog.manifest.recordCounts.pokemon, catalog.pokemon.length);
  validateCount(issues, "manifest.recordCounts.moves", catalog.manifest.recordCounts.moves, catalog.moves.length);
  validateCount(
    issues,
    "manifest.recordCounts.abilities",
    catalog.manifest.recordCounts.abilities,
    catalog.abilities.length,
  );
  validateCount(issues, "manifest.recordCounts.items", catalog.manifest.recordCounts.items, catalog.items.length);
  validateCount(issues, "manifest.recordCounts.types", catalog.manifest.recordCounts.types, catalog.types.length);
  validateCount(issues, "manifest.recordCounts.natures", catalog.manifest.recordCounts.natures, catalog.natures.length);
  validateCount(issues, "manifest.recordCounts.assets", catalog.manifest.recordCounts.assets, catalog.assets.length);
  validateCount(
    issues,
    "manifest.recordCounts.searchIndexEntries",
    catalog.manifest.recordCounts.searchIndexEntries,
    catalog.searchIndex?.length ?? 0,
  );

  validateNonEmpty(issues, "pokemon", catalog.pokemon.length);
  validateNonEmpty(issues, "moves", catalog.moves.length);
  validateNonEmpty(issues, "abilities", catalog.abilities.length);
  validateNonEmpty(issues, "items", catalog.items.length);
  validateNonEmpty(issues, "types", catalog.types.length);
  validateNonEmpty(issues, "natures", catalog.natures.length);
  validateNonEmpty(issues, "assets", catalog.assets.length);
  validateNonEmpty(issues, "searchIndex", catalog.searchIndex?.length);

  collectDuplicates(
    records.map((record) => ({
      value: record.catalogKey,
      path: `${record.kind}.${record.catalogKey}`,
    })),
  ).forEach(([catalogKey, paths]) => {
    addIssue(issues, {
      code: "duplicate-catalog-key",
      severity: "error",
      path: paths.join(", "),
      message: `Duplicate catalogKey "${catalogKey}".`,
    });
  });

  collectDuplicates(
    records.map((record) => ({
      value: record.showdownId as ShowdownId | undefined,
      path: `${record.kind}.${record.catalogKey}`,
    })),
  ).forEach(([showdownId, paths]) => {
    addIssue(issues, {
      code: "duplicate-showdown-id",
      severity: "warning",
      path: paths.join(", "),
      message: `Duplicate showdownId "${showdownId}" in generated prototype catalog.`,
    });
  });

  collectDuplicates(
    catalog.assets.map((asset) => ({
      value: asset.assetKey,
      path: `assets.${asset.assetKey}`,
    })),
  ).forEach(([assetKey, paths]) => {
    addIssue(issues, {
      code: "duplicate-asset-key",
      severity: "error",
      path: paths.join(", "),
      message: `Duplicate assetKey "${assetKey}".`,
    });
  });

  records.forEach((record) => {
    record.sourceIds.forEach((sourceId) => {
      if (!knownSourceIds.has(sourceId)) {
        addIssue(issues, {
          code: "invalid-source-reference",
          severity: "error",
          path: `${record.kind}.${record.catalogKey}.sourceIds`,
          message: `Unknown source id "${sourceId}".`,
        });
      }
    });
  });

  catalog.assets.forEach((asset) => {
    if (!knownSourceIds.has(asset.sourceId)) {
      addIssue(issues, {
        code: "invalid-source-reference",
        severity: "error",
        path: `assets.${asset.assetKey}.sourceId`,
        message: `Unknown source id "${asset.sourceId}".`,
      });
    }

    if (asset.candidateSourceUrl && asset.licenseReviewStatus !== "needsReview") {
      addIssue(issues, {
        code: "candidate-asset-review-required",
        severity: "warning",
        path: `assets.${asset.assetKey}.licenseReviewStatus`,
        message: `Candidate asset source "${asset.assetKey}" should remain license-review gated.`,
      });
    }
  });

  catalog.pokemon.forEach((pokemon) => {
    validateAssetReference(
      issues,
      {
        iconKey: pokemon.iconKey,
        spriteKey: pokemon.spriteKey,
        animatedSpriteKey: pokemon.animatedSpriteKey,
        artworkKey: pokemon.artworkKey,
      },
      `pokemon.${pokemon.catalogKey}`,
      knownAssetKeys,
    );

    pokemon.forms.forEach((form) => {
      validateAssetReference(
        issues,
        {
          iconKey: form.iconKey,
          spriteKey: form.spriteKey,
          animatedSpriteKey: form.animatedSpriteKey,
          artworkKey: form.artworkKey,
        },
        `pokemon.${pokemon.catalogKey}.forms.${form.catalogKey}`,
        knownAssetKeys,
      );
    });
  });

  catalog.items.forEach((item) => {
    validateAssetReference(
      issues,
      item.iconKey ? { iconKey: item.iconKey } : undefined,
      `items.${item.catalogKey}`,
      knownAssetKeys,
    );
  });

  catalog.searchIndex?.forEach((entry) => {
    if (!knownRecordKeys.has(getSearchRecordKey(entry))) {
      addIssue(issues, {
        code: "invalid-search-reference",
        severity: "error",
        path: `searchIndex.${entry.catalogKey}`,
        message: `Search index entry does not resolve to a ${entry.kind} catalog record.`,
      });
    }

    validateAssetReference(issues, entry.asset, `searchIndex.${entry.catalogKey}.asset`, knownAssetKeys);
  });

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export const sampleGeneratedPokeApiCatalogValidation =
  validateGeneratedPokeApiCatalogPrototype(sampleGeneratedPokeApiCatalog);
