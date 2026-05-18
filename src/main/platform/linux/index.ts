import type { BrowserWindow } from 'electron'
import { shell } from 'electron'
import { execFile } from 'child_process'
import { readdir } from 'fs/promises'
import { homedir } from 'os'
import { basename, join } from 'path'
import { promisify } from 'util'
import type { PlatformAdapter } from '../types'
import type { AppInfo, RunningApp } from '../../../shared/types'
import { discoverInstalledApps } from './app-discovery'
import { resolveIcon } from './icon-resolver'
import { WindowTracker } from './window-tracker'
import { launchApp } from './app-launcher'
import { configureDockWindow } from './dock-position'

const execFileAsync = promisify(execFile)

export class LinuxAdapter implements PlatformAdapter {
  private windowTracker = new WindowTracker()
  private installedApps: AppInfo[] = []
  private runningApps: RunningApp[] = []

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
      const enriched: RunningApp[] = []
      for (const app of rawApps) {
        const desktop = this.matchAppToDesktop(app)
        if (!desktop) {
          enriched.push(app)
          continue
        }
        enriched.push({
          ...app,
          appId: desktop.appId,
          name: desktop.name,
          iconPath: desktop.iconPath,
          wmClass: desktop.startupWMClass || app.wmClass,
        })
      }
      this.runningApps = enriched
      callback(enriched)
    })
  }

  stopWindowTracking(): void {
    this.windowTracker.stop()
  }

  async focusWindow(appId: string, windowId: number): Promise<void> {
    await this.windowTracker.focusWindow(windowId)

    if (appId) {
      const running = this.runningApps.find(a => a.appId === appId || a.wmClass === appId)
      if (running) {
        const isRealX11Window = running.windowIds.length > 0 && running.windowIds[0] !== running.pid
        if (!isRealX11Window) {
          await this.focusViaDBus(running)
        }
      }
    }
  }

  private async focusViaDBus(running: RunningApp): Promise<void> {
    const app = this.installedApps.find(a => a.appId === running.appId)
    if (!app) return

    const desktopBase = basename(app.desktopFile, '.desktop')

    if (desktopBase.includes('.')) {
      const objectPath = '/' + desktopBase.replace(/\./g, '/')
      try {
        await execFileAsync('gdbus', [
          'call', '--session',
          '--dest', desktopBase,
          '--object-path', objectPath,
          '--method', 'org.freedesktop.Application.Activate',
          '{}',
        ], { timeout: 2000 })
        return
      } catch {
        // Not available via D-Bus
      }
    }

    try {
      await execFileAsync('gtk-launch', [desktopBase], { timeout: 3000 })
    } catch {
      // gtk-launch not available
    }
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
    const err = await shell.openPath(trashPath)
    if (err) throw new Error(err)
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
