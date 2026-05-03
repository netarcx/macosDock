import { useRef, useCallback, useState } from 'react'
import type { DockConfig, RunningApp } from '../../shared/types'
import { DockItem } from './DockItem'
import { DockSeparator } from './DockSeparator'
import { TrashIcon } from './TrashIcon'
import { LaunchpadIcon } from './LaunchpadIcon'
import { DownloadsIcon } from './DownloadsIcon'
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
}

export function Dock({
  config, runningApps, onLaunch, onFocus, onQuit, onPin, onUnpin, onReorder,
}: Props) {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [launchingApps, setLaunchingApps] = useState<Set<string>>(new Set())

  const { onMouseMove, onMouseLeave, getScale } = useMagnification(
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

  const runningOnlyApps = runningApps.filter(app => {
    return !config.pinnedItems.some(p =>
      p.startupWMClass === app.wmClass ||
      p.name.toLowerCase() === app.wmClass.toLowerCase() ||
      p.appId.toLowerCase().includes(app.wmClass.toLowerCase())
    )
  })

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

  const baseSize = config.iconSize

  return (
    <div
      className={`dock-container ${visible ? '' : 'dock-hidden'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { handleMouseLeave(); onMouseLeave() }}
      onMouseMove={onMouseMove}
    >
      <div className="dock-wrapper">
        {/* Fixed-size background bar */}
        <div className="dock-bar-bg" />

        {/* Icons row — overflows above the bar when magnified */}
        <div className="dock-items" onMouseLeave={onMouseLeave}>
          {config.pinnedItems
            .sort((a, b) => a.position - b.position)
            .map((item, idx) => {
              const running = isAppRunning(item)
              const runInfo = getRunningInfo(item)
              const scale = getScale(getItemCenter(item.id))
              const elements = [
                <div
                  key={item.id}
                  ref={el => { if (el) itemRefs.current.set(item.id, el) }}
                  className="dock-item-wrapper"
                >
                  <DockItem
                    id={item.id}
                    name={item.name}
                    iconPath={item.iconPath}
                    baseSize={baseSize}
                    scale={scale}
                    isRunning={running}
                    isFocused={runInfo?.isFocused || false}
                    isPinned={true}
                    isLaunching={launchingApps.has(item.appId)}
                    draggable={true}
                    locked={item.locked}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onClick={() => handleClick(item.appId, running, runInfo?.wmClass)}
                    onPin={() => {}}
                    onUnpin={() => onUnpin(item.appId)}
                    onQuit={() => runInfo && onQuit(runInfo.wmClass)}
                  />
                </div>,
              ]
              if (idx === 0) {
                elements.push(
                  <div
                    key="launchpad"
                    ref={el => { if (el) itemRefs.current.set('launchpad', el) }}
                    className="dock-item-wrapper"
                  >
                    <LaunchpadIcon baseSize={baseSize} scale={getScale(getItemCenter('launchpad'))} />
                  </div>
                )
              }
              return elements
            })}

          {runningOnlyApps.map(app => {
            const scale = getScale(getItemCenter(`running-${app.wmClass}`))
            return (
              <div
                key={`running-${app.wmClass}`}
                ref={el => { if (el) itemRefs.current.set(`running-${app.wmClass}`, el) }}
                className="dock-item-wrapper"
              >
                <DockItem
                  id={`running-${app.wmClass}`}
                  name={app.name}
                  iconPath={app.iconPath}
                  baseSize={baseSize}
                  scale={scale}
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

          {(config.showTrash || config.showDownloads) && <DockSeparator />}

          {config.showDownloads && (
            <div
              className="dock-item-wrapper"
              ref={el => { if (el) itemRefs.current.set('downloads', el) }}
            >
              <DownloadsIcon baseSize={baseSize} scale={getScale(getItemCenter('downloads'))} />
            </div>
          )}

          {config.showTrash && (
            <div
              className="dock-item-wrapper"
              ref={el => { if (el) itemRefs.current.set('trash', el) }}
            >
              <TrashIcon baseSize={baseSize} scale={getScale(getItemCenter('trash'))} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
