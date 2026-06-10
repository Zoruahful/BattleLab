import type { BattleFormat, PerformanceProfile } from './index'
import type { CatalogPickerKind, CatalogSourceMetadata } from './catalog'

export type BattleLabThemePreference = 'light' | 'system'

export type StatEditorModePreference = 'standard-evs' | 'champion-points'

export type CatalogUpdateStatus = 'ready' | 'checking' | 'updateAvailable' | 'upToDate' | 'error'

export type CatalogUpdateCategoryStatus = 'current' | 'stale' | 'queued' | 'needsReview'

export interface BattleLabSettings {
  theme: BattleLabThemePreference
  defaultFormat: BattleFormat
  generationCap: 'Gen 9' | 'Gen 8' | 'Gen 7' | 'Custom'
  statEditorMode: StatEditorModePreference
  animationsEnabled: boolean
  autosaveTeams: boolean
  diagnosticsEnabled: boolean
  defaultPerformanceProfileId: PerformanceProfile['id']
  checkCatalogUpdatesOnLaunch: boolean
}

export interface CatalogUpdateCategory {
  id: CatalogPickerKind | 'assets' | 'search-index'
  label: string
  description: string
  recordCount: number
  status: CatalogUpdateCategoryStatus
  progressPercent: number
}

export interface CatalogUpdateSnapshot {
  status: CatalogUpdateStatus
  lastCheckedAt: string
  lastUpdatedAt: string
  schemaVersion: string
  source: CatalogSourceMetadata
  categories: CatalogUpdateCategory[]
  warnings: string[]
}
