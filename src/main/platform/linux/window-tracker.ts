import { execFile } from 'child_process'
import { readdir, readFile, readlink } from 'fs/promises'
import { basename } from 'path'
import { promisify } from 'util'
import type { RunningApp } from '../../../shared/types'

const execFileAsync = promisify(execFile)

export class WindowTracker {
  private interval: ReturnType<typeof setInterval> | null = null
  private callback: ((apps: RunningApp[]) => void) | null = null

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
    if (!this.callback) return
    try {
      const apps = await this.getRunningApps()
      this.callback(apps)
    } catch {
      // polling failure, will retry
    }
  }

  async getRunningApps(): Promise<RunningApp[]> {
    const pids = await readdir('/proc').catch(() => [])
    const appMap = new Map<string, RunningApp>()

    for (const entry of pids) {
      if (!/^\d+$/.test(entry)) continue
      const pid = parseInt(entry)

      try {
        const environRaw = await readFile(`/proc/${pid}/environ`, 'utf-8').catch(() => '')
        if (!environRaw.includes('WAYLAND_DISPLAY') && !environRaw.includes('DISPLAY')) continue

        const comm = (await readFile(`/proc/${pid}/comm`, 'utf-8').catch(() => '')).trim()
        if (!comm) continue

        const skipList = ['bash', 'sh', 'zsh', 'fish', 'node', 'python3', 'python',
          'dbus-daemon', 'dbus-broker', 'gjs', 'Xwayland', 'pipewire',
          'pulseaudio', 'gnome-shell', 'gdm-session-wor', 'gdm-wayland-ses',
          'gsd-', 'ibus-', 'at-spi', 'xdg-', 'gnome-session',
          'snapd', 'snap', 'flatpak-session', 'p11-kit-server',
          'gvfs', 'evolution-data', 'tracker-', 'fwupd', 'udisksd',
          'polkitd', 'accounts-daemon', 'systemd', 'dconf-service']

        if (skipList.some(s => comm.startsWith(s))) continue

        // Skip helper/utility processes (child processes of browsers etc.)
        const helperNames = ['Web Content', 'WebExtensions', 'RDD Process',
          'Utility Process', 'Socket Process', 'Privileged Cont',
          'Isolated Web Co', 'GPU Process', 'crashhelper', 'forkserver']
        if (helperNames.some(h => comm.startsWith(h))) continue

        // Try to get the exe name
        let exeName = comm
        try {
          const exePath = await readlink(`/proc/${pid}/exe`)
          exeName = basename(exePath)
        } catch {
          // permission denied is common
        }

        if (appMap.has(exeName)) continue

        appMap.set(exeName, {
          appId: exeName,
          pid,
          windowIds: [pid],
          name: comm,
          iconPath: '',
          isFocused: false,
          wmClass: exeName,
        })
      } catch {
        continue
      }
    }

    return Array.from(appMap.values())
  }

  async focusWindow(windowId: number): Promise<void> {
    // On Wayland, we can try gdbus to activate the app
    // This uses the GNOME Shell Eval interface (may be restricted)
    try {
      await execFileAsync('gdbus', [
        'call', '--session',
        '--dest', 'org.gnome.Shell',
        '--object-path', '/org/gnome/Shell',
        '--method', 'org.gnome.Shell.Eval',
        `global.get_window_actors().find(a => a.meta_window.get_pid() === ${windowId})?.meta_window.activate(global.get_current_time())`
      ])
    } catch {
      // Fallback: try xdotool if available
      try {
        await execFileAsync('xdotool', ['search', '--pid', String(windowId), '--name', '', 'windowactivate'])
      } catch {
        // focus not available
      }
    }
  }
}
