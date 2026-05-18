import type { BrowserWindow } from 'electron'
import { screen } from 'electron'

export function configureDockWindow(window: BrowserWindow): void {
  const display = screen.getPrimaryDisplay()
  const dockHeight = 130

  window.setBounds({
    x: display.workArea.x,
    y: display.workArea.y + display.workArea.height - dockHeight,
    width: display.workArea.width,
    height: dockHeight,
  })
}

export function resizeDockWindow(window: BrowserWindow, newHeight: number): void {
  const display = screen.getPrimaryDisplay()
  window.setBounds({
    x: display.workArea.x,
    y: display.workArea.y + display.workArea.height - newHeight,
    width: display.workArea.width,
    height: newHeight,
  })
}
