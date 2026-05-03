import { useEffect, useState, useCallback } from 'react'
import type { DockConfig, RunningApp } from '../shared/types'
import { Dock } from './components/Dock'

export default function App() {
  const [config, setConfig] = useState<DockConfig | null>(null)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([])

  useEffect(() => {
    window.dockAPI.getInstalledApps().then(() => {
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
    />
  )
}
