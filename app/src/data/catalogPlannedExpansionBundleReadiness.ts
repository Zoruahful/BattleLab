import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionHashes,
  BattleLabCatalogBundleSectionName,
} from "../types/catalogBundle";
import { battleLabCatalogBundleCanonicalization, createBattleLabCatalogBundleHash, createBattleLabCatalogBundleSectionHashes } from "./catalogBundleHashes";
import {
  validatePlannedExpansionPickerCoverageQuality,
  type CatalogPlannedExpansionPickerCoverageSectionSummary,
  type CatalogPlannedExpansionPickerCoverageValidationResult,
} from "./catalogPlannedExpansionPickerCoverageValidation";
import type { CatalogPlannedExpansionPickerProjection } from "./catalogPlannedExpansionPickerProjection";

export interface CatalogPlannedExpansionBundleReadinessSafety {
  previewOnly: true;
  fileIoEnabled: false;
  loaderExecutionEnabled: false;
  pokemonEditorWiringEnabled: false;
  catalogUpdatePanelWiringEnabled: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
}

export interface CatalogPlannedExpansionBundleReadinessAssetReviewSummary {
  totalAssets: number;
  candidateReviewGatedAssets: number;
  approvedAssets: number;
  rejectedAssets: number;
  unknownAssets: number;
  productionSourceUrlCount: number;
  isReviewGated: boolean;
}

export interface CatalogPlannedExpansionBundleReadinessSectionSummary {
  section: BattleLabCatalogBundleSectionName;
  generatedCatalogCount: number;
  pickerOptionCount?: number;
  searchIndexCount?: number;
  readyForBundle: boolean;
}

export interface CatalogPlannedExpansionBundleReadiness {
  id: string;
  generatedFrom: "planned-expansion-picker-projection";
  projection: CatalogPlannedExpansionPickerProjection;
  coverageValidation: CatalogPlannedExpansionPickerCoverageValidationResult;
  bundle: BattleLabCatalogBundle;
  sectionSummaries: CatalogPlannedExpansionBundleReadinessSectionSummary[];
  pickerSummaries: CatalogPlannedExpansionPickerCoverageSectionSummary[];
  assetReview: CatalogPlannedExpansionBundleReadinessAssetReviewSummary;
  safety: CatalogPlannedExpansionBundleReadinessSafety;
  notes: string[];
}

const bundleSectionNames: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const placeholderHash = (label: string): BattleLabCatalogBundleHash => ({
  algorithm: "unknown",
  value: `pending-planned-expansion-${label}`,
  canonicalization: battleLabCatalogBundleCanonicalization,
});

const placeholderSectionHashes = bundleSectionNames.reduce(
  (hashes, sectionName) => ({
    ...hashes,
    [sectionName]: placeholderHash(sectionName),
  }),
  {} as BattleLabCatalogBundleSectionHashes,
);

const pruneUndefinedValues = <TValue>(value: TValue): TValue => {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefinedValues(item)) as TValue;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, pruneUndefinedValues(item)]),
  ) as TValue;
};

const createAssetReviewSummary = (
  projection: CatalogPlannedExpansionPickerProjection,
): CatalogPlannedExpansionBundleReadinessAssetReviewSummary => {
  const assets = projection.fixture.catalog.assets;
  const candidateReviewGatedAssets = assets.filter((asset) => asset.licenseReviewStatus === "needsReview").length;
  const productionSourceUrlCount = assets.filter((asset) => Boolean(asset.sourceUrl)).length;

  return {
    totalAssets: assets.length,
    candidateReviewGatedAssets,
    approvedAssets: assets.filter((asset) => asset.licenseReviewStatus === "approved").length,
    rejectedAssets: assets.filter((asset) => asset.licenseReviewStatus === "rejected").length,
    unknownAssets: assets.filter((asset) => asset.licenseReviewStatus === "unknown").length,
    productionSourceUrlCount,
    isReviewGated: assets.length === candidateReviewGatedAssets && productionSourceUrlCount === 0,
  };
};

const createBaseBundle = (projection: CatalogPlannedExpansionPickerProjection): BattleLabCatalogBundle => {
  const catalog = projection.fixture.catalog;

  return pruneUndefinedValues({
    fileExtension: ".bl",
    readOnly: true,
    manifest: {
      bundleFormat: "battlelab-catalog",
      fileExtension: ".bl",
      schemaVersion: "battlelab-catalog-bundle-0.1",
      catalogVersion: catalog.manifest.schemaVersion,
      generatedAt: catalog.manifest.generatedAt,
      appCompatibility: {
        minAppVersion: "0.0.0",
        compatibleAppMajor: 0,
        notes: [
          "Planned-expansion bundle readiness is in-memory data only.",
          "This readiness bundle is not a written .bl file and does not imply loader execution.",
        ],
      },
      sourceVersions: catalog.manifest.sources.map((source) => ({
        sourceId: source.sourceId,
        kind: source.kind,
        name: source.name,
        ...(source.version ? { version: source.version } : {}),
        ...(source.fetchedAt ? { fetchedAt: source.fetchedAt } : {}),
        ...(source.documentationUrl ? { documentationUrl: source.documentationUrl } : {}),
        requiresAttribution: source.requiresAttribution,
      })),
      recordCounts: {
        pokemon: catalog.pokemon.length,
        moves: catalog.moves.length,
        abilities: catalog.abilities.length,
        items: catalog.items.length,
        types: catalog.types.length,
        natures: catalog.natures.length,
        assets: catalog.assets.length,
        searchIndexEntries: catalog.searchIndex?.length ?? 0,
      },
      sectionHashes: placeholderSectionHashes,
      bundleHash: placeholderHash("bundle"),
      signature: {
        status: "unsigned",
      },
      assetPolicy: {
        allowRemoteUrls: false,
        bundledAssetsPreferred: true,
        licenseReviewRequired: true,
        allowUnreviewedCandidateSources: false,
        fallbackRequired: true,
      },
      warnings: [
        ...catalog.manifest.warnings,
        "PokeAPI planned-expansion catalog data is enrichment-only.",
        "Pokemon Showdown remains legality and simulation source of truth.",
        "Sprite metadata remains candidate-review-gated and is not approved production sprite sourcing.",
        "This readiness bundle is in-memory only and does not write .bl files.",
      ],
    },
    sections: {
      pokemon: catalog.pokemon,
      moves: catalog.moves,
      abilities: catalog.abilities,
      items: catalog.items,
      types: catalog.types,
      natures: catalog.natures,
      assets: catalog.assets,
      searchIndex: catalog.searchIndex ?? [],
    },
  });
};

const createSectionSummaries = (
  projection: CatalogPlannedExpansionPickerProjection,
  bundle: BattleLabCatalogBundle,
): CatalogPlannedExpansionBundleReadinessSectionSummary[] =>
  bundleSectionNames.map((section) => {
    const generatedCatalogCount = bundle.sections[section].length;
    const pickerSummary = projection.sectionSummaries.find((summary) => summary.section === section);

    return {
      section,
      generatedCatalogCount,
      ...(pickerSummary ? { pickerOptionCount: pickerSummary.optionCount } : {}),
      ...(pickerSummary ? { searchIndexCount: pickerSummary.searchIndexCount } : {}),
      readyForBundle: generatedCatalogCount > 0,
    };
  });

const createBundleWithHashes = async (baseBundle: BattleLabCatalogBundle): Promise<BattleLabCatalogBundle> => {
  const sectionHashes = await createBattleLabCatalogBundleSectionHashes(baseBundle);
  const bundleWithSectionHashes: BattleLabCatalogBundle = {
    ...baseBundle,
    manifest: {
      ...baseBundle.manifest,
      sectionHashes,
      bundleHash: placeholderHash("bundle-hash"),
    },
  };
  const bundleHash = await createBattleLabCatalogBundleHash(bundleWithSectionHashes);

  return {
    ...bundleWithSectionHashes,
    manifest: {
      ...bundleWithSectionHashes.manifest,
      bundleHash,
    },
  };
};

export async function createPlannedExpansionBundleReadiness(): Promise<CatalogPlannedExpansionBundleReadiness> {
  const coverageValidation = await validatePlannedExpansionPickerCoverageQuality();

  if (!coverageValidation.isValid || !coverageValidation.projection) {
    throw new Error("Planned-expansion picker projection must validate before bundle readiness can be created.");
  }

  const projection = coverageValidation.projection;
  const bundle = await createBundleWithHashes(createBaseBundle(projection));

  return {
    id: "catalog-planned-expansion-bundle-readiness",
    generatedFrom: "planned-expansion-picker-projection",
    projection,
    coverageValidation,
    bundle,
    sectionSummaries: createSectionSummaries(projection, bundle),
    pickerSummaries: coverageValidation.sectionSummaries,
    assetReview: createAssetReviewSummary(projection),
    safety: {
      previewOnly: true,
      fileIoEnabled: false,
      loaderExecutionEnabled: false,
      pokemonEditorWiringEnabled: false,
      catalogUpdatePanelWiringEnabled: false,
      safeToWriteBundle: false,
      safeToUseSpriteAssetsInProduction: false,
    },
    notes: [
      "Readiness is created only through an explicit async helper and does not trigger live fetch at import time.",
      "Readiness is in-memory data only and does not write .bl files.",
      "Readiness does not implement loader execution.",
      "Readiness does not wire Pokemon Editor or CatalogUpdatePanel.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate-review-gated only.",
    ],
  };
}
