import type {
  BattleLabCatalog,
  CatalogAssetLicenseReviewStatus,
  CatalogKey,
  CatalogRecordBase,
} from "../types/catalog";
import { localCatalogSeed } from "./catalogSeed";
import { sampleGeneratedPokeApiCatalog } from "./catalogGeneratorPrototype";

export type CatalogGeneratedSnapshotComparisonSectionName =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures"
  | "assets"
  | "searchIndex";

export type CatalogGeneratedSnapshotAssetReviewStatus =
  | "not-applicable"
  | "review-gated"
  | "review-needed";

export interface CatalogGeneratedSnapshotSourceAlignment {
  expectedSourceIds: string[];
  actualSourceIds: string[];
  matchedSourceIds: string[];
  missingSourceIds: string[];
  addedSourceIds: string[];
  pokeApiEnrichmentOnly: boolean;
  showdownAuthorityPreserved: boolean;
}

export interface CatalogGeneratedSnapshotAssetReviewSummary {
  status: CatalogGeneratedSnapshotAssetReviewStatus;
  candidateAssetCount: number;
  needsReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  unknownCount: number;
}

export interface CatalogGeneratedSnapshotSectionComparison {
  section: CatalogGeneratedSnapshotComparisonSectionName;
  expectedCount: number;
  actualCount: number;
  countDelta: number;
  matchedCatalogKeys: CatalogKey[];
  missingCatalogKeys: CatalogKey[];
  addedCatalogKeys: CatalogKey[];
  sourceMetadataAlignment: CatalogGeneratedSnapshotSourceAlignment;
  candidateAssetReviewStatus: CatalogGeneratedSnapshotAssetReviewSummary;
}

export interface CatalogGeneratedSnapshotComparison {
  id: string;
  expectedLabel: string;
  actualLabel: string;
  generatedAt: string;
  sections: CatalogGeneratedSnapshotSectionComparison[];
  notes: string[];
}

const comparisonGeneratedAt = "2026-06-14T19:30:00.000Z";

const comparisonSections: CatalogGeneratedSnapshotComparisonSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

type CatalogComparableRecord = CatalogRecordBase | { assetKey: CatalogKey } | { catalogKey: CatalogKey; kind?: string };

const getSectionRecords = (
  catalog: BattleLabCatalog,
  section: CatalogGeneratedSnapshotComparisonSectionName,
): CatalogComparableRecord[] => {
  if (section === "assets") return catalog.assets;
  if (section === "searchIndex") return catalog.searchIndex ?? [];

  return catalog[section];
};

const getRecordKey = (
  record: CatalogComparableRecord,
  section: CatalogGeneratedSnapshotComparisonSectionName,
): CatalogKey => {
  if (section === "assets" && "assetKey" in record) return record.assetKey;
  if (section === "searchIndex" && "kind" in record) return `${record.kind}:${record.catalogKey}`;

  return "catalogKey" in record ? record.catalogKey : "";
};

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const getSectionKeys = (catalog: BattleLabCatalog, section: CatalogGeneratedSnapshotComparisonSectionName) =>
  uniqueSorted(getSectionRecords(catalog, section).map((record) => getRecordKey(record, section)).filter(Boolean));

const getSourceIds = (catalog: BattleLabCatalog) =>
  uniqueSorted(catalog.manifest.sources.map((source) => source.sourceId));

const getSourceAlignment = (
  expectedCatalog: BattleLabCatalog,
  actualCatalog: BattleLabCatalog,
): CatalogGeneratedSnapshotSourceAlignment => {
  const expectedSourceIds = getSourceIds(expectedCatalog);
  const actualSourceIds = getSourceIds(actualCatalog);
  const matchedSourceIds = expectedSourceIds.filter((sourceId) => actualSourceIds.includes(sourceId));

  return {
    expectedSourceIds,
    actualSourceIds,
    matchedSourceIds,
    missingSourceIds: expectedSourceIds.filter((sourceId) => !actualSourceIds.includes(sourceId)),
    addedSourceIds: actualSourceIds.filter((sourceId) => !expectedSourceIds.includes(sourceId)),
    pokeApiEnrichmentOnly: actualCatalog.manifest.sources.some((source) => source.kind === "pokeapi") &&
      actualCatalog.manifest.warnings.some((warning) => warning.toLowerCase().includes("enrichment-only")),
    showdownAuthorityPreserved: actualCatalog.manifest.warnings.some((warning) =>
      warning.toLowerCase().includes("showdown"),
    ),
  };
};

const summarizeAssetReview = (
  catalog: BattleLabCatalog,
  section: CatalogGeneratedSnapshotComparisonSectionName,
): CatalogGeneratedSnapshotAssetReviewSummary => {
  if (section !== "assets") {
    return {
      status: "not-applicable",
      candidateAssetCount: 0,
      needsReviewCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      unknownCount: 0,
    };
  }

  const candidateAssets = catalog.assets.filter((asset) => Boolean(asset.candidateSourceUrl));
  const countStatus = (status: CatalogAssetLicenseReviewStatus) =>
    candidateAssets.filter((asset) => asset.licenseReviewStatus === status).length;
  const needsReviewCount = countStatus("needsReview");
  const approvedCount = countStatus("approved");
  const rejectedCount = countStatus("rejected");
  const unknownCount = countStatus("unknown");

  return {
    status: candidateAssets.length === needsReviewCount ? "review-gated" : "review-needed",
    candidateAssetCount: candidateAssets.length,
    needsReviewCount,
    approvedCount,
    rejectedCount,
    unknownCount,
  };
};

export function compareCatalogGeneratedSnapshots(
  expectedCatalog: BattleLabCatalog = localCatalogSeed,
  actualCatalog: BattleLabCatalog = sampleGeneratedPokeApiCatalog,
  expectedLabel = "BattleLab local catalog seed",
  actualLabel = "Generated PokeAPI catalog snapshot",
): CatalogGeneratedSnapshotComparison {
  const sourceMetadataAlignment = getSourceAlignment(expectedCatalog, actualCatalog);

  return {
    id: "catalog-generated-snapshot-comparison",
    expectedLabel,
    actualLabel,
    generatedAt: comparisonGeneratedAt,
    sections: comparisonSections.map((section) => {
      const expectedKeys = getSectionKeys(expectedCatalog, section);
      const actualKeys = getSectionKeys(actualCatalog, section);

      return {
        section,
        expectedCount: expectedKeys.length,
        actualCount: actualKeys.length,
        countDelta: actualKeys.length - expectedKeys.length,
        matchedCatalogKeys: expectedKeys.filter((key) => actualKeys.includes(key)),
        missingCatalogKeys: expectedKeys.filter((key) => !actualKeys.includes(key)),
        addedCatalogKeys: actualKeys.filter((key) => !expectedKeys.includes(key)),
        sourceMetadataAlignment,
        candidateAssetReviewStatus: summarizeAssetReview(actualCatalog, section),
      };
    }),
    notes: [
      "Comparison is in-memory and data-only.",
      "Comparison does not write .bl files, load catalog bundles, or perform cache file IO.",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
      "No Catalog Update UI wiring, backend, persistence, report generation, production sprite rendering, or simulation work is implemented.",
    ],
  };
}

export const sampleCatalogGeneratedSnapshotComparison =
  compareCatalogGeneratedSnapshots();
