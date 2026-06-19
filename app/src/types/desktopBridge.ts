import type {
  CatalogUpdateGeneratedCatalogCache,
  CatalogUpdateSectionCacheMetadata,
  CatalogUpdateSectionPayload,
  CatalogUpdateShowdownEngineMetadata,
  CatalogUpdateShowdownEnginePayload,
} from '../data/catalogUpdateCache'

export interface BattleLabDesktopStorageInfo {
  adapter: 'electron-documents-file-storage'
  dataRoot: string
  catalogRoot: string
  engineRoot: string
  stagingRoot: string
  logsRoot: string
}

export interface BattleLabDesktopEngineStorageInfo {
  adapter: 'electron-documents-file-storage'
  root: string
  activeRoot: string
  metadataFile: string
  payloadFile: string
}

export interface BattleLabDesktopBridge {
  app: {
    getStorageInfo: () => Promise<BattleLabDesktopStorageInfo>
    openDataFolder: () => Promise<BattleLabDesktopStorageInfo>
  }
  windowControls: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<boolean>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  catalog: {
    getStorageInfo: () => Promise<BattleLabDesktopStorageInfo>
    readAllMetadata: () => Promise<CatalogUpdateSectionCacheMetadata[]>
    readSectionMetadata: (section: CatalogUpdateSectionCacheMetadata['section']) => Promise<CatalogUpdateSectionCacheMetadata | null>
    hasSectionPayload: (section: CatalogUpdateSectionCacheMetadata['section']) => Promise<boolean>
    readSectionPayload: (section: CatalogUpdateSectionCacheMetadata['section']) => Promise<CatalogUpdateSectionPayload | null>
    writeSectionMetadata: (metadata: CatalogUpdateSectionCacheMetadata) => Promise<CatalogUpdateSectionCacheMetadata>
    writeSectionCacheEntry: (
      metadata: CatalogUpdateSectionCacheMetadata,
      payload: CatalogUpdateSectionPayload,
    ) => Promise<CatalogUpdateSectionCacheMetadata>
    writeGeneratedCatalogCache: (cacheEntry: CatalogUpdateGeneratedCatalogCache) => Promise<CatalogUpdateGeneratedCatalogCache>
    readGeneratedCatalogCache: () => Promise<CatalogUpdateGeneratedCatalogCache | null>
  }
  showdownEngine: {
    getStorageInfo: () => Promise<BattleLabDesktopEngineStorageInfo>
    readMetadata: () => Promise<CatalogUpdateShowdownEngineMetadata | null>
    writeMetadata: (metadata: CatalogUpdateShowdownEngineMetadata) => Promise<CatalogUpdateShowdownEngineMetadata>
    writeCacheEntry: (
      metadata: CatalogUpdateShowdownEngineMetadata,
      payload?: CatalogUpdateShowdownEnginePayload,
    ) => Promise<CatalogUpdateShowdownEngineMetadata>
    readPayloadMetadata: () => Promise<{ id: 'active'; byteLength: number; storedAtPath: string } | null>
  }
}

declare global {
  interface Window {
    battleLabDesktop?: BattleLabDesktopBridge
  }
}
