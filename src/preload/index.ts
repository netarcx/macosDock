import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { DockConfig, RunningApp, AppInfo } from '../shared/types'

const dockAPI = {
  getConfig: (): Promise<DockConfig> => ipcRenderer.invoke(IPC.GET_CONFIG),
  saveConfig: (config: DockConfig): Promise<void> => ipcRenderer.invoke(IPC.SAVE_CONFIG, config),
  getInstalledApps: (): Promise<AppInfo[]> => ipcRenderer.invoke(IPC.GET_INSTALLED_APPS),
  getRunningApps: (): Promise<RunningApp[]> => ipcRenderer.invoke(IPC.GET_RUNNING_APPS),
  launchApp: (appId: string): Promise<void> => ipcRenderer.invoke(IPC.LAUNCH_APP, appId),
  focusApp: (appId: string): Promise<void> => ipcRenderer.invoke(IPC.FOCUS_APP, appId),
  quitApp: (appId: string): Promise<void> => ipcRenderer.invoke(IPC.QUIT_APP, appId),
  pinApp: (appId: string): Promise<void> => ipcRenderer.invoke(IPC.PIN_APP, appId),
  unpinApp: (appId: string): Promise<void> => ipcRenderer.invoke(IPC.UNPIN_APP, appId),
  reorderPinned: (orderedIds: string[]): Promise<void> => ipcRenderer.invoke(IPC.REORDER_PINNED, orderedIds),
  openTrash: (): Promise<void> => ipcRenderer.invoke(IPC.OPEN_TRASH),
  getTrashStatus: (): Promise<boolean> => ipcRenderer.invoke(IPC.GET_TRASH_STATUS),
  openDownloads: (): Promise<void> => ipcRenderer.invoke(IPC.OPEN_DOWNLOADS),
  openLaunchpad: (): Promise<void> => ipcRenderer.invoke(IPC.OPEN_LAUNCHPAD),
  onRunningAppsChanged: (callback: (apps: RunningApp[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, apps: RunningApp[]) => callback(apps)
    ipcRenderer.on(IPC.RUNNING_APPS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.RUNNING_APPS_CHANGED, listener)
  }
}

contextBridge.exposeInMainWorld('dockAPI', dockAPI)

export type DockAPI = typeof dockAPI
