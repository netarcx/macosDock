import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { AppInfo } from '../../../shared/types'
import { resolveIcon } from './icon-resolver'

const DESKTOP_DIRS = [
  join(homedir(), '.local/share/applications'),
  '/usr/local/share/applications',
  '/usr/share/applications',
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

async function readdirRecursive(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (entry.endsWith('.desktop')) {
      results.push(fullPath)
    } else if (!entry.includes('.')) {
      const sub = await readdirRecursive(fullPath)
      results.push(...sub)
    }
  }
  return results
}

export async function discoverInstalledApps(): Promise<AppInfo[]> {
  const apps: AppInfo[] = []
  const seen = new Set<string>()

  for (const dir of DESKTOP_DIRS) {
    const files = await readdirRecursive(dir)

    for (const filePath of files) {
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
      if (seen.has(fileName)) continue
      seen.add(fileName)

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
