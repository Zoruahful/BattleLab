const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('battleLabDesktop', {
  app: {
    getStorageInfo: () => ipcRenderer.invoke('battlelab:app:get-storage-info'),
    openDataFolder: () => ipcRenderer.invoke('battlelab:app:open-data-folder'),
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke('battlelab:window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('battlelab:window:toggle-maximize'),
    close: () => ipcRenderer.invoke('battlelab:window:close'),
    isMaximized: () => ipcRenderer.invoke('battlelab:window:is-maximized'),
  },
  catalog: {
    getStorageInfo: () => ipcRenderer.invoke('battlelab:catalog:get-storage-info'),
    readAllMetadata: () => ipcRenderer.invoke('battlelab:catalog:read-all-metadata'),
    readSectionMetadata: (section) => ipcRenderer.invoke('battlelab:catalog:read-section-metadata', section),
    hasSectionPayload: (section) => ipcRenderer.invoke('battlelab:catalog:has-section-payload', section),
    readSectionPayload: (section) => ipcRenderer.invoke('battlelab:catalog:read-section-payload', section),
    writeSectionMetadata: (metadata) => ipcRenderer.invoke('battlelab:catalog:write-section-metadata', metadata),
    writeSectionCacheEntry: (metadata, payload) =>
      ipcRenderer.invoke('battlelab:catalog:write-section-cache-entry', metadata, payload),
    writeGeneratedCatalogCache: (cacheEntry) =>
      ipcRenderer.invoke('battlelab:catalog:write-generated-cache', cacheEntry),
    readGeneratedCatalogCache: () => ipcRenderer.invoke('battlelab:catalog:read-generated-cache'),
  },
  showdownEngine: {
    getStorageInfo: () => ipcRenderer.invoke('battlelab:showdown-engine:get-storage-info'),
    readMetadata: () => ipcRenderer.invoke('battlelab:showdown-engine:read-metadata'),
    writeMetadata: (metadata) => ipcRenderer.invoke('battlelab:showdown-engine:write-metadata', metadata),
    writeCacheEntry: (metadata, payload) =>
      ipcRenderer.invoke('battlelab:showdown-engine:write-cache-entry', metadata, payload),
    readPayloadMetadata: () => ipcRenderer.invoke('battlelab:showdown-engine:read-payload-metadata'),
  },
})
