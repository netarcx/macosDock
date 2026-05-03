import { useEffect, useState, useCallback } from 'react'
import type { DockConfig, DockItemConfig, RunningApp } from '../shared/types'
import { Dock } from './components/Dock'

export default function App() {
  const [config, setConfig] = useState<DockConfig | null>(null)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([])

  useEffect(() => {
    // Trigger app discovery (sets up default pins on first launch)
    window.dockAPI.getInstalledApps().then(() => {
      // Now load config (which may have been updated with default pins)
      window.dockAPI.getConfig().then(setConfig)
    })
    window.dockAPI.getRunningApps().then(setRunningApps)

    const cleanup = window.dockAPI.onRunningAppsChanged(setRunningApps)
    return cleanup
  }, [])

  const handleLaunch = useCallback((appId: string) => {
    window.dockAPI.launchApp(appId)
  }, [])

  const handleFocus = useCallback((appId: string) => {
    window.dockAPI.focusApp(appId)
  }, [])

  const handleQuit = useCallback((appId: string) => {
    window.dockAPI.quitApp(appId)
  }, [])

  const handlePin = useCallback((appId: string) => {
    window.dockAPI.pinApp(appId).then(() => {
      window.dockAPI.getConfig().then(setConfig)
    })
  }, [])

  const handleUnpin = useCallback((appId: string) => {
    window.dockAPI.unpinApp(appId).then(() => {
      window.dockAPI.getConfig().then(setConfig)
    })
  }, [])

  const handleReorder = useCallback((orderedIds: string[]) => {
    window.dockAPI.reorderPinned(orderedIds).then(() => {
      window.dockAPI.getConfig().then(setConfig)
    })
  }, [])

  const handleResize = useCallback((height: number) => {
    window.dockAPI.resizeDock(height)
  }, [])

  if (!config) return null

  return (
    <Dock
      config={config}
      runningApps={runningApps}
      onLaunch={handleLaunch}
      onFocus={handleFocus}
      onQuit={handleQuit}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onReorder={handleReorder}
      onResize={handleResize}
    />
  )
}
