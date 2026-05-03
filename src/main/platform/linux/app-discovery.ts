import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { AppInfo } from '../../../shared/types'
import { resolveIcon } from './icon-resolver'

const DESKTOP_DIRS = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  join(homedir(), '.local/share/applications'),
  '/var/lib/snapd/desktop/applications',
  '/var/lib/flatpak/exports/share/applications',
]

function parseDesktopFile(content: string, filePath: string): AppInfo | null {
  const lines = content.split('\n')
  let inDesktopEntry = false
  const fields: Record<string, string> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '[Desktop Entry]') {
      inDesktopEntry = true
      continue
    }
    if (trimmed.startsWith('[') && trimmed !== '[Desktop Entry]') {
      if (inDesktopEntry) break
      continue
    }
    if (!inDesktopEntry) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx).trim()
    const value = trimmed.substring(eqIdx + 1).trim()
    fields[key] = value
  }

  if (fields['NoDisplay'] === 'true' || fields['Hidden'] === 'true') return null
  if (fields['Type'] !== 'Application') return null
  if (!fields['Name'] || !fields['Exec']) return null

  return {
    appId: filePath,
    name: fields['Name'],
    iconPath: fields['Icon'] || '',
    execCommand: fields['Exec'],
    desktopFile: filePath,
    startupWMClass: fields['StartupWMClass'] || '',
    categories: (fields['Categories'] || '').split(';').filter(Boolean),
  }
}

export async function discoverInstalledApps(): Promise<AppInfo[]> {
  const apps: AppInfo[] = []
  const seen = new Set<string>()

  for (const dir of DESKTOP_DIRS) {
    let files: string[]
    try {
      files = await readdir(dir)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith('.desktop')) continue
      if (seen.has(file)) continue
      seen.add(file)

      const filePath = join(dir, file)
      try {
        const content = await readFile(filePath, 'utf-8')
        const app = parseDesktopFile(content, filePath)
        if (app) {
          if (app.iconPath && !app.iconPath.startsWith('/')) {
            const resolved = await resolveIcon(app.iconPath, 128)
            if (resolved) app.iconPath = resolved
          }
          apps.push(app)
        }
      } catch {
        continue
      }
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name))
}
