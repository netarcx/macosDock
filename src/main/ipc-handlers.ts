import { ipcMain, BrowserWindow, app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import type { PlatformAdapter } from './platform/types'
import type { DockConfig, DockItemConfig, RunningApp, AppInfo } from '../shared/types'
import { resizeDockWindow } from './platform/linux/dock-position'

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
  theme: 'dark',
}

let installedApps: AppInfo[] = []
let runningApps: RunningApp[] = []

export function getConfig(): DockConfig {
  return store.get('config', DEFAULT_CONFIG) as DockConfig
}

function saveConfig(config: DockConfig): void {
  store.set('config', config)
}

function setupDefaultPins(apps: AppInfo[]): void {
  const config = getConfig()
  if (config.pinnedItems.length > 0) return

  // File browser first, then app launcher / other apps
  const defaultNames = ['nautilus', 'org.gnome.Nautilus', 'firefox', 'org.gnome.TextEditor', 'org.gnome.Settings']
  const pinned: DockItemConfig[] = []
  let pos = 0

  for (const name of defaultNames) {
    const app = apps.find(a =>
      a.desktopFile.toLowerCase().includes(name.toLowerCase()) ||
      a.name.toLowerCase().includes(name.toLowerCase())
    )
    if (app) {
      pinned.push({
        id: `pin-${Date.now()}-${pos}`,
        type: 'pinned',
        appId: app.appId,
        name: app.name,
        iconPath: app.iconPath,
        execCommand: app.execCommand,
        desktopFile: app.desktopFile,
        startupWMClass: app.startupWMClass,
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

  ipcMain.handle(IPC.SAVE_CONFIG, (_event, config: DockConfig) => {
    saveConfig(config)
  })

  ipcMain.handle(IPC.GET_INSTALLED_APPS, async () => {
    if (installedApps.length === 0) {
      installedApps = await platform.discoverInstalledApps()
      setupDefaultPins(installedApps)
    }
    return installedApps
  })

  ipcMain.handle(IPC.GET_RUNNING_APPS, () => runningApps)

  ipcMain.handle(IPC.LAUNCH_APP, async (_event, appId: string) => {
    const app = installedApps.find(a => a.appId === appId)
    if (app) {
      await platform.launchApp(app.execCommand)
    }
  })

  ipcMain.handle(IPC.FOCUS_APP, async (_event, appId: string) => {
    const running = runningApps.find(a => a.appId === appId || a.wmClass === appId)
    if (running && running.windowIds.length > 0) {
      await platform.focusWindow(appId, running.windowIds[0])
    }
  })

  ipcMain.handle(IPC.QUIT_APP, async (_event, appId: string) => {
    const running = runningApps.find(a => a.appId === appId || a.wmClass === appId)
    if (running) {
      await platform.quitApp(running.pid)
    }
  })

  ipcMain.handle(IPC.PIN_APP, async (_event, appId: string) => {
    const config = getConfig()
    const app = installedApps.find(a => a.appId === appId)
    if (!app) return

    const alreadyPinned = config.pinnedItems.some(p => p.appId === appId)
    if (alreadyPinned) return

    const newItem: DockItemConfig = {
      id: `pin-${Date.now()}`,
      type: 'pinned',
      appId: app.appId,
      name: app.name,
      iconPath: app.iconPath,
      execCommand: app.execCommand,
      desktopFile: app.desktopFile,
      startupWMClass: app.startupWMClass,
      position: config.pinnedItems.length,
    }

    config.pinnedItems.push(newItem)
    saveConfig(config)
  })

  ipcMain.handle(IPC.UNPIN_APP, (_event, appId: string) => {
    const config = getConfig()
    config.pinnedItems = config.pinnedItems.filter(p => p.appId !== appId)
    config.pinnedItems.forEach((item, i) => { item.position = i })
    saveConfig(config)
  })

  ipcMain.handle(IPC.REORDER_PINNED, (_event, orderedIds: string[]) => {
    const config = getConfig()
    const itemMap = new Map(config.pinnedItems.map(p => [p.id, p]))
    config.pinnedItems = orderedIds
      .map(id => itemMap.get(id))
      .filter((item): item is DockItemConfig => item !== undefined)
    config.pinnedItems.forEach((item, i) => { item.position = i })
    saveConfig(config)
  })

  ipcMain.handle(IPC.OPEN_TRASH, () => platform.openTrash())

  ipcMain.handle(IPC.GET_TRASH_STATUS, () => platform.isTrashEmpty())

  ipcMain.handle(IPC.RESIZE_DOCK, (_event, height: number) => {
    const win = getDockWindow()
    if (win) resizeDockWindow(win, height)
  })

  // Start window tracking
  platform.startWindowTracking((apps) => {
    runningApps = apps
    const win = getDockWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.RUNNING_APPS_CHANGED, apps)
    }
  })
}
