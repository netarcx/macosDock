export interface DockItemConfig {
  id: string
  type: 'pinned' | 'running' | 'trash'
  appId: string
  name: string
  iconPath: string
  execCommand?: string
  desktopFile?: string
  startupWMClass?: string
  position: number
}

export interface RunningApp {
  appId: string
  pid: number
  windowIds: number[]
  name: string
  iconPath: string
  isFocused: boolean
  wmClass: string
}

export interface DockConfig {
  iconSize: number
  magnification: boolean
  magnificationScale: number
  autoHide: boolean
  autoHideDelay: number
  pinnedItems: DockItemConfig[]
  showTrash: boolean
  theme: 'light' | 'dark' | 'auto'
}

export interface AppInfo {
  appId: string
  name: string
  iconPath: string
  execCommand: string
  desktopFile: string
  startupWMClass: string
  categories: string[]
}
