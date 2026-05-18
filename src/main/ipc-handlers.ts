import { ipcMain, BrowserWindow, app, shell } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { homedir } from 'os'
import { execFile } from 'child_process'
import { IPC } from '../shared/ipc-channels'
import type { PlatformAdapter } from './platform/types'
import type { DockConfig, DockItemConfig, RunningApp, AppInfo, DownloadPreviewItem } from '../shared/types'
import { launchApp } from './platform/linux/app-launcher'

function getConfigPath(): string {
  const dir = join(app.getPath('userData'), 'config')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'dock-config.json')
}

function readStore(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(getConfigPath(), 'utf-8'))
  } catch {
    return {}
  }
}

function writeStore(data: Record<string, unknown>): void {
  writeFileSync(getConfigPath(), JSON.stringify(data, null, 2))
}

const store = {
  get(key: string, defaultValue: unknown): unknown {
    const data = readStore()
    return data[key] !== undefined ? data[key] : defaultValue
  },
  set(key: string, value: unknown): void {
    const data = readStore()
    data[key] = value
    writeStore(data)
  },
}

const DEFAULT_CONFIG: DockConfig = {
  iconSize: 48,
  magnification: true,
  magnificationScale: 2.0,
  autoHide: false,
  autoHideDelay: 1000,
  pinnedItems: [],
  showTrash: true,
  showDownloads: true,
  theme: 'dark',
}

let installedApps: AppInfo[] = []
let runningApps: RunningApp[] = []
let isDiscovering = false

export function getConfig(): DockConfig {
  return store.get('config', DEFAULT_CONFIG) as DockConfig
}

function saveConfig(config: DockConfig): void {
  store.set('config', config)
}

function setupDefaultPins(apps: AppInfo[]): void {
  const config = getConfig()
  if (config.pinnedItems.length > 0) return

  const defaultNames = ['nautilus', 'org.gnome.Nautilus', 'firefox', 'org.gnome.TextEditor', 'org.gnome.Settings']
  const pinned: DockItemConfig[] = []
  let pos = 0

  const filesApp = apps.find(a =>
    a.desktopFile.toLowerCase().includes('nautilus') ||
    a.name.toLowerCase() === 'files'
  )
  if (filesApp) {
    pinned.push({
      id: 'pin-files',
      type: 'pinned',
      appId: filesApp.appId,
      name: filesApp.name,
      iconPath: filesApp.iconPath,
      execCommand: filesApp.execCommand,
      desktopFile: filesApp.desktopFile,
      startupWMClass: filesApp.startupWMClass,
      position: pos++,
      locked: true,
    })
  }

  for (const name of defaultNames) {
    if (name.toLowerCase().includes('nautilus')) continue
    const foundApp = apps.find(a =>
      a.desktopFile.toLowerCase().includes(name.toLowerCase()) ||
      a.name.toLowerCase().includes(name.toLowerCase())
    )
    if (foundApp) {
      pinned.push({
        id: `pin-${Date.now()}-${pos}`,
        type: 'pinned',
        appId: foundApp.appId,
        name: foundApp.name,
        iconPath: foundApp.iconPath,
        execCommand: foundApp.execCommand,
        desktopFile: foundApp.desktopFile,
        startupWMClass: foundApp.startupWMClass,
        position: pos++,
      })
    }
  }

  if (pinned.length > 0) {
    config.pinnedItems = pinned
    saveConfig(config)
  }
}

export function registerIpcHandlers(
  platform: PlatformAdapter,
  getDockWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC.GET_CONFIG, () => getConfig())

  ipcMain.handle(IPC.SAVE_CONFIG, (_event, config: unknown) => {
    if (!config || typeof config !== 'object') return
    saveConfig(config as DockConfig)
  })

  ipcMain.handle(IPC.GET_INSTALLED_APPS, async () => {
    if (installedApps.length > 0) return installedApps
    if (isDiscovering) {
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (!isDiscovering) { clearInterval(check); resolve() }
        }, 100)
      })
      return installedApps
    }
    isDiscovering = true
    try {
      installedApps = await platform.discoverInstalledApps()
      setupDefaultPins(installedApps)
    } finally {
      isDiscovering = false
    }
    return installedApps
  })

  ipcMain.handle(IPC.GET_RUNNING_APPS, () => runningApps)

  ipcMain.handle(IPC.LAUNCH_APP, async (_event, appId: unknown) => {
    if (typeof appId !== 'string' || !appId) return
    const foundApp = installedApps.find(a => a.appId === appId)
    if (foundApp) {
      await platform.launchApp(foundApp.execCommand)
    }
  })

  ipcMain.handle(IPC.FOCUS_APP, async (_event, appId: unknown) => {
    if (typeof appId !== 'string' || !appId) return
    const running = runningApps.find(a => a.appId === appId || a.wmClass === appId)
    if (running && running.windowIds.length > 0) {
      await platform.focusWindow(running.appId, running.windowIds[0])
    }
  })

  ipcMain.handle(IPC.FOCUS_WINDOW, async (_event, windowId: unknown) => {
    if (typeof windowId !== 'number' || !Number.isFinite(windowId) || windowId < 0) return
    await platform.focusWindow('', windowId)
  })

  ipcMain.handle(IPC.QUIT_APP, async (_event, appId: unknown) => {
    if (typeof appId !== 'string' || !appId) return
    const running = runningApps.find(a => a.appId === appId || a.wmClass === appId)
    if (running) {
      await platform.quitApp(running.pid)
    }
  })

  ipcMain.handle(IPC.PIN_APP, async (_event, appId: unknown) => {
    if (typeof appId !== 'string' || !appId) return
    const config = getConfig()
    const foundApp = installedApps.find(a => a.appId === appId)
    if (!foundApp) return

    const alreadyPinned = config.pinnedItems.some(p => p.appId === appId)
    if (alreadyPinned) return

    const newItem: DockItemConfig = {
      id: `pin-${Date.now()}`,
      type: 'pinned',
      appId: foundApp.appId,
      name: foundApp.name,
      iconPath: foundApp.iconPath,
      execCommand: foundApp.execCommand,
      desktopFile: foundApp.desktopFile,
      startupWMClass: foundApp.startupWMClass,
      position: config.pinnedItems.length,
    }

    config.pinnedItems.push(newItem)
    saveConfig(config)
  })

  ipcMain.handle(IPC.UNPIN_APP, (_event, appId: unknown) => {
    if (typeof appId !== 'string' || !appId) return
    const config = getConfig()
    const item = config.pinnedItems.find(p => p.appId === appId)
    if (item?.locked) return
    config.pinnedItems = config.pinnedItems.filter(p => p.appId !== appId)
    config.pinnedItems.forEach((p, i) => { p.position = i })
    saveConfig(config)
  })

  ipcMain.handle(IPC.REORDER_PINNED, (_event, orderedIds: unknown) => {
    if (!Array.isArray(orderedIds)) return
    const config = getConfig()
    const itemMap = new Map(config.pinnedItems.map(p => [p.id, p]))
    config.pinnedItems = (orderedIds as string[])
      .filter(id => typeof id === 'string')
      .map(id => itemMap.get(id))
      .filter((item): item is DockItemConfig => item !== undefined)
    config.pinnedItems.forEach((p, i) => { p.position = i })
    saveConfig(config)
  })

  ipcMain.handle(IPC.OPEN_TRASH, () => platform.openTrash())
  ipcMain.handle(IPC.GET_TRASH_STATUS, () => platform.isTrashEmpty())

  ipcMain.handle(IPC.OPEN_DOWNLOADS, async () => {
    const downloadsPath = join(homedir(), 'Downloads')
    const err = await shell.openPath(downloadsPath)
    if (err) throw new Error(err)
  })

  ipcMain.handle(IPC.GET_DOWNLOADS_PREVIEW, (): DownloadPreviewItem[] => {
    const downloadsPath = join(homedir(), 'Downloads')
    try {
      const entries = readdirSync(downloadsPath)
      return entries
        .slice(0, 5)
        .map(name => {
          const fullPath = join(downloadsPath, name)
          let isDir = false
          try { isDir = statSync(fullPath).isDirectory() } catch {}
          const ext = extname(name).toLowerCase()
          return { name, iconPath: ext, isDirectory: isDir }
        })
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC.OPEN_LAUNCHPAD, () => {
    const helperPaths = [
      join(__dirname, '../../src/main/platform/linux/x11-helper.py'),
      join(__dirname, '../../../src/main/platform/linux/x11-helper.py'),
      join(process.cwd(), 'src/main/platform/linux/x11-helper.py'),
    ]
    for (const p of helperPaths) {
      if (!existsSync(p)) continue
      execFile('python3', [p, 'super+a'], { env: { ...process.env, DISPLAY: ':0' } }, () => {})
      return
    }
  })

  ipcMain.handle(IPC.RESIZE_DOCK, (_event, height: unknown) => {
    if (typeof height !== 'number' || !Number.isFinite(height) || height < 50 || height > 500) return
    const win = getDockWindow()
    if (win && !win.isDestroyed()) {
      const { screen } = require('electron')
      const display = screen.getPrimaryDisplay()
      win.setBounds({
        x: display.workArea.x,
        y: display.workArea.y + display.workArea.height - height,
        width: display.workArea.width,
        height,
      })
    }
  })

  platform.startWindowTracking((apps) => {
    runningApps = apps
    const win = getDockWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.RUNNING_APPS_CHANGED, apps)
    }
  })
}
