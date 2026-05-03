import type { BrowserWindow } from 'electron'
import { shell } from 'electron'
import { readdir } from 'fs/promises'
import { homedir } from 'os'
import { basename, join } from 'path'
import type { PlatformAdapter } from '../types'
import type { AppInfo, RunningApp } from '../../../shared/types'
import { discoverInstalledApps } from './app-discovery'
import { resolveIcon } from './icon-resolver'
import { WindowTracker } from './window-tracker'
import { launchApp } from './app-launcher'
import { configureDockWindow } from './dock-position'

export class LinuxAdapter implements PlatformAdapter {
  private windowTracker = new WindowTracker()
  private installedApps: AppInfo[] = []

  async discoverInstalledApps(): Promise<AppInfo[]> {
    this.installedApps = await discoverInstalledApps()
    return this.installedApps
  }

  async resolveIcon(iconName: string, size: number): Promise<string> {
    return (await resolveIcon(iconName, size)) || ''
  }

  async launchApp(execCommand: string): Promise<number> {
    return launchApp(execCommand)
  }

  private matchAppToDesktop(runningApp: RunningApp): AppInfo | undefined {
    const wmClass = runningApp.wmClass.toLowerCase()
    const name = runningApp.name.toLowerCase()

    return this.installedApps.find(app => {
      const swmc = app.startupWMClass?.toLowerCase() || ''
      const appName = app.name.toLowerCase()
      const desktopBase = basename(app.desktopFile, '.desktop').toLowerCase()
      const execBase = basename(app.execCommand.split(/\s+/)[0]).toLowerCase()

      return swmc === wmClass ||
        appName === wmClass ||
        desktopBase === wmClass ||
        execBase === wmClass ||
        swmc === name ||
        appName === name ||
        desktopBase === name ||
        execBase === name
    })
  }

  startWindowTracking(callback: (apps: RunningApp[]) => void): void {
    this.windowTracker.start((rawApps) => {
      const enriched = rawApps.map(app => {
        const desktop = this.matchAppToDesktop(app)
        if (desktop) {
          return {
            ...app,
            appId: desktop.appId,
            name: desktop.name,
            iconPath: desktop.iconPath,
            wmClass: desktop.startupWMClass || app.wmClass,
          }
        }
        return app
      })
      callback(enriched)
    })
  }

  stopWindowTracking(): void {
    this.windowTracker.stop()
  }

  async focusWindow(_appId: string, windowId: number): Promise<void> {
    await this.windowTracker.focusWindow(windowId)
  }

  async quitApp(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // process may have already exited
    }
  }

  configureDockWindow(window: BrowserWindow): void {
    configureDockWindow(window)
  }

  async openTrash(): Promise<void> {
    const trashPath = join(homedir(), '.local/share/Trash/files')
    await shell.openPath(trashPath)
  }

  async isTrashEmpty(): Promise<boolean> {
    const trashPath = join(homedir(), '.local/share/Trash/files')
    try {
      const files = await readdir(trashPath)
      return files.length === 0
    } catch {
      return true
    }
  }
}
