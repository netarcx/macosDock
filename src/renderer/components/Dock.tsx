import { useRef, useCallback, useEffect, useState } from 'react'
import type { DockConfig, RunningApp } from '../../shared/types'
import { DockItem } from './DockItem'
import { DockSeparator } from './DockSeparator'
import { TrashIcon } from './TrashIcon'
import { useMagnification } from '../hooks/useMagnification'
import { useDragReorder } from '../hooks/useDragReorder'
import { useAutoHide } from '../hooks/useAutoHide'

interface Props {
  config: DockConfig
  runningApps: RunningApp[]
  onLaunch: (appId: string) => void
  onFocus: (appId: string) => void
  onQuit: (appId: string) => void
  onPin: (appId: string) => void
  onUnpin: (appId: string) => void
  onReorder: (orderedIds: string[]) => void
  onResize: (height: number) => void
}

export function Dock({
  config, runningApps, onLaunch, onFocus, onQuit, onPin, onUnpin, onReorder, onResize,
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [launchingApps, setLaunchingApps] = useState<Set<string>>(new Set())

  const { onMouseMove, onMouseLeave, getIconSize, isHovering } = useMagnification(
    config.iconSize,
    config.magnificationScale,
    config.magnification
  )

  const { visible, handleMouseEnter, handleMouseLeave } = useAutoHide(
    config.autoHide,
    config.autoHideDelay
  )

  const pinnedIds = config.pinnedItems.map(p => p.id)
  const { draggedId, onDragStart, onDragOver, onDragEnd } = useDragReorder(pinnedIds, onReorder)

  // Build the list of running-only apps (not pinned)
  const pinnedAppIds = new Set(config.pinnedItems.map(p => p.startupWMClass || p.name))
  const runningOnlyApps = runningApps.filter(app => {
    return !config.pinnedItems.some(p =>
      p.startupWMClass === app.wmClass ||
      p.name.toLowerCase() === app.wmClass.toLowerCase() ||
      p.appId.toLowerCase().includes(app.wmClass.toLowerCase())
    )
  })

  // Resize dock window when magnification is active
  useEffect(() => {
    const maxHeight = isHovering && config.magnification
      ? Math.round(config.iconSize * config.magnificationScale) + 40
      : config.iconSize + 32
    onResize(maxHeight)
  }, [isHovering, config.iconSize, config.magnificationScale, config.magnification, onResize])

  const handleClick = useCallback((appId: string, isRunning: boolean, wmClass?: string) => {
    if (isRunning) {
      onFocus(wmClass || appId)
    } else {
      setLaunchingApps(prev => new Set(prev).add(appId))
      onLaunch(appId)
      setTimeout(() => {
        setLaunchingApps(prev => {
          const next = new Set(prev)
          next.delete(appId)
          return next
        })
      }, 2000)
    }
  }, [onLaunch, onFocus])

  const isAppRunning = useCallback((item: typeof config.pinnedItems[0]) => {
    return runningApps.some(app =>
      app.wmClass === item.startupWMClass ||
      app.wmClass.toLowerCase() === item.name.toLowerCase() ||
      item.appId.toLowerCase().includes(app.wmClass.toLowerCase())
    )
  }, [runningApps])

  const getRunningInfo = useCallback((item: typeof config.pinnedItems[0]) => {
    return runningApps.find(app =>
      app.wmClass === item.startupWMClass ||
      app.wmClass.toLowerCase() === item.name.toLowerCase() ||
      item.appId.toLowerCase().includes(app.wmClass.toLowerCase())
    )
  }, [runningApps])

  const getItemCenter = (id: string): number => {
    const el = itemRefs.current.get(id)
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return rect.left + rect.width / 2
  }

  const hasRunningOnly = runningOnlyApps.length > 0

  return (
    <div
      className={`dock-container ${visible ? '' : 'dock-hidden'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { handleMouseLeave(); onMouseLeave() }}
    >
      <div
        ref={dockRef}
        className="dock-bar"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Pinned items */}
        {config.pinnedItems
          .sort((a, b) => a.position - b.position)
          .map(item => {
            const running = isAppRunning(item)
            const runInfo = getRunningInfo(item)
            const size = getIconSize(getItemCenter(item.id))
            return (
              <div
                key={item.id}
                ref={el => { if (el) itemRefs.current.set(item.id, el) }}
              >
                <DockItem
                  id={item.id}
                  name={item.name}
                  iconPath={item.iconPath}
                  size={size}
                  isRunning={running}
                  isFocused={runInfo?.isFocused || false}
                  isPinned={true}
                  isLaunching={launchingApps.has(item.appId)}
                  draggable={true}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onClick={() => handleClick(item.appId, running, runInfo?.wmClass)}
                  onPin={() => {}}
                  onUnpin={() => onUnpin(item.appId)}
                  onQuit={() => runInfo && onQuit(runInfo.wmClass)}
                />
              </div>
            )
          })}

        {/* Separator between pinned and running-only */}
        {hasRunningOnly && config.pinnedItems.length > 0 && <DockSeparator />}

        {/* Running-only apps (not pinned) */}
        {runningOnlyApps.map(app => {
          const size = getIconSize(getItemCenter(`running-${app.wmClass}`))
          return (
            <div
              key={`running-${app.wmClass}`}
              ref={el => { if (el) itemRefs.current.set(`running-${app.wmClass}`, el) }}
            >
              <DockItem
                id={`running-${app.wmClass}`}
                name={app.name}
                iconPath={app.iconPath}
                size={size}
                isRunning={true}
                isFocused={app.isFocused}
                isPinned={false}
                isLaunching={false}
                draggable={false}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDragEnd={() => {}}
                onClick={() => onFocus(app.wmClass)}
                onPin={() => onPin(app.appId)}
                onUnpin={() => {}}
                onQuit={() => onQuit(app.wmClass)}
              />
            </div>
          )
        })}

        {/* Separator before trash */}
        {config.showTrash && <DockSeparator />}

        {/* Trash */}
        {config.showTrash && (
          <TrashIcon size={getIconSize(getItemCenter('trash'))} />
        )}
      </div>
    </div>
  )
}
