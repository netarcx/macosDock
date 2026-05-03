import { app, BrowserWindow } from 'electron'
import { createDockWindow } from './dock-window'
import { createPlatformAdapter } from './platform'
import { registerIpcHandlers } from './ipc-handlers'

let dockWindow: BrowserWindow | null = null

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const platform = createPlatformAdapter()

  // Pre-discover installed apps
  await platform.discoverInstalledApps()

  dockWindow = createDockWindow()
  platform.configureDockWindow(dockWindow)

  registerIpcHandlers(platform, () => dockWindow)

  dockWindow.on('closed', () => {
    dockWindow = null
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
