import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionHashes,
  BattleLabCatalogBundleSectionName,
} from '../types/catalogBundle'
import {
  localCatalogSeed,
  localCatalogSeedAbilities,
  localCatalogSeedAssets,
  localCatalogSeedItems,
  localCatalogSeedMoves,
  localCatalogSeedNatures,
  localCatalogSeedPokemon,
  localCatalogSeedSearchIndex,
  localCatalogSeedTypes,
} from './catalogSeed'

const bundleSectionNames: BattleLabCatalogBundleSectionName[] = [
  'pokemon',
  'moves',
  'abilities',
  'items',
  'types',
  'natures',
  'assets',
  'searchIndex',
]

const createPlaceholderHash = (sectionName: string): BattleLabCatalogBundleHash => ({
  algorithm: 'unknown',
  value: `placeholder-local-seed-${sectionName}`,
  canonicalization: 'placeholder-unhashed-local-seed-fixture',
})

const placeholderSectionHashes = bundleSectionNames.reduce(
  (hashes, sectionName) => ({
    ...hashes,
    [sectionName]: createPlaceholderHash(sectionName),
  }),
  {} as BattleLabCatalogBundleSectionHashes,
)

export const sampleBattleLabCatalogBundle: BattleLabCatalogBundle = {
  fileExtension: '.bl',
  readOnly: true,
  manifest: {
    bundleFormat: 'battlelab-catalog',
    fileExtension: '.bl',
    schemaVersion: 'battlelab-catalog-bundle-0.1',
    catalogVersion: localCatalogSeed.manifest.schemaVersion,
    generatedAt: localCatalogSeed.manifest.generatedAt,
    appCompatibility: {
      minAppVersion: '0.0.0',
      compatibleAppMajor: 0,
      notes: [
        'Sample local .bl bundle fixture for data validation only.',
        'This fixture is read-only catalog enrichment and is not a user save format.',
      ],
    },
    sourceVersions: localCatalogSeed.manifest.sources.map((source) => ({
      sourceId: source.sourceId,
      kind: source.kind,
      name: source.name,
      version: source.version,
      fetchedAt: source.fetchedAt,
      documentationUrl: source.documentationUrl,
      requiresAttribution: source.requiresAttribution,
    })),
    recordCounts: {
      pokemon: localCatalogSeedPokemon.length,
      moves: localCatalogSeedMoves.length,
      abilities: localCatalogSeedAbilities.length,
      items: localCatalogSeedItems.length,
      types: localCatalogSeedTypes.length,
      natures: localCatalogSeedNatures.length,
      assets: localCatalogSeedAssets.length,
      searchIndexEntries: localCatalogSeedSearchIndex.length,
    },
    sectionHashes: placeholderSectionHashes,
    bundleHash: createPlaceholderHash('bundle'),
    signature: {
      status: 'unsigned',
    },
    assetPolicy: {
      allowRemoteUrls: localCatalogSeed.manifest.assetPolicy.allowRemoteUrls,
      bundledAssetsPreferred: localCatalogSeed.manifest.assetPolicy.bundledAssetsPreferred,
      licenseReviewRequired: localCatalogSeed.manifest.assetPolicy.licenseReviewRequired,
      allowUnreviewedCandidateSources: false,
      fallbackRequired: true,
    },
    warnings: [
      ...localCatalogSeed.manifest.warnings,
      'Bundle hashes are explicit placeholders until canonical hashing is approved.',
      'Bundle signature is unsigned for the local sample fixture.',
    ],
  },
  sections: {
    pokemon: localCatalogSeedPokemon,
    moves: localCatalogSeedMoves,
    abilities: localCatalogSeedAbilities,
    items: localCatalogSeedItems,
    types: localCatalogSeedTypes,
    natures: localCatalogSeedNatures,
    assets: localCatalogSeedAssets,
    searchIndex: localCatalogSeedSearchIndex,
  },
}
