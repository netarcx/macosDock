import { execFile } from 'child_process'
import { promisify } from 'util'
import type { RunningApp } from '../../../shared/types'

const execFileAsync = promisify(execFile)

export class WindowTracker {
  private interval: ReturnType<typeof setInterval> | null = null
  private callback: ((apps: RunningApp[]) => void) | null = null

  start(callback: (apps: RunningApp[]) => void): void {
    this.callback = callback
    this.poll()
    this.interval = setInterval(() => this.poll(), 1000)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.callback = null
  }

  private async poll(): Promise<void> {
    if (!this.callback) return

    try {
      const apps = await this.getRunningApps()
      this.callback(apps)
    } catch {
      // xprop not available or X11 not running
    }
  }

  async getRunningApps(): Promise<RunningApp[]> {
    const { stdout: clientList } = await execFileAsync('xprop', [
      '-root', '_NET_CLIENT_LIST'
    ])

    const match = clientList.match(/#\s*(.+)/)
    if (!match) return []

    const windowIds = match[1].split(',').map(s => s.trim()).filter(Boolean)

    const { stdout: activeWin } = await execFileAsync('xprop', [
      '-root', '_NET_ACTIVE_WINDOW'
    ])
    const activeMatch = activeWin.match(/window id # (0x[0-9a-fA-F]+)/)
    const activeWindowId = activeMatch ? activeMatch[1] : ''

    const appMap = new Map<string, RunningApp>()

    for (const wid of windowIds) {
      try {
        const { stdout: props } = await execFileAsync('xprop', [
          '-id', wid, 'WM_CLASS', 'WM_NAME', '_NET_WM_PID'
        ])

        const classMatch = props.match(/WM_CLASS\(STRING\) = "([^"]*)", "([^"]*)"/)
        if (!classMatch) continue

        const wmClass = classMatch[2]
        const wmName = props.match(/WM_NAME\(.*\) = "([^"]*)"/)?.[1] || wmClass
        const pidMatch = props.match(/_NET_WM_PID\(CARDINAL\) = (\d+)/)
        const pid = pidMatch ? parseInt(pidMatch[1]) : 0
        const numericWid = parseInt(wid, 16)

        const existing = appMap.get(wmClass)
        if (existing) {
          existing.windowIds.push(numericWid)
          if (wid === activeWindowId) existing.isFocused = true
        } else {
          appMap.set(wmClass, {
            appId: wmClass,
            pid,
            windowIds: [numericWid],
            name: wmName,
            iconPath: '',
            isFocused: wid === activeWindowId,
            wmClass,
          })
        }
      } catch {
        continue
      }
    }

    return Array.from(appMap.values())
  }

  async focusWindow(windowId: number): Promise<void> {
    const hexId = '0x' + windowId.toString(16)
    await execFileAsync('xdotool', ['windowactivate', hexId]).catch(() => {
      // xdotool may not be installed, try wmctrl as fallback
      return execFileAsync('wmctrl', ['-i', '-a', hexId])
    })
  }
}
