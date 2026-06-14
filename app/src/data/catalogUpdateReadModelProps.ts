import type {
  CatalogGeneratedSnapshotAssetReviewStatus,
  CatalogGeneratedSnapshotComparison,
  CatalogGeneratedSnapshotComparisonSectionName,
} from "./catalogGeneratedSnapshotComparison";
import { sampleCatalogGeneratedSnapshotComparison } from "./catalogGeneratedSnapshotComparison";
import type {
  CatalogRuntimeAdapterPhase,
  CatalogRuntimeAdapterReadModel,
} from "./catalogRuntimeAdapterBoundary";
import {
  sampleCatalogRuntimeOrchestratorPreview,
  type CatalogRuntimeOrchestratorPreview,
} from "./catalogRuntimeOrchestratorPreview";

export type CatalogUpdateReadModelSectionKey = CatalogGeneratedSnapshotComparisonSectionName;

export interface CatalogUpdateReadModelSectionProps {
  section: CatalogUpdateReadModelSectionKey;
  label: string;
  expectedCount: number;
  actualCount: number;
  countDelta: number;
  matchedKeyCount: number;
  missingKeyCount: number;
  addedKeyCount: number;
  warningCount: number;
  errorCount: number;
  candidateAssetReviewStatus: CatalogGeneratedSnapshotAssetReviewStatus;
  progressPercent: number;
  statusLabel: string;
}

export interface CatalogUpdateReadModelSafetyProps {
  safeToCommitCatalog: false;
  safeToWriteBundle: false;
  safeToUseSpriteAssetsInProduction: false;
  previewOnly: true;
  executionEnabled: false;
  fileIoEnabled: false;
}

export interface CatalogUpdateReadModelProps {
  id: string;
  phase: CatalogRuntimeAdapterPhase;
  status: CatalogRuntimeAdapterReadModel["status"];
  statusLabel: string;
  message: string;
  progressPercent: number;
  warningCount: number;
  errorCount: number;
  sections: CatalogUpdateReadModelSectionProps[];
  safety: CatalogUpdateReadModelSafetyProps;
  boundaryNotes: string[];
}

const sectionLabels: Record<CatalogUpdateReadModelSectionKey, string> = {
  pokemon: "Pokemon",
  moves: "Moves",
  abilities: "Abilities",
  items: "Items",
  types: "Types",
  natures: "Natures",
  assets: "Visual assets",
  searchIndex: "Search index",
};

const getSectionStatusLabel = (missingKeyCount: number, addedKeyCount: number, errorCount: number) => {
  if (errorCount > 0) return "Needs review";
  if (missingKeyCount > 0) return "Gaps found";
  if (addedKeyCount > 0) return "Expanded";

  return "In sync";
};

const getSectionProgressPercent = (
  matchedKeyCount: number,
  missingKeyCount: number,
  actualCount: number,
) => {
  const baselineTotal = matchedKeyCount + missingKeyCount;

  if (baselineTotal === 0) return actualCount > 0 ? 100 : 0;

  return Math.round((matchedKeyCount / baselineTotal) * 100);
};

const toSectionProps = (
  comparison: CatalogGeneratedSnapshotComparison,
): CatalogUpdateReadModelSectionProps[] =>
  comparison.sections.map((section) => {
    const missingKeyCount = section.missingCatalogKeys.length;
    const addedKeyCount = section.addedCatalogKeys.length;
    const matchedKeyCount = section.matchedCatalogKeys.length;
    const errorCount = section.candidateAssetReviewStatus.status === "review-needed" ? 1 : 0;
    const warningCount =
      missingKeyCount +
      (section.countDelta !== 0 ? 1 : 0) +
      (section.candidateAssetReviewStatus.status === "review-gated" ? 1 : 0);

    return {
      section: section.section,
      label: sectionLabels[section.section],
      expectedCount: section.expectedCount,
      actualCount: section.actualCount,
      countDelta: section.countDelta,
      matchedKeyCount,
      missingKeyCount,
      addedKeyCount,
      warningCount,
      errorCount,
      candidateAssetReviewStatus: section.candidateAssetReviewStatus.status,
      progressPercent: getSectionProgressPercent(matchedKeyCount, missingKeyCount, section.actualCount),
      statusLabel: getSectionStatusLabel(missingKeyCount, addedKeyCount, errorCount),
    };
  });

const getReadModel = (orchestratorPreview: CatalogRuntimeOrchestratorPreview) =>
  orchestratorPreview.states.find((state) => state.key === "completeWithWarnings")?.readModel ??
  orchestratorPreview.states[0].readModel;

export function createCatalogUpdateReadModelProps(
  orchestratorPreview: CatalogRuntimeOrchestratorPreview = sampleCatalogRuntimeOrchestratorPreview,
  comparison: CatalogGeneratedSnapshotComparison = sampleCatalogGeneratedSnapshotComparison,
): CatalogUpdateReadModelProps {
  const readModel = getReadModel(orchestratorPreview);
  const sections = toSectionProps(comparison);
  const warningCount =
    readModel.progress.warningCount + sections.reduce((total, section) => total + section.warningCount, 0);
  const errorCount =
    readModel.progress.errorCount + sections.reduce((total, section) => total + section.errorCount, 0);

  return {
    id: "catalog-update-read-model-props-preview",
    phase: readModel.phase,
    status: readModel.status,
    statusLabel: readModel.statusLabel,
    message: readModel.message,
    progressPercent: readModel.progress.progressPercent,
    warningCount,
    errorCount,
    sections,
    safety: {
      safeToCommitCatalog: false,
      safeToWriteBundle: false,
      safeToUseSpriteAssetsInProduction: false,
      previewOnly: true,
      executionEnabled: false,
      fileIoEnabled: false,
    },
    boundaryNotes: [
      "Catalog Update read-model props are data-only and UI-safe.",
      "Props do not import React or wire CatalogUpdatePanel.",
      "Props do not call runCatalogLiveFetchPrototype().",
      "PokeAPI/catalog data remains enrichment-only.",
      "Pokemon Showdown remains legality and simulation source of truth.",
      "Sprite metadata remains candidate/review-gated only.",
      "No .bl writing, loader behavior, cache file IO, backend, Electron, SQLite, PDF, Theater decoding, report generation, durable persistence, production sprite rendering, finalized sprite licensing, or simulation work is implemented.",
    ],
  };
}

export const sampleCatalogUpdateReadModelProps =
  createCatalogUpdateReadModelProps();
