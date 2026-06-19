const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const appFolderName = 'BattleLab'
const dataFolderName = 'data'
const activeFolderName = 'active'
const stagingFolderName = 'staging'
const catalogFolderName = 'catalog'
const engineFolderName = 'engine'
const logsFolderName = 'logs'
const metadataFileName = 'metadata.json'
const payloadFileName = 'pokemon-showdown-package.tgz'
const generatedCatalogFileName = 'latest.json'

let mainWindow = null

function resolveDataRoot() {
  return path.join(app.getPath('documents'), appFolderName, dataFolderName)
}

function resolveCatalogRoot() {
  return path.join(resolveDataRoot(), catalogFolderName)
}

function resolveEngineRoot() {
  return path.join(resolveDataRoot(), engineFolderName)
}

function resolveStagingRoot() {
  return path.join(resolveDataRoot(), stagingFolderName)
}

function resolveLogsRoot() {
  return path.join(resolveDataRoot(), logsFolderName)
}

function resolveEngineActiveRoot() {
  return path.join(resolveEngineRoot(), activeFolderName)
}

function assertInsideDataRoot(targetPath) {
  const root = path.resolve(resolveDataRoot())
  const resolved = path.resolve(targetPath)

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Refusing to access a path outside BattleLab app-managed data storage.')
  }

  return resolved
}

function assertKnownCatalogSection(section) {
  const allowed = new Set(['pokemon', 'moves', 'abilities', 'items', 'types', 'natures'])
  if (!allowed.has(section)) {
    throw new Error(`Unknown BattleLab catalog section: ${section}`)
  }

  return section
}

async function ensureFolder(folderPath) {
  const resolved = assertInsideDataRoot(folderPath)
  await fs.mkdir(resolved, { recursive: true })
  return resolved
}

async function ensureDataFolders() {
  const dataRoot = await ensureFolder(resolveDataRoot())
  const catalogRoot = await ensureFolder(resolveCatalogRoot())
  const engineRoot = await ensureFolder(resolveEngineRoot())
  const stagingRoot = await ensureFolder(resolveStagingRoot())
  const logsRoot = await ensureFolder(resolveLogsRoot())
  await ensureFolder(resolveEngineActiveRoot())

  return { dataRoot, catalogRoot, engineRoot, stagingRoot, logsRoot }
}

async function readJsonIfPresent(filePath) {
  try {
    const raw = await fs.readFile(assertInsideDataRoot(filePath), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error && error.code === 'ENOENT') return null
    throw error
  }
}

async function writeJsonFile(filePath, value) {
  const resolved = assertInsideDataRoot(filePath)
  await ensureFolder(path.dirname(resolved))
  const stagingPath = assertInsideDataRoot(path.join(resolveStagingRoot(), `${Date.now()}-${path.basename(resolved)}.tmp`))
  await fs.writeFile(stagingPath, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(stagingPath, resolved)
  return value
}

function resolveCatalogSectionRoot(section) {
  return path.join(resolveCatalogRoot(), 'sections', assertKnownCatalogSection(section))
}

function resolveCatalogSectionMetadataPath(section) {
  return path.join(resolveCatalogSectionRoot(section), metadataFileName)
}

function resolveCatalogSectionPayloadPath(section) {
  return path.join(resolveCatalogSectionRoot(section), 'payload.json')
}

function resolveGeneratedCatalogPath() {
  return path.join(resolveCatalogRoot(), 'generated', generatedCatalogFileName)
}

function getStorageInfo() {
  return {
    adapter: 'electron-documents-file-storage',
    dataRoot: resolveDataRoot(),
    catalogRoot: resolveCatalogRoot(),
    engineRoot: resolveEngineRoot(),
    stagingRoot: resolveStagingRoot(),
    logsRoot: resolveLogsRoot(),
  }
}

async function createWindow() {
  await ensureDataFolders()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f4f2ee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devServerUrl =
    process.env.BATTLELAB_DEV_SERVER_URL ||
    process.env.VITE_DEV_SERVER_URL ||
    (!app.isPackaged ? 'http://localhost:5173' : '')

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    return
  }

  await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('battlelab:app:get-storage-info', async () => {
  await ensureDataFolders()
  return getStorageInfo()
})

ipcMain.handle('battlelab:app:open-data-folder', async () => {
  await ensureDataFolders()
  await shell.openPath(resolveDataRoot())
  return getStorageInfo()
})

ipcMain.handle('battlelab:window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('battlelab:window:toggle-maximize', () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
    return false
  }
  mainWindow.maximize()
  return true
})

ipcMain.handle('battlelab:window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('battlelab:window:is-maximized', () => Boolean(mainWindow?.isMaximized()))

ipcMain.handle('battlelab:catalog:get-storage-info', async () => {
  await ensureDataFolders()
  return getStorageInfo()
})

ipcMain.handle('battlelab:catalog:read-all-metadata', async () => {
  await ensureDataFolders()
  const sections = ['pokemon', 'moves', 'abilities', 'items', 'types', 'natures']
  const entries = await Promise.all(sections.map((section) => readJsonIfPresent(resolveCatalogSectionMetadataPath(section))))
  return entries.filter(Boolean)
})

ipcMain.handle('battlelab:catalog:read-section-metadata', async (_event, section) => {
  await ensureDataFolders()
  return readJsonIfPresent(resolveCatalogSectionMetadataPath(section))
})

ipcMain.handle('battlelab:catalog:has-section-payload', async (_event, section) => {
  await ensureDataFolders()
  try {
    await fs.access(assertInsideDataRoot(resolveCatalogSectionPayloadPath(section)))
    return true
  } catch (error) {
    if (error && error.code === 'ENOENT') return false
    throw error
  }
})

ipcMain.handle('battlelab:catalog:read-section-payload', async (_event, section) => {
  await ensureDataFolders()
  return readJsonIfPresent(resolveCatalogSectionPayloadPath(section))
})

ipcMain.handle('battlelab:catalog:write-section-metadata', async (_event, metadata) => {
  await ensureDataFolders()
  return writeJsonFile(resolveCatalogSectionMetadataPath(metadata.section), metadata)
})

ipcMain.handle('battlelab:catalog:write-section-cache-entry', async (_event, metadata, payload) => {
  await ensureDataFolders()
  await writeJsonFile(resolveCatalogSectionMetadataPath(metadata.section), metadata)
  await writeJsonFile(resolveCatalogSectionPayloadPath(metadata.section), payload)
  return metadata
})

ipcMain.handle('battlelab:catalog:write-generated-cache', async (_event, cacheEntry) => {
  await ensureDataFolders()
  return writeJsonFile(resolveGeneratedCatalogPath(), cacheEntry)
})

ipcMain.handle('battlelab:catalog:read-generated-cache', async () => {
  await ensureDataFolders()
  return readJsonIfPresent(resolveGeneratedCatalogPath())
})

ipcMain.handle('battlelab:showdown-engine:get-storage-info', async () => {
  await ensureDataFolders()
  const activeRoot = resolveEngineActiveRoot()

  return {
    adapter: 'electron-documents-file-storage',
    root: resolveEngineRoot(),
    activeRoot,
    metadataFile: path.join(activeRoot, metadataFileName),
    payloadFile: path.join(activeRoot, payloadFileName),
  }
})

ipcMain.handle('battlelab:showdown-engine:read-metadata', async () => {
  await ensureDataFolders()
  return readJsonIfPresent(path.join(resolveEngineActiveRoot(), metadataFileName))
})

ipcMain.handle('battlelab:showdown-engine:write-metadata', async (_event, metadata) => {
  await ensureDataFolders()
  return writeJsonFile(path.join(resolveEngineActiveRoot(), metadataFileName), metadata)
})

ipcMain.handle('battlelab:showdown-engine:write-cache-entry', async (_event, metadata, payload) => {
  await ensureDataFolders()
  await writeJsonFile(path.join(resolveEngineActiveRoot(), metadataFileName), metadata)

  if (payload?.payload) {
    const payloadPath = assertInsideDataRoot(path.join(resolveEngineActiveRoot(), payloadFileName))
    await ensureFolder(path.dirname(payloadPath))
    const bytes = Buffer.from(payload.payload)
    await fs.writeFile(payloadPath, bytes)
  }

  return metadata
})

ipcMain.handle('battlelab:showdown-engine:read-payload-metadata', async () => {
  await ensureDataFolders()
  const payloadPath = assertInsideDataRoot(path.join(resolveEngineActiveRoot(), payloadFileName))

  try {
    const stats = await fs.stat(payloadPath)
    return {
      id: 'active',
      byteLength: stats.size,
      storedAtPath: payloadPath,
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') return null
    throw error
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})
