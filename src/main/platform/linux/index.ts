import type { BrowserWindow } from 'electron'
import { shell } from 'electron'
import { readdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
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

  startWindowTracking(callback: (apps: RunningApp[]) => void): void {
    this.windowTracker.start(callback)
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
