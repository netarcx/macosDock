import { execFile } from 'child_process'
import { readdir, readFile, readlink } from 'fs/promises'
import { basename, join } from 'path'
import { promisify } from 'util'
import type { RunningApp } from '../../../shared/types'

const execFileAsync = promisify(execFile)

interface X11Window {
  wid: number
  pid: number
  wmClass: string
  title: string
  isFocused: boolean
}

async function runHelper(args: string[]): Promise<string> {
  const env = { ...process.env, DISPLAY: ':0' }
  for (const path of [
    join(__dirname, '../../src/main/platform/linux/x11-helper.py'),
    join(__dirname, '../../../src/main/platform/linux/x11-helper.py'),
    join(process.cwd(), 'src/main/platform/linux/x11-helper.py'),
  ]) {
    try {
      const { stdout } = await execFileAsync('python3', [path, ...args], { env, timeout: 3000 })
      return stdout
    } catch (e: any) {
      if (e.code === 'ENOENT' || e.message?.includes('No such file')) continue
      return e.stdout || ''
    }
  }
  return ''
}

export class WindowTracker {
  private interval: ReturnType<typeof setInterval> | null = null
  private callback: ((apps: RunningApp[]) => void) | null = null
  private isPolling = false

  start(callback: (apps: RunningApp[]) => void): void {
    this.callback = callback
    this.poll()
    this.interval = setInterval(() => this.poll(), 1500)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.callback = null
  }

  private async poll(): Promise<void> {
    if (!this.callback || this.isPolling) return
    this.isPolling = true
    try {
      const apps = await this.getRunningApps()
      if (this.callback) this.callback(apps)
    } catch {
      // will retry
    } finally {
      this.isPolling = false
    }
  }

  private async getX11Windows(): Promise<X11Window[]> {
    const stdout = await runHelper(['list'])
    if (!stdout.trim()) return []
    try {
      return JSON.parse(stdout)
    } catch {
      return []
    }
  }

  async getRunningApps(): Promise<RunningApp[]> {
    const x11Windows = await this.getX11Windows()

    const pidToX11 = new Map<number, X11Window[]>()
    for (const win of x11Windows) {
      const list = pidToX11.get(win.pid) || []
      list.push(win)
      pidToX11.set(win.pid, list)
    }

    const pids = await readdir('/proc').catch(() => [] as string[])
    const appMap = new Map<string, RunningApp>()

    const skipList = ['bash', 'sh', 'zsh', 'fish', 'node', 'python3', 'python',
      'dbus-daemon', 'dbus-broker', 'gjs', 'Xwayland', 'pipewire',
      'pulseaudio', 'gnome-shell', 'gdm-session-wor', 'gdm-wayland-ses',
      'gsd-', 'ibus-', 'at-spi', 'xdg-', 'gnome-session',
      'snapd', 'snap', 'flatpak-session', 'p11-kit-server',
      'gvfs', 'evolution-data', 'tracker-', 'fwupd', 'udisksd',
      'polkitd', 'accounts-daemon', 'systemd', 'dconf-service',
      'mutter-x11', 'localsearch', 'speech-dispatch', 'sd_espeak',
      'sd_dummy', 'rygel', 'update-notifier', 'goa-', 'gnome-software',
      'bwrap', 'npm', 'esbuild', 'next-server']

    const helperNames = ['Web Content', 'WebExtensions', 'RDD Process',
      'Utility Process', 'Socket Process', 'Privileged Cont',
      'Isolated Web Co', 'GPU Process', 'crashhelper', 'forkserver']

    const guiPids: number[] = []
    for (const entry of pids) {
      if (!/^\d+$/.test(entry)) continue
      const pid = parseInt(entry)
      if (pidToX11.has(pid)) {
        guiPids.push(pid)
        continue
      }
      try {
        const environRaw = await readFile(`/proc/${pid}/environ`, 'utf-8').catch(() => '')
        if (environRaw.includes('WAYLAND_DISPLAY') || environRaw.includes('DISPLAY')) {
          guiPids.push(pid)
        }
      } catch {
        continue
      }
    }

    for (const pid of guiPids) {
      try {
        const comm = (await readFile(`/proc/${pid}/comm`, 'utf-8').catch(() => '')).trim()
        if (!comm) continue
        if (skipList.some(s => comm.startsWith(s))) continue
        if (helperNames.some(h => comm.startsWith(h))) continue

        let exeName = comm
        try {
          const exePath = await readlink(`/proc/${pid}/exe`)
          exeName = basename(exePath)
        } catch {
          // permission denied
        }

        const x11Wins = pidToX11.get(pid) || []
        const wmClass = x11Wins.length > 0 ? x11Wins[0].wmClass : exeName
        const key = wmClass.toLowerCase()

        if (appMap.has(key)) {
          const existing = appMap.get(key)!
          for (const w of x11Wins) {
            if (!existing.windowIds.includes(w.wid)) {
              existing.windowIds.push(w.wid)
              existing.windowTitles.push(w.title)
            }
            if (w.isFocused) existing.isFocused = true
          }
          continue
        }

        const windowIds = x11Wins.map(w => w.wid)
        const windowTitles = x11Wins.map(w => w.title)
        const isFocused = x11Wins.some(w => w.isFocused)

        appMap.set(key, {
          appId: exeName,
          pid,
          windowIds: windowIds.length > 0 ? windowIds : [pid],
          windowTitles,
          name: wmClass || comm,
          iconPath: '',
          isFocused,
          wmClass: wmClass || exeName,
        })
      } catch {
        continue
      }
    }

    for (const win of x11Windows) {
      const key = win.wmClass.toLowerCase()
      if (!key || appMap.has(key)) continue
      appMap.set(key, {
        appId: win.wmClass,
        pid: win.pid,
        windowIds: [win.wid],
        windowTitles: [win.title],
        name: win.wmClass,
        iconPath: '',
        isFocused: win.isFocused,
        wmClass: win.wmClass,
      })
    }

    return Array.from(appMap.values())
  }

  async focusWindow(windowId: number): Promise<void> {
    await runHelper(['activate', String(windowId)])
  }
}
