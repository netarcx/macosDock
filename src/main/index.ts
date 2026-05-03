import { app, BrowserWindow } from 'electron'
import { createDockWindow } from './dock-window'
import { createPlatformAdapter } from './platform'
import { registerIpcHandlers, getConfig } from './ipc-handlers'

let dockWindow: BrowserWindow | null = null

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('in-process-gpu')
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const platform = createPlatformAdapter()

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
