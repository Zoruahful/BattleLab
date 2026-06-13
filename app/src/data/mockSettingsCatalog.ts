import type { BattleLabSettings, CatalogUpdateSnapshot } from '../types/settingsCatalog'
import { localCatalogSeed, localCatalogSeedAssets } from './catalogSeed'
import { validateLocalCatalogSeedIntegrity } from './catalogSeedValidation'

const visualAssetCount = localCatalogSeedAssets.filter((asset) => asset.kind.startsWith('pokemon-')).length
const pickerAssetCount = localCatalogSeedAssets.length - visualAssetCount
const seedIntegrityResult = validateLocalCatalogSeedIntegrity()
const seedIntegrity = {
  isValid: seedIntegrityResult.isValid,
  errorCount: seedIntegrityResult.issues.filter((issue) => issue.severity === 'error').length,
  warningCount: seedIntegrityResult.issues.filter((issue) => issue.severity === 'warning').length,
  issues: seedIntegrityResult.issues,
}

export const localBattleLabSettings: BattleLabSettings = {
  theme: 'light',
  defaultFormat: 'vgc-regulation-h',
  generationCap: 'Gen 9',
  statEditorMode: 'standard-evs',
  animationsEnabled: true,
  autosaveTeams: true,
  diagnosticsEnabled: false,
  defaultPerformanceProfileId: 'profile-balanced',
  checkCatalogUpdatesOnLaunch: false,
}

export const fakeCatalogUpdateSnapshot: CatalogUpdateSnapshot = {
  status: seedIntegrity.isValid ? 'ready' : 'error',
  lastCheckedAt: localCatalogSeed.manifest.generatedAt,
  lastUpdatedAt: localCatalogSeed.manifest.generatedAt,
  schemaVersion: localCatalogSeed.manifest.schemaVersion,
  sources: localCatalogSeed.manifest.sources,
  categories: [
    {
      id: 'pokemon',
      label: 'Pokemon',
      description: 'Names, forms, types, base stat previews, and visual metadata keys.',
      recordCount: localCatalogSeed.manifest.recordCounts.pokemon,
      status: 'current',
    },
    {
      id: 'move',
      label: 'Moves',
      description: 'Move names, types, categories, targeting, and short helper descriptions.',
      recordCount: localCatalogSeed.manifest.recordCounts.moves,
      status: 'current',
    },
    {
      id: 'ability',
      label: 'Abilities',
      description: 'Ability names and short beginner-readable descriptions for pickers.',
      recordCount: localCatalogSeed.manifest.recordCounts.abilities,
      status: 'current',
    },
    {
      id: 'item',
      label: 'Items',
      description: 'Held item names, descriptions, and future item icon keys.',
      recordCount: localCatalogSeed.manifest.recordCounts.items,
      status: 'current',
    },
    {
      id: 'type',
      label: 'Types',
      description: 'Type labels, colors, and matchup helper metadata.',
      recordCount: localCatalogSeed.manifest.recordCounts.types,
      status: 'current',
    },
    {
      id: 'nature',
      label: 'Natures',
      description: 'Stat up/down metadata for the Pokemon editor training controls.',
      recordCount: localCatalogSeed.manifest.recordCounts.natures,
      status: 'current',
    },
    {
      id: 'picker-assets',
      label: 'Picker assets',
      description: 'Compact item, type, and shared picker asset metadata for local option lists.',
      recordCount: pickerAssetCount,
      status: 'needsReview',
    },
    {
      id: 'visual-assets',
      label: 'Pokemon visuals',
      description: 'Icon, static sprite, animated sprite, artwork, cache keys, and source-review metadata.',
      recordCount: visualAssetCount,
      status: 'needsReview',
    },
    {
      id: 'search-index',
      label: 'Picker search index',
      description: 'Prepared local search tokens for Pokemon, moves, abilities, items, types, and natures.',
      recordCount: localCatalogSeed.manifest.recordCounts.searchIndexEntries ?? 0,
      status: 'current',
    },
  ],
  progress: {
    status: 'idle',
    activeSourceIds: [],
    message: 'Local preview only. Seed data is bundled and no network sync is running.',
    categories: [
      { id: 'pokemon', status: 'complete', progressPercent: 100 },
      { id: 'move', status: 'complete', progressPercent: 100 },
      { id: 'ability', status: 'complete', progressPercent: 100 },
      { id: 'item', status: 'complete', progressPercent: 100 },
      { id: 'type', status: 'complete', progressPercent: 100 },
      { id: 'nature', status: 'complete', progressPercent: 100 },
      { id: 'picker-assets', status: 'blocked', progressPercent: 55 },
      { id: 'search-index', status: 'complete', progressPercent: 100 },
      { id: 'visual-assets', status: 'blocked', progressPercent: 44 },
    ],
  },
  seedIntegrity,
  warnings: localCatalogSeed.manifest.warnings,
}
