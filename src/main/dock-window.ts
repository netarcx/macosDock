import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'

export function createDockWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  // Tall enough for base icons + magnified overflow + padding
  const dockHeight = 140

  const win = new BrowserWindow({
    width: display.size.width,
    height: dockHeight,
    x: 0,
    y: display.size.height - dockHeight,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    type: 'dock',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  win.setVisibleOnAllWorkspaces(true)

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
