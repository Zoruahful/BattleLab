import type { BattleLabSettings, CatalogUpdateSnapshot } from '../types/settingsCatalog'
import { localCatalogSeed, localCatalogSeedAssets } from './catalogSeed'

const visualAssetCount = localCatalogSeedAssets.filter((asset) => asset.kind.startsWith('pokemon-')).length
const pickerAssetCount = localCatalogSeedAssets.length - visualAssetCount

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
  status: 'updateAvailable',
  lastCheckedAt: '2026-06-10T12:45:00.000Z',
  lastUpdatedAt: '2026-06-09T21:10:00.000Z',
  schemaVersion: localCatalogSeed.manifest.schemaVersion,
  sources: localCatalogSeed.manifest.sources,
  categories: [
    {
      id: 'pokemon',
      label: 'Pokemon',
      description: 'Names, forms, types, base stat previews, and visual metadata keys.',
      recordCount: localCatalogSeed.manifest.recordCounts.pokemon,
      status: 'stale',
    },
    {
      id: 'move',
      label: 'Moves',
      description: 'Move names, types, categories, targeting, and short helper descriptions.',
      recordCount: localCatalogSeed.manifest.recordCounts.moves,
      status: 'stale',
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
      status: 'stale',
    },
  ],
  progress: {
    status: 'checking',
    activeSourceIds: ['source-pokeapi-candidate'],
    message: 'Fake local catalog preparation preview. No network sync is running.',
    categories: [
      { id: 'pokemon', status: 'running', progressPercent: 72 },
      { id: 'move', status: 'queued', progressPercent: 38 },
      { id: 'ability', status: 'complete', progressPercent: 100 },
      { id: 'item', status: 'complete', progressPercent: 100 },
      { id: 'type', status: 'complete', progressPercent: 100 },
      { id: 'nature', status: 'complete', progressPercent: 100 },
      { id: 'picker-assets', status: 'blocked', progressPercent: 55 },
      { id: 'search-index', status: 'queued', progressPercent: 24 },
      { id: 'visual-assets', status: 'blocked', progressPercent: 44 },
    ],
  },
  warnings: [
    'PokeAPI is a candidate enrichment source only; Pokemon Showdown remains the legality and battle source of truth.',
    'Remote sprite URLs are not enabled for normal offline use until licensing and bundling are reviewed.',
  ],
}
