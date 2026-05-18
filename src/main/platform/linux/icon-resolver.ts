import { access, readFile } from 'fs/promises'
import { execFile } from 'child_process'
import { join } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let cachedThemeChain: string[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 30 * 60 * 1000

const ICON_BASE_DIRS = [
  join(homedir(), '.local/share/icons'),
  join(homedir(), '.icons'),
  '/usr/local/share/icons',
  '/usr/share/icons',
]

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function getThemeInherits(themeName: string): Promise<string[]> {
  for (const baseDir of ICON_BASE_DIRS) {
    try {
      const content = await readFile(join(baseDir, themeName, 'index.theme'), 'utf-8')
      const match = content.match(/^Inherits\s*=\s*(.+)$/m)
      if (match) return match[1].split(',').map(s => s.trim()).filter(Boolean)
    } catch {}
  }
  return []
}

async function getIconThemeChain(): Promise<string[]> {
  if (cachedThemeChain && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedThemeChain
  }

  let currentTheme = 'hicolor'
  try {
    const { stdout } = await execFileAsync('gsettings', [
      'get', 'org.gnome.desktop.interface', 'icon-theme'
    ])
    currentTheme = stdout.trim().replace(/'/g, '')
  } catch {}

  const chain: string[] = [currentTheme]
  const visited = new Set([currentTheme])
  const queue = [currentTheme]

  while (queue.length > 0) {
    const theme = queue.shift()!
    const parents = await getThemeInherits(theme)
    for (const parent of parents) {
      if (!visited.has(parent)) {
        visited.add(parent)
        chain.push(parent)
        queue.push(parent)
      }
    }
  }

  if (!visited.has('hicolor')) chain.push('hicolor')
  cachedThemeChain = chain
  cacheTimestamp = Date.now()
  return chain
}

const SIZES = [256, 128, 96, 64, 48, 512]
const EXTENSIONS = ['png', 'svg']

export async function resolveIcon(iconName: string, preferredSize: number): Promise<string | null> {
  if (iconName.startsWith('/')) {
    if (await fileExists(iconName)) return iconName
    return null
  }

  const dotIdx = iconName.lastIndexOf('.')
  if (dotIdx !== -1 && EXTENSIONS.includes(iconName.substring(dotIdx + 1))) {
    iconName = iconName.substring(0, dotIdx)
  }

  const themeChain = await getIconThemeChain()
  const sortedSizes = [...SIZES].sort((a, b) => {
    return Math.abs(a - preferredSize) - Math.abs(b - preferredSize)
  })

  for (const theme of themeChain) {
    for (const baseDir of ICON_BASE_DIRS) {
      const themeDir = join(baseDir, theme)
      for (const size of sortedSizes) {
        for (const ext of EXTENSIONS) {
          const path = `${themeDir}/${size}x${size}/apps/${iconName}.${ext}`
          if (await fileExists(path)) return path
        }
      }
      for (const ext of EXTENSIONS) {
        const path = `${themeDir}/scalable/apps/${iconName}.${ext}`
        if (await fileExists(path)) return path
      }
    }
  }

  for (const ext of EXTENSIONS) {
    const pixmapPath = `/usr/share/pixmaps/${iconName}.${ext}`
    if (await fileExists(pixmapPath)) return pixmapPath
  }

  for (const ext of EXTENSIONS) {
    const snapPath = `/snap/${iconName}/current/meta/gui/icon.${ext}`
    if (await fileExists(snapPath)) return snapPath
  }

  return null
}
