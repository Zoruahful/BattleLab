import { useEffect, useRef, useState } from 'react'
import {
  runCatalogBulkIngestion,
  type CatalogBulkIngestionProgress,
  type CatalogBulkIngestionResult,
  type CatalogBulkIngestionSection,
  type CatalogBulkIngestionSectionSummary,
} from '../data/catalogBulkIngestion'
import {
  readCatalogUpdateCacheMetadata,
  readCatalogUpdateGeneratedCatalogCache,
  writeCatalogUpdateGeneratedCatalogCache,
  type CatalogUpdateGeneratedCatalogCache,
  type CatalogUpdateSectionCacheMetadata,
} from '../data/catalogUpdateCache'
import { readCatalogStorageBoundaryReadModel } from '../data/catalogStorageBoundary'
import {
  createShowdownEngineCatalogUpdateAggregateReadModelSamples,
  type ShowdownEngineCatalogUpdateAggregateReadModel,
} from '../data/showdownEngineCatalogUpdateAggregateReadModel'
import {
  createShowdownEngineInstalledFormatRegistryBridge,
  type ShowdownEngineInstalledFormatRegistryBridge,
} from '../data/showdownEngineInstalledFormatRegistryBridge'
import {
  runShowdownEngineUpdate,
  type ShowdownEngineRealUpdateProgress,
  type ShowdownEngineRealUpdateProgressStatus,
  type ShowdownEngineRealUpdateResult,
} from '../data/showdownEngineUpdateService'
import type { CatalogSourceFetchIssue } from '../types/catalogFetch'
import type { CatalogStorageBoundaryReadModel } from '../types/catalogStorage'
import '../styles/settings-catalog-panels.css'

export type CatalogUpdatePanelProps = {
  open?: boolean
  onClose?: () => void
}

type CatalogProgressDisplayState =
  | 'disabled'
  | 'preview'
  | 'checking'
  | 'current'
  | 'resolving'
  | 'downloading'
  | 'preparing'
  | 'using-cache'
  | 'rate-limited'
  | 'validating'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'
  | 'blocked'

type CatalogPanelStatus = 'idle' | 'checking' | 'fetching' | 'validating' | 'complete' | 'warning' | 'failed' | 'cancelled'
type CatalogPanelSectionId = CatalogBulkIngestionSection | 'engine'
type CatalogPanelSectionStatus =
  | 'idle'
  | 'checking'
  | 'current'
  | 'stale'
  | 'resolving'
  | 'fetching'
  | 'preparing'
  | 'staging'
  | 'validating'
  | 'complete'
  | 'warning'
  | 'failed'
  | 'cancelled'

type CatalogCacheHealthStatus = 'empty' | 'healthy' | 'partial' | 'warning' | 'failed'

interface CatalogCacheHealthSummary {
  status: CatalogCacheHealthStatus
  label: string
  message: string
  cachedSections: number
  totalSections: number
  recordCount: number
  lastCompletedAt?: string
  catalogVersion?: string
  generatedCatalogPresent: boolean
}

interface CatalogPanelSection {
  id: CatalogPanelSectionId
  label: string
  description: string
  status: CatalogPanelSectionStatus
  downloaded: number
  total: number
  progressPercent: number
  countLabel?: string
  lastCheckedAt?: string
  lastUpdatedAt?: string
  message: string
  error?: string
}

interface CatalogPanelState {
  status: CatalogPanelStatus
  startedAt?: string
  finishedAt?: string
  aggregateProgressPercent: number
  message: string
  warningCount: number
  errorCount: number
  issues: CatalogSourceFetchIssue[]
  sections: CatalogPanelSection[]
  cacheHealth: CatalogCacheHealthSummary
}

const catalogSections: Array<Pick<CatalogPanelSection, 'id' | 'label' | 'description'> & { id: CatalogBulkIngestionSection }> = [
  {
    id: 'pokemon',
    label: 'Pokemon',
    description: 'Names, base resources, forms, and display metadata candidates.',
  },
  {
    id: 'moves',
    label: 'Moves',
    description: 'Move names, descriptions, type, category, and picker metadata candidates.',
  },
  {
    id: 'abilities',
    label: 'Abilities',
    description: 'Ability names, descriptions, and picker metadata candidates.',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Held item names, descriptions, and icon metadata candidates.',
  },
  {
    id: 'types',
    label: 'Types',
    description: 'The 18 standard battle-facing type names and display metadata candidates.',
  },
  {
    id: 'natures',
    label: 'Natures',
    description: 'Nature names and stat-modifier metadata candidates.',
  },
]

const runStatusLabels: Record<CatalogPanelStatus, string> = {
  idle: 'Ready to update',
  checking: 'Checking catalog sections…',
  fetching: 'Downloading catalog data…',
  validating: 'Checking downloaded data…',
  complete: 'Catalog data prepared',
  warning: 'Prepared with warnings',
  failed: 'Update failed safely',
  cancelled: 'Update cancelled',
}

const sectionStatusLabels: Record<CatalogPanelSectionStatus, string> = {
  idle: 'Not checked',
  checking: 'Checking',
  current: 'Current',
  stale: 'Outdated',
  resolving: 'Resolving',
  fetching: 'Downloading',
  preparing: 'Preparing',
  staging: 'Staging',
  validating: 'Validating',
  complete: 'Prepared',
  warning: 'Warning',
  failed: 'Failed safely',
  cancelled: 'Cancelled',
}

const cacheHealthLabels: Record<CatalogCacheHealthStatus, string> = {
  empty: 'No saved catalog',
  healthy: 'Cache healthy',
  partial: 'Partial cache',
  warning: 'Needs review',
  failed: 'Last update failed',
}

const engineAggregateStatusLabels: Record<ShowdownEngineCatalogUpdateAggregateReadModel['status'], string> = {
  'ready-preview': 'Ready preview',
  'blocked-preview': 'Blocked preview',
  'failed-preserves-active': 'Failed safely',
  'cancelled-preserves-active': 'Cancelled safely',
}

const installedRegistryStatusLabels: Record<ShowdownEngineInstalledFormatRegistryBridge['status'], string> = {
  'installed-registry-available': 'Installed registry available',
  'installed-registry-unavailable': 'Registry unavailable',
}

function isCatalogSectionId(sectionId: CatalogPanelSectionId): sectionId is CatalogBulkIngestionSection {
  return sectionId !== 'engine'
}

function getCatalogOnlySections(sections: CatalogPanelSection[]) {
  return sections.filter(
    (section): section is CatalogPanelSection & { id: CatalogBulkIngestionSection } => isCatalogSectionId(section.id),
  )
}

function createInitialEngineSection(): CatalogPanelSection {
  return {
    id: 'engine',
    label: 'Pokemon Showdown Engine',
    description: 'Powers future legality and format checks. Updates do not run battle simulations.',
    status: 'idle',
    downloaded: 0,
    total: 0,
    progressPercent: 0,
    countLabel: 'No Engine check yet',
    message: 'Engine updates start only when you click Update. Catalog Update does not run simulations.',
  }
}

function getEngineSectionStatus(status: ShowdownEngineRealUpdateProgressStatus): CatalogPanelSectionStatus {
  if (status === 'downloading') return 'fetching'
  if (status === 'extracting-preparing') return 'staging'
  return status
}

function createEngineSectionFromResult(result: ShowdownEngineRealUpdateResult): CatalogPanelSection {
  return {
    id: 'engine',
    label: 'Pokemon Showdown Engine',
    description: 'Powers future legality and format checks. Updates do not run battle simulations.',
    status: result.status === 'complete' ? 'complete' : result.status,
    downloaded: result.downloadedByteLength,
    total: result.metadata?.downloadedByteLength ?? result.downloadedByteLength,
    progressPercent: 100,
    countLabel: result.metadata?.officialFormatCount
      ? `${formatCount(result.metadata.officialFormatCount)} formats ready`
      : result.archivePayloadStored
        ? `${formatCount(result.downloadedByteLength)} bytes stored`
        : 'Engine metadata checked',
    lastCheckedAt: result.finishedAt,
    lastUpdatedAt: result.status === 'complete' || result.status === 'current' || result.status === 'warning' ? result.finishedAt : undefined,
    message:
      result.status === 'current'
        ? 'Pokemon Showdown Engine is current. Download skipped.'
        : result.status === 'complete'
          ? 'Pokemon Showdown Engine package downloaded, hashed, and staged in local Engine storage. No simulation ran.'
          : result.status === 'warning'
            ? 'Pokemon Showdown Engine update completed with warnings. Previous valid Engine remains available.'
            : result.status === 'cancelled'
              ? 'Pokemon Showdown Engine update cancelled. Previous valid Engine remains available.'
              : 'Pokemon Showdown Engine update failed safely. Previous valid Engine remains available.',
    error: result.errors[0],
  }
}

function applyEngineProgressToSection(
  section: CatalogPanelSection,
  progress: ShowdownEngineRealUpdateProgress,
  checkedAt: string,
): CatalogPanelSection {
  const total = progress.totalBytes ?? section.total
  const downloaded = progress.downloadedBytes

  return {
    ...section,
    status: getEngineSectionStatus(progress.status),
    downloaded,
    total,
    progressPercent: progress.progressPercent,
    countLabel: total ? `${formatCount(downloaded)} / ${formatCount(total)} bytes` : 'Checking Engine metadata',
    lastCheckedAt: checkedAt,
    lastUpdatedAt: progress.status === 'complete' || progress.status === 'current' || progress.status === 'warning'
      ? checkedAt
      : section.lastUpdatedAt,
    message: progress.message,
    error: progress.status === 'failed' ? progress.message : undefined,
  }
}

function createCacheHealthSummary(
  sections: CatalogPanelSection[],
  generatedCatalog?: Pick<CatalogUpdateGeneratedCatalogCache, 'fetchedAt' | 'sourceVersion'> | null,
): CatalogCacheHealthSummary {
  const catalogOnlySections = getCatalogOnlySections(sections)
  const cachedSections = catalogOnlySections.filter((section) => section.total > 0 && section.lastUpdatedAt).length
  const failedSections = catalogOnlySections.filter((section) => section.status === 'failed').length
  const warningSections = catalogOnlySections.filter((section) => section.status === 'warning').length
  const recordCount = catalogOnlySections.reduce((total, section) => total + (section.lastUpdatedAt ? section.downloaded : 0), 0)
  const lastCompletedAt = [
    generatedCatalog?.fetchedAt,
    ...catalogOnlySections.map((section) => section.lastUpdatedAt),
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
  const totalSections = catalogSections.length
  const generatedCatalogPresent = Boolean(generatedCatalog)
  const status: CatalogCacheHealthStatus =
    failedSections > 0
      ? 'failed'
      : warningSections > 0
      ? 'warning'
      : cachedSections === 0
      ? 'empty'
      : cachedSections < totalSections || !generatedCatalogPresent
      ? 'partial'
      : 'healthy'
  const message =
    status === 'healthy'
      ? 'All catalog sections have saved metadata and a generated picker cache.'
      : status === 'partial'
      ? 'Some sections are saved. Update will check missing or stale sections.'
      : status === 'warning'
      ? 'Saved catalog data is available, but one or more sections need review.'
      : status === 'failed'
      ? 'A previous update failed safely. Existing saved data was kept.'
      : 'No browser cache has been completed yet.'

  return {
    status,
    label: cacheHealthLabels[status],
    message,
    cachedSections,
    totalSections,
    recordCount,
    lastCompletedAt,
    catalogVersion: generatedCatalog?.sourceVersion,
    generatedCatalogPresent,
  }
}

function createInitialCatalogPanelState(): CatalogPanelState {
  const catalogRows = catalogSections.map((section) => ({
    ...section,
    status: 'idle' as const,
    downloaded: 0,
    total: 0,
    progressPercent: 0,
    message: `No ${section.label.toLowerCase()} records checked yet.`,
  }))
  const sections = [...catalogRows, createInitialEngineSection()]

  return {
    status: 'idle',
    aggregateProgressPercent: 0,
    message: 'Ready to check PokeAPI catalog sections. Downloads start only when you click Update.',
    warningCount: 0,
    errorCount: 0,
    issues: [],
    sections,
    cacheHealth: createCacheHealthSummary(catalogRows),
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatTimestamp(value?: string) {
  if (!value) return 'Not yet'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCatalogVersionLabel(value?: string) {
  if (!value) return 'Not cached'
  if (value.startsWith('pokeapi-bulk-ingestion')) return 'PokeAPI catalog'
  return 'Saved catalog'
}

function getStorageHealthMessage(readModel?: CatalogStorageBoundaryReadModel | null, desktopReady = false) {
  if (desktopReady) {
    return 'Desktop file storage is active. Catalog files write to Documents/BattleLab/data/catalog.'
  }

  if (!readModel) {
    return 'Checking browser-local catalog storage. User teams are stored separately.'
  }

  if (readModel.health.status === 'healthy') {
    return 'Browser-local catalog cache is ready. Future packaged app storage is not active yet.'
  }

  if (readModel.health.generatedCatalogPresent) {
    return 'Saved catalog remains available while storage is checked. User team data is not affected.'
  }

  return 'Catalog cache is not ready yet. Team data is separate and remains unaffected.'
}

function getStorageFallbackMessage(readModel?: CatalogStorageBoundaryReadModel | null, desktopReady = false) {
  if (desktopReady) {
    return 'Failed or cancelled updates keep the last valid files until replacement data validates.'
  }

  if (!readModel) {
    return 'Failed or cancelled updates keep the last saved generated catalog when one exists.'
  }

  if (readModel.safeFallback.status === 'use-current-cache') {
    return 'Failed or cancelled updates keep this generated catalog available.'
  }

  if (readModel.safeFallback.status === 'block-and-keep-current') {
    return 'New catalog data must validate before replacing the saved generated catalog.'
  }

  return 'If no generated catalog is saved, BattleLab falls back without touching team data.'
}

function getProgressState(status: CatalogPanelStatus | CatalogPanelSectionStatus): CatalogProgressDisplayState {
  if (status === 'checking') return 'checking'
  if (status === 'current') return 'current'
  if (status === 'stale') return 'rate-limited'
  if (status === 'resolving') return 'resolving'
  if (status === 'fetching') return 'downloading'
  if (status === 'preparing') return 'preparing'
  if (status === 'staging') return 'preparing'
  if (status === 'validating') return 'validating'
  if (status === 'complete') return 'complete'
  if (status === 'warning') return 'warning'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'preview'
}

function getCacheProgressState(status: CatalogCacheHealthStatus): CatalogProgressDisplayState {
  if (status === 'healthy') return 'complete'
  if (status === 'partial') return 'using-cache'
  if (status === 'warning') return 'warning'
  if (status === 'failed') return 'failed'
  return 'preview'
}

function getSectionRecordCopy(section: CatalogPanelSection) {
  if (section.countLabel) return section.countLabel
  if (section.total <= 0) return 'No records checked'
  return `${formatCount(section.downloaded)} / ${formatCount(section.total)} records`
}

function isRunning(status: CatalogPanelStatus) {
  return status === 'checking' || status === 'fetching' || status === 'validating'
}

function getPanelStatusForProgress(progress: CatalogBulkIngestionProgress): CatalogPanelStatus {
  if (progress.status === 'checking') return 'checking'
  if (progress.status === 'fetching-lists') return 'checking'
  if (progress.status === 'current') return 'fetching'
  if (progress.status === 'downloading') return 'fetching'
  if (progress.status === 'fetching-details') return 'fetching'
  if (
    progress.status === 'validating-source' ||
    progress.status === 'generating-catalog' ||
    progress.status === 'validating-catalog'
  ) {
    return 'validating'
  }
  if (progress.status === 'complete') return 'complete'
  if (progress.status === 'failed') return 'failed'
  if (progress.status === 'cancelled') return 'cancelled'
  return 'idle'
}

function getValidationStageProgress(progress: CatalogBulkIngestionProgress) {
  if (progress.status === 'validating-source') return 92
  if (progress.status === 'generating-catalog') return 96
  if (progress.status === 'validating-catalog') return 98
  return progress.progressPercent
}

function getProgressMessage(progress: CatalogBulkIngestionProgress) {
  if (progress.status === 'checking') return 'Checking local catalog cache and PokeAPI section lists.'
  if (progress.status === 'fetching-lists') return 'Checking PokeAPI section resource lists.'
  if (progress.status === 'current') return 'Current sections are being skipped.'
  if (progress.status === 'downloading') return 'Downloading changed catalog records from PokeAPI.'
  if (progress.status === 'fetching-details') return 'Downloading selected catalog records from PokeAPI.'
  if (progress.status === 'validating-source') return 'Checking downloaded source data before use.'
  if (progress.status === 'generating-catalog') return 'Preparing BattleLab catalog records from enrichment data.'
  if (progress.status === 'validating-catalog') return 'Checking generated catalog records.'
  if (progress.status === 'complete') return 'Catalog data prepared. No legality or simulation rules were changed.'
  if (progress.status === 'cancelled') return 'Update cancelled. Existing catalog data was not overwritten.'
  if (progress.status === 'failed') return 'Update failed safely. Existing catalog data was not overwritten.'
  return progress.message
}

function applyProgressToSections(
  sections: CatalogPanelSection[],
  progress: CatalogBulkIngestionProgress,
): CatalogPanelSection[] {
  if (progress.status === 'validating-source' || progress.status === 'generating-catalog' || progress.status === 'validating-catalog') {
    return sections.map((section) =>
      isCatalogSectionId(section.id) && section.status === 'fetching' && section.progressPercent >= 100
        ? { ...section, status: 'complete' as const, message: 'Downloaded. Awaiting catalog validation.' }
        : section,
    )
  }

  if (!progress.section) return sections

  return sections.map((section) => {
    if (!isCatalogSectionId(section.id)) return section
    if (section.id !== progress.section) return section

    if (progress.status === 'checking' || progress.status === 'fetching-lists') {
      return {
        ...section,
        status: 'checking' as const,
        lastCheckedAt: new Date().toISOString(),
        message: 'Checking PokeAPI resource list.',
      }
    }

    if (progress.status === 'current') {
      const total = section.lastUpdatedAt && section.total > 0
        ? section.total
        : progress.sectionTotalRequests ?? section.total

      return {
        ...section,
        status: 'current' as const,
        downloaded: total,
        total,
        progressPercent: 100,
        lastCheckedAt: new Date().toISOString(),
        message: progress.message,
      }
    }

    if (progress.status === 'downloading' || progress.status === 'fetching-details') {
      const total = progress.sectionTotalRequests ?? section.total
      const downloaded = progress.sectionCompletedRequests ?? section.downloaded

      return {
        ...section,
        status: downloaded > 0 ? 'fetching' as const : section.lastUpdatedAt ? 'stale' as const : 'fetching' as const,
        downloaded,
        total,
        progressPercent: progress.sectionProgressPercent ?? progress.progressPercent,
        lastCheckedAt: section.lastCheckedAt ?? new Date().toISOString(),
        message: progress.message,
      }
    }

    return section
  })
}

function summarizeIssueCounts(issues: CatalogSourceFetchIssue[]) {
  return {
    warningCount: issues.filter((issue) => issue.severity === 'warning' || issue.severity === 'info').length,
    errorCount: issues.filter((issue) => issue.severity === 'error').length,
  }
}

function getSummaryForSection(result: CatalogBulkIngestionResult, sectionId: CatalogBulkIngestionSection) {
  return result.sectionSummaries.find(
    (summary): summary is CatalogBulkIngestionSectionSummary & { section: CatalogBulkIngestionSection } =>
      summary.section === sectionId,
  )
}

function applyResultToSections(
  sections: CatalogPanelSection[],
  result: CatalogBulkIngestionResult,
  finishedAt: string,
): CatalogPanelSection[] {
  if (result.status === 'cancelled') {
    return sections.map((section) =>
      section.status === 'checking' ||
      section.status === 'resolving' ||
      section.status === 'fetching' ||
      section.status === 'preparing' ||
      section.status === 'staging' ||
      section.status === 'validating'
        ? {
            ...section,
            status: 'cancelled' as const,
            message:
              section.id === 'engine'
                ? 'Cancelled. Previous valid Engine data remains available.'
                : 'Cancelled. Existing catalog data was not overwritten.',
          }
        : section,
    )
  }

  if (result.status === 'failed') {
    return sections.map((section) =>
      section.status === 'checking' ||
      section.status === 'resolving' ||
      section.status === 'fetching' ||
      section.status === 'preparing' ||
      section.status === 'staging' ||
      section.status === 'validating'
        ? {
            ...section,
            status: 'failed' as const,
            message:
              section.id === 'engine'
                ? 'Failed safely. Previous valid Engine data remains available.'
                : 'Failed safely. Existing catalog data was not overwritten.',
            error: result.issues[0]?.message,
          }
        : section,
    )
  }

  return sections.map((section) => {
    if (!isCatalogSectionId(section.id)) return section
    const summary = getSummaryForSection(result, section.id)
    if (!summary) return section

    const hasRecordWarning = summary.generatedCount < summary.selectedCount

    return {
      ...section,
      status: summary.status === 'skipped-current' ? 'current' as const : hasRecordWarning ? 'warning' as const : 'complete' as const,
      downloaded: summary.generatedCount,
      total: summary.selectedCount,
      progressPercent: 100,
      lastUpdatedAt: summary.status === 'skipped-current' ? summary.lastUpdatedAt ?? section.lastUpdatedAt : finishedAt,
      message: summary.status === 'skipped-current'
        ? `${formatCount(summary.generatedCount)} catalog records already current.`
        : hasRecordWarning
        ? `${formatCount(summary.generatedCount)} generated from ${formatCount(summary.selectedCount)} fetched records.`
        : `${formatCount(summary.generatedCount)} catalog records prepared.`,
    }
  })
}

function createSectionFromCache(
  section: Pick<CatalogPanelSection, 'id' | 'label' | 'description'> & { id: CatalogBulkIngestionSection },
  metadata?: CatalogUpdateSectionCacheMetadata | null,
  generatedCatalog?: CatalogUpdateGeneratedCatalogCache | null,
): CatalogPanelSection {
  if (!metadata) {
    return {
      ...section,
      status: 'idle',
      downloaded: 0,
      total: 0,
      progressPercent: 0,
      message: `No saved ${section.label.toLowerCase()} section yet.`,
    }
  }

  const status: CatalogPanelSectionStatus =
    metadata.status === 'failed' ? 'failed' : metadata.status === 'warning' ? 'warning' : 'current'
  const generatedRecordCount = generatedCatalog?.catalog[section.id]?.length
  const recordCount = generatedRecordCount ?? metadata.recordCount ?? metadata.listCount

  return {
    ...section,
    status,
    downloaded: recordCount,
    total: recordCount,
    progressPercent: recordCount > 0 ? 100 : 0,
    lastCheckedAt: metadata.lastCheckedAt,
    lastUpdatedAt: metadata.lastUpdatedAt,
    message:
      status === 'current'
        ? 'Saved section is ready. Update will check if it is still current.'
        : metadata.message ?? 'Saved section needs review. Existing cached data remains available.',
    error: status === 'failed' ? metadata.message : undefined,
  }
}

async function hydrateCatalogPanelStateFromCache(): Promise<CatalogPanelState> {
  const [metadata, generatedCatalog] = await Promise.all([
    readCatalogUpdateCacheMetadata(),
    readCatalogUpdateGeneratedCatalogCache().catch(() => null),
  ])
  const metadataBySection = new Map(metadata.map((entry) => [entry.section, entry]))
  const catalogRows = catalogSections.map((section) =>
    createSectionFromCache(section, metadataBySection.get(section.id), generatedCatalog),
  )
  const sections = [...catalogRows, createInitialEngineSection()]
  const cacheHealth = createCacheHealthSummary(catalogRows, generatedCatalog)

  return {
    status: 'idle',
    aggregateProgressPercent: cacheHealth.status === 'empty' ? 0 : 100,
    message:
      cacheHealth.status === 'empty'
        ? 'Ready to check PokeAPI catalog sections. Downloads start only when you click Update.'
        : 'Saved catalog cache found. Click Update to check for stale sections.',
    warningCount: catalogRows.filter((section) => section.status === 'warning').length,
    errorCount: catalogRows.filter((section) => section.status === 'failed').length,
    issues: [],
    sections,
    cacheHealth,
  }
}

function getPanelStatusForResult(result: CatalogBulkIngestionResult, hasWarnings: boolean): CatalogPanelStatus {
  if (result.status === 'complete') return hasWarnings ? 'warning' : 'complete'
  if (result.status === 'cancelled') return 'cancelled'
  return 'failed'
}

function applyProgress(current: CatalogPanelState, progress: CatalogBulkIngestionProgress): CatalogPanelState {
  const nextStatus = getPanelStatusForProgress(progress)
  const sections = applyProgressToSections(current.sections, progress)

  return {
    ...current,
    status: nextStatus,
    aggregateProgressPercent: getValidationStageProgress(progress),
    message: getProgressMessage(progress),
    sections,
  }
}

function applyResult(current: CatalogPanelState, result: CatalogBulkIngestionResult): CatalogPanelState {
  const finishedAt = new Date().toISOString()
  const { warningCount, errorCount } = summarizeIssueCounts(result.issues)
  const hasWarnings = warningCount > 0 || result.sectionSummaries.some((summary) => summary.generatedCount < summary.selectedCount)
  const status = getPanelStatusForResult(result, hasWarnings)
  const sections = applyResultToSections(current.sections, result, finishedAt)
  const cacheHealth =
    result.status === 'complete'
      ? createCacheHealthSummary(
          sections,
          result.snapshot
            ? {
                fetchedAt: result.snapshot.fetchedAt,
                sourceVersion: result.snapshot.sourceVersion,
              }
            : undefined,
        )
      : current.cacheHealth

  return {
    ...current,
    status,
    finishedAt,
    aggregateProgressPercent: result.status === 'complete' ? 100 : current.aggregateProgressPercent,
    message:
      result.status === 'complete'
        ? 'Catalog enrichment data prepared. Pokemon Showdown remains the source of truth for legality and simulation.'
        : getProgressMessage(result.progress[result.progress.length - 1]),
    warningCount,
    errorCount,
    issues: result.issues,
    sections,
    cacheHealth,
  }
}

export function CatalogUpdatePanel({ open = true, onClose }: CatalogUpdatePanelProps) {
  const desktopReady = typeof window !== 'undefined' && Boolean(window.battleLabDesktop)
  const [downloadState, setDownloadState] = useState<CatalogPanelState>(() => createInitialCatalogPanelState())
  const [storageBoundary, setStorageBoundary] = useState<CatalogStorageBoundaryReadModel | null>(null)
  const [engineAggregatePreview, setEngineAggregatePreview] = useState<ShowdownEngineCatalogUpdateAggregateReadModel | null>(null)
  const [installedRegistryPreview, setInstalledRegistryPreview] =
    useState<ShowdownEngineInstalledFormatRegistryBridge | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [cacheHydrated, setCacheHydrated] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const running = isRunning(downloadState.status)
  const panelProgressState = getProgressState(downloadState.status)
  const cacheProgressState = getCacheProgressState(downloadState.cacheHealth.status)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!open || running || cacheHydrated) return

    let cancelled = false

    Promise.all([hydrateCatalogPanelStateFromCache(), readCatalogStorageBoundaryReadModel()])
      .then(([state, readModel]) => {
        if (!cancelled && mountedRef.current) {
          setDownloadState(state)
          setStorageBoundary(readModel)
          setCacheHydrated(true)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && mountedRef.current) {
          const message = error instanceof Error ? error.message : 'Unknown cache metadata error.'
          setDownloadState((current) => ({
            ...current,
            status: 'warning',
            message: 'Local catalog cache metadata could not be read. Update can still run safely.',
            cacheHealth: {
              ...current.cacheHealth,
              status: 'warning',
              label: cacheHealthLabels.warning,
              message,
            },
          }))
          setCacheHydrated(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cacheHydrated, open, running])

  useEffect(() => {
    if (!open || engineAggregatePreview) return

    let cancelled = false

    createShowdownEngineCatalogUpdateAggregateReadModelSamples()
      .then((samples) => {
        if (!cancelled && mountedRef.current) {
          setEngineAggregatePreview(samples.blocked)
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setEngineAggregatePreview(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [engineAggregatePreview, open])

  useEffect(() => {
    if (!open || installedRegistryPreview) return

    let cancelled = false

    createShowdownEngineInstalledFormatRegistryBridge({
      bridgeId: 'catalog-update-installed-format-registry-preview',
      proofId: 'catalog-update-installed-format-registry-proof',
    })
      .then((bridge) => {
        if (!cancelled && mountedRef.current) {
          setInstalledRegistryPreview(bridge)
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setInstalledRegistryPreview(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [installedRegistryPreview, open])

  const runEngineUpdateWithUi = async (signal: AbortSignal, requestedAt: string) => {
    const result = await runShowdownEngineUpdate({
      signal,
      onProgress: (progress) => {
        if (mountedRef.current) {
          setDownloadState((current) => ({
            ...current,
            sections: current.sections.map((section) =>
              section.id === 'engine' ? applyEngineProgressToSection(section, progress, requestedAt) : section,
            ),
          }))
        }
      },
    })

    if (mountedRef.current) {
      setDownloadState((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === 'engine' ? createEngineSectionFromResult(result) : section,
        ),
      }))
    }

    return result
  }

  const handleUpdate = async () => {
    if (abortRef.current || running) return

    const controller = new AbortController()
    const startedAt = new Date().toISOString()
    abortRef.current = controller
    setDownloadState((current) => ({
      ...current,
      status: 'checking',
      startedAt,
      finishedAt: undefined,
      aggregateProgressPercent: 0,
      message: 'Checking PokeAPI catalog sections.',
      warningCount: 0,
      errorCount: 0,
      issues: [],
      sections: current.sections.map((section) =>
        section.id === 'engine'
          ? {
              ...section,
              status: 'checking' as const,
              downloaded: 0,
              progressPercent: 10,
              countLabel: section.lastUpdatedAt ? section.countLabel : 'Checking Engine formats',
              lastCheckedAt: startedAt,
              message: 'Checking Pokemon Showdown Engine and format readiness. No simulation is running.',
              error: undefined,
            }
          : {
              ...section,
              status: section.lastUpdatedAt ? 'checking' as const : 'idle' as const,
              message: section.lastUpdatedAt
                ? 'Checking whether saved section is still current.'
                : `No saved ${section.label.toLowerCase()} section yet.`,
              error: undefined,
            },
      ),
    }))

    try {
      const engineUpdate = runEngineUpdateWithUi(controller.signal, startedAt)
      const result = await runCatalogBulkIngestion({
        mode: 'full',
        signal: controller.signal,
        onProgress: (progress) => {
          if (mountedRef.current) {
            setDownloadState((current) => applyProgress(current, progress))
          }
        },
      })

      if (result.status === 'complete' && result.catalog && result.snapshot) {
        await writeCatalogUpdateGeneratedCatalogCache(result.catalog, result.snapshot)
      }

      if (mountedRef.current) {
        setDownloadState((current) => applyResult(current, result))
      }

      await engineUpdate
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }

      readCatalogStorageBoundaryReadModel()
        .then((readModel) => {
          if (mountedRef.current) {
            setStorageBoundary(readModel)
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setStorageBoundary(null)
          }
        })
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  const handleOpenDataFolder = () => {
    void window.battleLabDesktop?.app.openDataFolder()
  }

  return (
    <aside
      className={`bl-catalog-panel side-panel ${open ? 'is-open' : ''}`}
      aria-label="Catalog Update"
      aria-hidden={!open}
    >
      <div className="bl-settings-shell">
        <header className="bl-settings-header">
          <div>
            <span className="eyebrow">Catalog Update</span>
            <p>Download enrichment data for names, descriptions, picker options, and visual metadata candidates.</p>
          </div>
          <div className="bl-catalog-header-actions">
            <button
              className={`bl-catalog-help-button ${helpOpen ? 'is-open' : ''}`}
              type="button"
              aria-label="About catalog updates"
              aria-describedby="catalog-update-help"
              aria-expanded={helpOpen}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHelpOpen(false)
                }
              }}
              onClick={() => setHelpOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setHelpOpen(false)
                  event.currentTarget.blur()
                }
              }}
            >
              ?
              <span className="bl-catalog-help-popover" id="catalog-update-help" role="tooltip">
                Catalog data fills names, picker options, descriptions, and visual metadata. Pokemon Showdown
                remains the source of truth for battle legality and simulation. Sprite metadata stays
                candidate-review-gated. Downloads start only when you click Update.
              </span>
            </button>
            <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="bl-settings-body">
          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Catalog sections</h3>
              <span>Bulk ingestion</span>
            </div>

            <div className="bl-catalog-progress-overview" aria-label="Catalog update progress summary">
              <div>
                <span>Current state</span>
                <strong className={`bl-catalog-progress-state is-${panelProgressState}`}>
                  {runStatusLabels[downloadState.status]}
                </strong>
                <p>{downloadState.message}</p>
              </div>
              <div>
                <span>Overall progress</span>
                <strong>{downloadState.aggregateProgressPercent}%</strong>
                <p>
                  {downloadState.finishedAt
                    ? `Last run finished ${formatTimestamp(downloadState.finishedAt)}.`
                    : 'No automatic downloads run on app load.'}
                </p>
              </div>
              <div>
                <span>Cache health</span>
                <strong className={`bl-catalog-progress-state is-${cacheProgressState}`}>
                  {downloadState.cacheHealth.label}
                </strong>
                <p>
                  {downloadState.cacheHealth.cachedSections} / {downloadState.cacheHealth.totalSections} sections saved ·{' '}
                  {formatCount(downloadState.cacheHealth.recordCount)} records
                </p>
              </div>
              <div>
                <span>Catalog version</span>
                <strong>{formatCatalogVersionLabel(downloadState.cacheHealth.catalogVersion)}</strong>
                <p>
                  {downloadState.cacheHealth.lastCompletedAt
                    ? `Last completed ${formatTimestamp(downloadState.cacheHealth.lastCompletedAt)}.`
                    : downloadState.cacheHealth.message}
                </p>
              </div>
            </div>

            <div className={`bl-catalog-cache-summary is-${downloadState.cacheHealth.status}`}>
              <strong>{downloadState.cacheHealth.message}</strong>
              <span>
                Generated picker cache:{' '}
                {downloadState.cacheHealth.generatedCatalogPresent ? 'available' : 'not saved yet'}.
              </span>
            </div>

            <div className="bl-catalog-storage-boundary" aria-label="Catalog storage boundary">
              <div>
                <span>Active storage</span>
                <strong>{desktopReady ? 'Desktop Documents data folder' : 'Browser-local catalog cache'}</strong>
                <p>{getStorageHealthMessage(storageBoundary, desktopReady)}</p>
              </div>
              <div>
                <span>{desktopReady ? 'Visible location' : 'Future storage'}</span>
                <strong>{desktopReady ? 'Documents/BattleLab/data' : 'Packaged app storage: not active'}</strong>
                <p>{getStorageFallbackMessage(storageBoundary, desktopReady)}</p>
              </div>
            </div>

            {engineAggregatePreview ? (
              <div className="bl-catalog-storage-boundary" aria-label="Pokemon Showdown Engine activation preview">
                <div>
                  <span>Pokemon Showdown Engine</span>
                  <strong>{engineAggregateStatusLabels[engineAggregatePreview.status]}</strong>
                  <p>{engineAggregatePreview.message}</p>
                </div>
                <div>
                  <span>Activation gate</span>
                  <strong>
                    {engineAggregatePreview.sections.filter((section) => section.blocksActivation).length} blocking checks
                  </strong>
                  <p>
                    {engineAggregatePreview.archiveMetadataStatus} · body download {engineAggregatePreview.archiveBodyDownloadStatus}
                  </p>
                </div>
                <div>
                  <span>Previous active Engine</span>
                  <strong>{engineAggregatePreview.revision.previousActivePreserved ? 'Preserved' : 'Needs review'}</strong>
                  <p>No extraction, file IO, loader execution, or simulation runs from this preview.</p>
                </div>
              </div>
            ) : null}

            {installedRegistryPreview ? (
              <div className="bl-catalog-storage-boundary" aria-label="Installed Pokemon Showdown format registry preview">
                <div>
                  <span>Installed registry</span>
                  <strong>{installedRegistryStatusLabels[installedRegistryPreview.status]}</strong>
                  <p>
                    {installedRegistryPreview.status === 'installed-registry-available'
                      ? `${formatCount(installedRegistryPreview.officialFormatCount)} official formats available from the installed package.`
                      : installedRegistryPreview.runtimeUnavailableFallback.message}
                  </p>
                </div>
                <div>
                  <span>Sample formats</span>
                  <strong>{installedRegistryPreview.sampleOfficialFormats.length} shown</strong>
                  <p>
                    {installedRegistryPreview.sampleOfficialFormats
                      .slice(0, 2)
                      .map((format) => format.displayName)
                      .join(' · ') || 'Runtime unavailable fallback is ready.'}
                  </p>
                </div>
                <div>
                  <span>Safety boundary</span>
                  <strong>{installedRegistryPreview.safety.noSimulationExecution ? 'No simulation' : 'Needs review'}</strong>
                  <p>No archive download, extraction, file IO, or downloaded-code import runs from this preview.</p>
                </div>
              </div>
            ) : null}

            <div className="bl-catalog-category-list">
              {downloadState.sections.map((section) => {
                const progressState = getProgressState(section.status)

                return (
                  <article className="bl-catalog-category" key={section.id}>
                    <div className="bl-catalog-category-topline">
                      <div>
                        <strong>{section.label}</strong>
                        <p>{section.description}</p>
                      </div>
                      <span className={`bl-catalog-status is-progress-${progressState}`}>
                        {sectionStatusLabels[section.status]}
                      </span>
                    </div>
                    <div
                      className={`bl-catalog-meter is-${progressState} ${
                        section.status === 'current' || section.status === 'complete' ? 'is-finished' : ''
                      }`}
                      aria-label={`${section.label} progress`}
                    >
                      <span style={{ width: `${section.progressPercent}%` }} />
                    </div>
                    <div className="bl-catalog-meta">
                      <span>{getSectionRecordCopy(section)}</span>
                      <span>{section.message}</span>
                    </div>
                    <dl className="bl-catalog-section-times">
                      <div>
                        <dt>Last checked</dt>
                        <dd>{formatTimestamp(section.lastCheckedAt ?? downloadState.startedAt)}</dd>
                      </div>
                      <div>
                        <dt>Last completed</dt>
                        <dd>{formatTimestamp(section.lastUpdatedAt)}</dd>
                      </div>
                    </dl>
                    {section.error ? <p className="bl-catalog-error-copy">{section.error}</p> : null}
                  </article>
                )
              })}
            </div>

            {downloadState.issues.length > 0 ? (
              <div className="bl-catalog-warning-list" aria-label="Catalog update warnings and errors">
                <p>
                  <strong>{downloadState.errorCount}</strong> errors · <strong>{downloadState.warningCount}</strong>{' '}
                  warnings
                </p>
                {downloadState.issues.slice(0, 3).map((issue) => (
                  <p key={`${issue.code}-${issue.path ?? issue.resourceId ?? issue.message}`}>
                    <span>{issue.severity}</span> {issue.message}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="bl-settings-footer">
          <span className="bl-catalog-footer-copy">
            {desktopReady
              ? 'PokeAPI enrichment data writes to visible desktop files. Failed runs keep previous valid data.'
              : 'PokeAPI ingestion uses local browser cache. Data is enrichment-only and failed runs do not overwrite existing catalog data.'}
          </span>
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action" type="button" onClick={handleOpenDataFolder} disabled={!desktopReady}>
            Open data folder
          </button>
          {running ? (
            <button className="secondary-action" type="button" onClick={handleCancel}>
              Cancel
            </button>
          ) : null}
          <button className="primary-action" type="button" onClick={handleUpdate} disabled={running}>
            {running ? 'Updating…' : 'Update'}
          </button>
        </footer>
      </div>
    </aside>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}

export default CatalogUpdatePanel
