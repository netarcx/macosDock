import type { BrowserWindow } from 'electron'
import { screen } from 'electron'

export function configureDockWindow(window: BrowserWindow): void {
  const display = screen.getPrimaryDisplay()
  const dockHeight = 130

  window.setBounds({
    x: 0,
    y: display.size.height - dockHeight,
    width: display.size.width,
    height: dockHeight,
  })
}

export function resizeDockWindow(window: BrowserWindow, newHeight: number): void {
  const display = screen.getPrimaryDisplay()
  window.setBounds({
    x: 0,
    y: display.size.height - newHeight,
    width: display.size.width,
    height: newHeight,
  })
}
