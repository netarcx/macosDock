import type { BrowserWindow } from 'electron'
import type { AppInfo, RunningApp } from '../../shared/types'

export interface PlatformAdapter {
  discoverInstalledApps(): Promise<AppInfo[]>
  resolveIcon(iconName: string, size: number): Promise<string>
  launchApp(execCommand: string): Promise<number>
  startWindowTracking(callback: (apps: RunningApp[]) => void): void
  stopWindowTracking(): void
  focusWindow(appId: string, windowId: number): Promise<void>
  quitApp(pid: number): Promise<void>
  configureDockWindow(window: BrowserWindow): void
  openTrash(): Promise<void>
  isTrashEmpty(): Promise<boolean>
}
