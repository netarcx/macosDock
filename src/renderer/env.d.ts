/// <reference types="vite/client" />

import type { DockAPI } from '../preload/index'

declare global {
  interface Window {
    dockAPI: DockAPI
  }
}
