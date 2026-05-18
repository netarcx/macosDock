import { app, BrowserWindow, protocol, net } from 'electron'
import { createDockWindow } from './dock-window'
import { createPlatformAdapter } from './platform'
import { registerIpcHandlers, getConfig } from './ipc-handlers'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

let dockWindow: BrowserWindow | null = null

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('in-process-gpu')
app.disableHardwareAcceleration()

const ALLOWED_ICON_DIRS = [
  '/usr/share/icons',
  '/usr/share/pixmaps',
  '/usr/local/share/icons',
  '/snap',
  '/var/lib/flatpak',
  resolve(app.getPath('home'), '.local/share/icons'),
  resolve(app.getPath('home'), '.icons'),
]

const ALLOWED_EXTENSIONS = ['.png', '.svg', '.xpm', '.ico', '.jpg', '.jpeg']

function isAllowedIconPath(filePath: string): boolean {
  const resolved = resolve(filePath)
  const ext = resolved.substring(resolved.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false
  return ALLOWED_ICON_DIRS.some(dir => resolved.startsWith(dir + '/'))
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'dock-icon', privileges: { bypassCSP: true, supportFetchAPI: true } }
])

app.whenReady().then(async () => {
  protocol.handle('dock-icon', (request) => {
    const filePath = decodeURIComponent(request.url.replace('dock-icon://', ''))
    if (!isAllowedIconPath(filePath)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })

  const platform = createPlatformAdapter()

  dockWindow = createDockWindow()
  platform.configureDockWindow(dockWindow)

  registerIpcHandlers(platform, () => dockWindow)

  dockWindow.on('closed', () => {
    dockWindow = null
  })

  app.on('before-quit', () => {
    platform.stopWindowTracking()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
