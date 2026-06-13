import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionHashes,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationResult,
} from "../types/catalogBundle";
import {
  battleLabCatalogBundleCanonicalization,
  createBattleLabCatalogBundleHash,
  createBattleLabCatalogBundleSectionHashes,
  validateBattleLabCatalogBundleHashes,
} from "./catalogBundleHashes";
import { sampleGeneratedPokeApiCatalog } from "./catalogGeneratorPrototype";
import { validateGeneratedPokeApiCatalogPrototype } from "./catalogGeneratorPrototypeValidation";

const generatedBundleSectionNames: BattleLabCatalogBundleSectionName[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
  "assets",
  "searchIndex",
];

const createPlaceholderHash = (sectionName: string): BattleLabCatalogBundleHash => ({
  algorithm: "unknown",
  value: `placeholder-generated-pokeapi-${sectionName}`,
  canonicalization: "placeholder-unhashed-generated-pokeapi-fixture",
});

const placeholderSectionHashes = generatedBundleSectionNames.reduce(
  (hashes, sectionName) => ({
    ...hashes,
    [sectionName]: createPlaceholderHash(sectionName),
  }),
  {} as BattleLabCatalogBundleSectionHashes,
);

export const sampleGeneratedPokeApiCatalogBundle: BattleLabCatalogBundle = {
  fileExtension: ".bl",
  readOnly: true,
  manifest: {
    bundleFormat: "battlelab-catalog",
    fileExtension: ".bl",
    schemaVersion: "battlelab-catalog-bundle-0.1",
    catalogVersion: sampleGeneratedPokeApiCatalog.manifest.schemaVersion,
    generatedAt: sampleGeneratedPokeApiCatalog.manifest.generatedAt,
    appCompatibility: {
      minAppVersion: "0.0.0",
      compatibleAppMajor: 0,
      notes: [
        "Generated PokeAPI snapshot .bl fixture is in-memory data only.",
        "This fixture demonstrates generated catalog-to-bundle shape and is not a real .bl file.",
      ],
    },
    sourceVersions: sampleGeneratedPokeApiCatalog.manifest.sources.map((source) => ({
      sourceId: source.sourceId,
      kind: source.kind,
      name: source.name,
      ...(source.version ? { version: source.version } : {}),
      ...(source.fetchedAt ? { fetchedAt: source.fetchedAt } : {}),
      ...(source.documentationUrl ? { documentationUrl: source.documentationUrl } : {}),
      requiresAttribution: source.requiresAttribution,
    })),
    recordCounts: {
      pokemon: sampleGeneratedPokeApiCatalog.pokemon.length,
      moves: sampleGeneratedPokeApiCatalog.moves.length,
      abilities: sampleGeneratedPokeApiCatalog.abilities.length,
      items: sampleGeneratedPokeApiCatalog.items.length,
      types: sampleGeneratedPokeApiCatalog.types.length,
      natures: sampleGeneratedPokeApiCatalog.natures.length,
      assets: sampleGeneratedPokeApiCatalog.assets.length,
      searchIndexEntries: sampleGeneratedPokeApiCatalog.searchIndex?.length ?? 0,
    },
    sectionHashes: placeholderSectionHashes,
    bundleHash: createPlaceholderHash("bundle"),
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
      ...sampleGeneratedPokeApiCatalog.manifest.warnings,
      "PokeAPI generated catalog data is enrichment-only. Pokemon Showdown remains legality and simulation authority.",
      "Candidate sprite metadata remains license-review gated and is not a runtime sprite source.",
      "Static bundle hashes are placeholders; use createSampleGeneratedPokeApiCatalogBundleWithHashes for deterministic validation.",
    ],
  },
  sections: {
    pokemon: sampleGeneratedPokeApiCatalog.pokemon,
    moves: sampleGeneratedPokeApiCatalog.moves,
    abilities: sampleGeneratedPokeApiCatalog.abilities,
    items: sampleGeneratedPokeApiCatalog.items,
    types: sampleGeneratedPokeApiCatalog.types,
    natures: sampleGeneratedPokeApiCatalog.natures,
    assets: sampleGeneratedPokeApiCatalog.assets,
    searchIndex: sampleGeneratedPokeApiCatalog.searchIndex ?? [],
  },
};

export async function createSampleGeneratedPokeApiCatalogBundleWithHashes(): Promise<BattleLabCatalogBundle> {
  const sectionHashes = await createBattleLabCatalogBundleSectionHashes(sampleGeneratedPokeApiCatalogBundle);
  const bundleWithSectionHashes: BattleLabCatalogBundle = {
    ...sampleGeneratedPokeApiCatalogBundle,
    manifest: {
      ...sampleGeneratedPokeApiCatalogBundle.manifest,
      sectionHashes,
      bundleHash: {
        algorithm: "unknown",
        value: "pending-generated-pokeapi-bundle-hash",
        canonicalization: battleLabCatalogBundleCanonicalization,
      },
      warnings: sampleGeneratedPokeApiCatalogBundle.manifest.warnings.filter(
        (warning) => !warning.includes("placeholder"),
      ),
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
}

export async function validateSampleGeneratedPokeApiCatalogBundle(): Promise<BattleLabCatalogBundleValidationResult> {
  const generatedCatalogResult = validateGeneratedPokeApiCatalogPrototype(sampleGeneratedPokeApiCatalog);
  const bundle = await createSampleGeneratedPokeApiCatalogBundleWithHashes();
  const bundleResult = await validateBattleLabCatalogBundleHashes(bundle);
  const issues = [...bundleResult.issues];

  generatedCatalogResult.issues.forEach((issue) => {
    issues.push({
      code: `generated-catalog-${issue.code}`,
      severity: issue.severity,
      path: `generatedCatalog.${issue.path}`,
      message: issue.message,
    });
  });

  const isValid = issues.every((issue) => issue.severity !== "error");

  return {
    status: isValid ? "loaded" : "invalid",
    isValid,
    issues,
  };
}
