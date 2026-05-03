import { access } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let cachedTheme: string | null = null

async function getIconTheme(): Promise<string> {
  if (cachedTheme) return cachedTheme
  try {
    const { stdout } = await execFileAsync('gsettings', [
      'get', 'org.gnome.desktop.interface', 'icon-theme'
    ])
    cachedTheme = stdout.trim().replace(/'/g, '')
    return cachedTheme
  } catch {
    return 'hicolor'
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const SIZES = [128, 256, 96, 64, 48, 512]
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

  const theme = await getIconTheme()
  const sortedSizes = [...SIZES].sort((a, b) => {
    return Math.abs(a - preferredSize) - Math.abs(b - preferredSize)
  })

  const themeDirs = [
    `/usr/share/icons/${theme}`,
    '/usr/share/icons/hicolor',
  ]

  for (const size of sortedSizes) {
    for (const themeDir of themeDirs) {
      for (const ext of EXTENSIONS) {
        const path = `${themeDir}/${size}x${size}/apps/${iconName}.${ext}`
        if (await fileExists(path)) return path
      }
      for (const ext of EXTENSIONS) {
        const scalablePath = `${themeDir}/scalable/apps/${iconName}.${ext}`
        if (await fileExists(scalablePath)) return scalablePath
      }
    }
  }

  for (const ext of EXTENSIONS) {
    const pixmapPath = `/usr/share/pixmaps/${iconName}.${ext}`
    if (await fileExists(pixmapPath)) return pixmapPath
  }

  const snapGlob = `/snap/${iconName}/current/meta/gui/icon.*`
  for (const ext of EXTENSIONS) {
    const snapPath = `/snap/${iconName}/current/meta/gui/icon.${ext}`
    if (await fileExists(snapPath)) return snapPath
  }

  return null
}
