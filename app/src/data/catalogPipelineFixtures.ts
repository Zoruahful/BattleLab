import type {
  BattleLabCatalogBundleSectionName,
} from "../types/catalogBundle";
import type {
  CatalogSourceMetadata,
} from "../types/catalog";
import type {
  CatalogPipelineBundleEmissionSummary,
  CatalogPipelineGeneratedCatalogSummary,
  CatalogPipelineGeneratedSectionSummaries,
  CatalogPipelineGenerationRequest,
  CatalogPipelineNormalizationWarning,
  CatalogPipelinePickerSearchPlan,
  CatalogPipelineSectionProgress,
  CatalogPipelineSourceMismatch,
  CatalogPipelineSourceSnapshot,
  CatalogPipelineValidationResult,
} from "../types/catalogPipeline";
import {
  localCatalogSeed,
  localCatalogSeedAbilities,
  localCatalogSeedAssets,
  localCatalogSeedItems,
  localCatalogSeedMoves,
  localCatalogSeedNatures,
  localCatalogSeedPokemon,
  localCatalogSeedSearchIndex,
  localCatalogSeedSources,
  localCatalogSeedTypes,
} from "./catalogSeed";
import { createSampleBattleLabCatalogBundleWithHashes } from "./catalogBundleHashes";
import { validateBattleLabCatalogBundleHashes } from "./catalogBundleHashes";

const generatedAt = "2026-06-13T12:00:00.000Z";
const requestedAt = "2026-06-13T12:05:00.000Z";
const completedAt = "2026-06-13T12:06:00.000Z";

const catalogPipelineSectionNames: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const sectionRecordCounts: Record<BattleLabCatalogBundleSectionName, number> = {
  pokemon: localCatalogSeedPokemon.length,
  moves: localCatalogSeedMoves.length,
  abilities: localCatalogSeedAbilities.length,
  items: localCatalogSeedItems.length,
  types: localCatalogSeedTypes.length,
  natures: localCatalogSeedNatures.length,
  assets: localCatalogSeedAssets.length,
  searchIndex: localCatalogSeedSearchIndex.length,
};

const showdownAuthoritySource: CatalogSourceMetadata = {
  sourceId: "source-showdown-authority",
  kind: "pokemon-showdown",
  name: "Pokemon Showdown legality and simulation authority",
  documentationUrl: "https://pokemonshowdown.com/",
  version: "future-local-authority",
  fetchedAt: generatedAt,
  requiresAttribution: true,
};

export const sampleCatalogPipelineSourceSnapshots: CatalogPipelineSourceSnapshot[] = [
  {
    sourceId: "source-battlelab-seed",
    role: "manualSeed",
    kind: "bundled",
    name: "BattleLab local seed catalog",
    version: "seed-0.1",
    generatedAt,
    recordCount:
      localCatalogSeedPokemon.length +
      localCatalogSeedMoves.length +
      localCatalogSeedAbilities.length +
      localCatalogSeedItems.length +
      localCatalogSeedTypes.length +
      localCatalogSeedNatures.length,
    requiresAttribution: false,
    notes: ["Local seed data is a compact fixture source, not a production sync result."],
  },
  {
    sourceId: "source-pokeapi-candidate",
    role: "enrichment",
    kind: "pokeapi",
    name: "PokeAPI candidate enrichment source",
    version: "candidate",
    fetchedAt: generatedAt,
    documentationUrl: "https://pokeapi.co/docs/v2",
    recordCount: localCatalogSeedPokemon.length + localCatalogSeedMoves.length,
    requiresAttribution: false,
    notes: ["Candidate only for names, descriptions, stats, and sprite metadata enrichment."],
  },
  {
    sourceId: "source-showdown-authority",
    role: "legalityAuthority",
    kind: "pokemon-showdown",
    name: "Pokemon Showdown id/source authority",
    version: "future-local-authority",
    fetchedAt: generatedAt,
    documentationUrl: "https://pokemonshowdown.com/",
    recordCount: localCatalogSeedPokemon.length,
    requiresAttribution: true,
    notes: ["Showdown remains the future legality and simulation source of truth."],
  },
  {
    sourceId: "source-showdown-sprite-candidate",
    role: "assetCandidate",
    kind: "pokemon-showdown",
    name: "Pokemon Showdown animated sprite candidate",
    version: "candidate",
    fetchedAt: generatedAt,
    recordCount: localCatalogSeedAssets.filter((asset) => asset.kind === "pokemon-animated-sprite").length,
    requiresAttribution: true,
    notes: ["Metadata-only candidate; not approved for bundled production assets."],
  },
  {
    sourceId: "source-smogon-sprite-candidate",
    role: "assetCandidate",
    kind: "pokemon-showdown",
    name: "Smogon Pokemon Showdown sprite repository candidate",
    version: "candidate",
    fetchedAt: generatedAt,
    documentationUrl: "https://github.com/smogon/sprites",
    requiresAttribution: true,
    notes: ["Sprite ownership and licensing require review before production use."],
  },
];

export const sampleCatalogPipelineGenerationRequest: CatalogPipelineGenerationRequest = {
  id: "catalog-pipeline-dry-run-local-seed",
  mode: "dryRun",
  requestedAt,
  catalogVersion: localCatalogSeed.manifest.schemaVersion,
  targetBundleExtension: ".bl",
  sourceSnapshots: sampleCatalogPipelineSourceSnapshots,
  sourceMetadata: [...localCatalogSeedSources, showdownAuthoritySource],
  sectionNames: catalogPipelineSectionNames,
  assetPolicy: {
    includeCandidateUrls: true,
    requireLicenseReview: true,
    allowedAssetKinds: [
      "pokemon-icon",
      "pokemon-sprite",
      "pokemon-animated-sprite",
      "pokemon-artwork",
      "item-icon",
      "type-icon",
    ],
    allowRemoteRuntimeUrls: false,
    defaultFallbackBehavior: "use-text",
  },
  includeSearchIndex: true,
  includeVisualAssetMetadata: true,
  notes: [
    "Fixture request demonstrates data shapes only.",
    "No generator execution, file IO, network sync, or loader behavior is implied.",
  ],
};

export const sampleCatalogPipelineSectionProgress: CatalogPipelineSectionProgress[] =
  catalogPipelineSectionNames.map((section) => ({
    section,
    status: section === "assets" ? "warning" : "complete",
    progressPercent: 100,
    recordsRead: sectionRecordCounts[section],
    recordsWritten: sectionRecordCounts[section],
    warningCount: section === "assets" ? 1 : 0,
    errorCount: 0,
    message:
      section === "assets"
        ? "Asset metadata normalized with candidate source licensing still under review."
        : "Local seed section normalized for dry-run fixture output.",
    startedAt: requestedAt,
    completedAt,
  }));

export const sampleCatalogPipelineNormalizationWarnings: CatalogPipelineNormalizationWarning[] = [
  {
    id: "warning-asset-license-review-required",
    code: "asset-license-review-required",
    severity: "warning",
    section: "assets",
    sourceId: "source-showdown-sprite-candidate",
    catalogKey: "asset-pokemon-tyranitar-animated",
    message: "Animated sprite candidate remains metadata-only until licensing review is complete.",
  },
  {
    id: "warning-showdown-legality-deferred",
    code: "validation-deferred",
    severity: "info",
    section: "moves",
    sourceId: "source-showdown-authority",
    catalogKey: "move-spore",
    showdownId: "spore",
    message: "Move legality is intentionally deferred to Pokemon Showdown.",
    deferredToShowdown: true,
  },
  {
    id: "warning-candidate-description-missing",
    code: "source-field-missing",
    severity: "info",
    section: "items",
    sourceId: "source-pokeapi-candidate",
    catalogKey: "item-clear-amulet",
    showdownId: "clearamulet",
    message: "Candidate enrichment may omit display copy; local seed description is retained.",
  },
];

export const sampleCatalogPipelineSourceMismatches: CatalogPipelineSourceMismatch[] = [
  {
    id: "mismatch-tyranitar-alias",
    kind: "alias",
    section: "pokemon",
    catalogKey: "pokemon-tyranitar",
    showdownId: "tyranitar",
    sourceId: "source-battlelab-seed",
    sourceValue: "Ttar",
    normalizedValue: "Tyranitar",
    status: "sourceMismatch",
    resolution: "manual-review",
    message: "Alias remains searchable, but display identity follows the normalized catalog name.",
  },
  {
    id: "mismatch-spore-legality",
    kind: "move",
    section: "moves",
    catalogKey: "move-spore",
    showdownId: "spore",
    sourceId: "source-showdown-authority",
    sourceValue: "format-dependent",
    normalizedValue: "catalog-enrichment-only",
    status: "unknown",
    resolution: "use-showdown",
    message: "Catalog keeps move metadata only; format legality is decided by Showdown.",
  },
  {
    id: "mismatch-animated-sprite-source",
    kind: "asset",
    section: "assets",
    catalogKey: "asset-pokemon-talonflame-animated",
    sourceId: "source-showdown-sprite-candidate",
    sourceValue: "candidate remote animated GIF",
    normalizedValue: "local cache key with fallback",
    status: "catalogOnly",
    resolution: "manual-review",
    message: "Candidate source URL is retained as metadata and is not a runtime sprite source.",
  },
];

export const sampleCatalogPipelineGeneratedSectionSummaries: CatalogPipelineGeneratedSectionSummaries =
  catalogPipelineSectionNames.reduce((summaries, section) => {
    summaries[section] = {
      section,
      recordCount: sectionRecordCounts[section],
      sourceIds: localCatalogSeedSources.map((source) => source.sourceId),
      warningCount: section === "assets" ? 1 : 0,
      errorCount: 0,
      generatedAt,
    };

    return summaries;
  }, {} as CatalogPipelineGeneratedSectionSummaries);

export const sampleCatalogPipelineGeneratedCatalogSummary: CatalogPipelineGeneratedCatalogSummary = {
  catalogVersion: localCatalogSeed.manifest.schemaVersion,
  generatedAt,
  catalog: localCatalogSeed,
  sections: sampleCatalogPipelineGeneratedSectionSummaries,
  warnings: sampleCatalogPipelineNormalizationWarnings,
  mismatches: sampleCatalogPipelineSourceMismatches,
};

export const sampleCatalogPipelinePickerSearchPlan: CatalogPipelinePickerSearchPlan = {
  pickerKinds: ["pokemon", "move", "ability", "item", "type", "nature"],
  includeAliases: true,
  includeDescriptions: true,
  includeShowdownIds: true,
  includeTypeTokens: true,
  expectedIndexSections: catalogPipelineSectionNames,
};

export async function createSampleCatalogPipelineBundleEmissionSummary(): Promise<CatalogPipelineBundleEmissionSummary> {
  const bundle = await createSampleBattleLabCatalogBundleWithHashes();

  return {
    bundleFormat: bundle.manifest.bundleFormat,
    fileExtension: bundle.fileExtension,
    readOnly: bundle.readOnly,
    manifest: bundle.manifest,
    sectionHashes: bundle.manifest.sectionHashes,
    bundleHash: bundle.manifest.bundleHash,
    signatureStatus: bundle.manifest.signature.status,
    emittedAt: completedAt,
    warningCount: sampleCatalogPipelineNormalizationWarnings.filter(
      (warning) => warning.severity === "warning",
    ).length,
    errorCount: sampleCatalogPipelineNormalizationWarnings.filter(
      (warning) => warning.severity === "error",
    ).length,
  };
}

export async function createSampleCatalogPipelineValidationResult(): Promise<CatalogPipelineValidationResult> {
  const bundle = await createSampleBattleLabCatalogBundleWithHashes();
  const bundleValidation = await validateBattleLabCatalogBundleHashes(bundle);
  const bundleEmission = await createSampleCatalogPipelineBundleEmissionSummary();
  const errorCount =
    sampleCatalogPipelineNormalizationWarnings.filter((warning) => warning.severity === "error").length +
    bundleValidation.issues.filter((issue) => issue.severity === "error").length;

  return {
    status: errorCount > 0 ? "failed" : "completeWithWarnings",
    isValid: bundleValidation.isValid && errorCount === 0,
    generatedCatalog: sampleCatalogPipelineGeneratedCatalogSummary,
    bundleEmission,
    sections: sampleCatalogPipelineSectionProgress,
    warnings: sampleCatalogPipelineNormalizationWarnings,
    mismatches: sampleCatalogPipelineSourceMismatches,
    bundleIssues: bundleValidation.issues,
    message:
      errorCount > 0
        ? "Sample pipeline fixture has validation errors."
        : "Sample pipeline fixture is valid with candidate-source warnings.",
  };
}
