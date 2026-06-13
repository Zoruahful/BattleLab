import type { BattleFormat, PerformanceProfile } from './index'
import type { CatalogPickerKind, CatalogSourceMetadata } from './catalog'

export type BattleLabThemePreference = 'light' | 'system'

export type StatEditorModePreference = 'standard-evs' | 'champion-points'

export type CatalogStableStatus = 'ready' | 'updateAvailable' | 'upToDate' | 'error'

export type CatalogUpdateProgressStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'applying'
  | 'complete'
  | 'error'

export type CatalogUpdateCategoryStatus = 'current' | 'stale' | 'needsReview'

export type CatalogUpdateProgressCategoryStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'complete'
  | 'blocked'
  | 'error'

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

export type CatalogUpdateCategoryId =
  | CatalogPickerKind
  | 'picker-assets'
  | 'search-index'
  | 'visual-assets'

export interface CatalogUpdateCategory {
  id: CatalogUpdateCategoryId
  label: string
  description: string
  recordCount: number
  status: CatalogUpdateCategoryStatus
}

export interface CatalogUpdateCategoryProgress {
  id: CatalogUpdateCategory['id']
  status: CatalogUpdateProgressCategoryStatus
  progressPercent: number
}

export interface CatalogUpdateProgressSnapshot {
  status: CatalogUpdateProgressStatus
  activeSourceIds: string[]
  categories: CatalogUpdateCategoryProgress[]
  message?: string
}

export interface CatalogSeedIntegrityIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  path: string
}

export interface CatalogSeedIntegrityStatus {
  isValid: boolean
  errorCount: number
  warningCount: number
  issues: CatalogSeedIntegrityIssue[]
}

export interface CatalogUpdateSnapshot {
  status: CatalogStableStatus
  lastCheckedAt: string
  lastUpdatedAt: string
  schemaVersion: string
  sources: CatalogSourceMetadata[]
  categories: CatalogUpdateCategory[]
  progress: CatalogUpdateProgressSnapshot
  seedIntegrity: CatalogSeedIntegrityStatus
  warnings: string[]
}
