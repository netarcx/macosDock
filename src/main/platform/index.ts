import type { PlatformAdapter } from './types'
import { LinuxAdapter } from './linux/index'

export function createPlatformAdapter(): PlatformAdapter {
  switch (process.platform) {
    case 'linux':
      return new LinuxAdapter()
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

export type { PlatformAdapter }
