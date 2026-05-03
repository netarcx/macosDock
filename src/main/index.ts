import { app, BrowserWindow, protocol, net } from 'electron'
import { createDockWindow } from './dock-window'
import { createPlatformAdapter } from './platform'
import { registerIpcHandlers, getConfig } from './ipc-handlers'
import { pathToFileURL } from 'url'

let dockWindow: BrowserWindow | null = null

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('in-process-gpu')
app.disableHardwareAcceleration()

protocol.registerSchemesAsPrivileged([
  { scheme: 'dock-icon', privileges: { bypassCSP: true, supportFetchAPI: true } }
])

app.whenReady().then(async () => {
  protocol.handle('dock-icon', (request) => {
    const filePath = decodeURIComponent(request.url.replace('dock-icon://', ''))
    return net.fetch(pathToFileURL(filePath).href)
  })

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
