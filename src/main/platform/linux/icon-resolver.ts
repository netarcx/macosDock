import { access, readFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let cachedThemeChain: string[] | null = null

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function getThemeInherits(themeName: string): Promise<string[]> {
  try {
    const content = await readFile(`/usr/share/icons/${themeName}/index.theme`, 'utf-8')
    const match = content.match(/^Inherits\s*=\s*(.+)$/m)
    if (match) return match[1].split(',').map(s => s.trim()).filter(Boolean)
  } catch {}
  return []
}

async function getIconThemeChain(): Promise<string[]> {
  if (cachedThemeChain) return cachedThemeChain

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
    const themeDir = `/usr/share/icons/${theme}`
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
