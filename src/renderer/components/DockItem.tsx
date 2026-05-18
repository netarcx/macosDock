import { useState, useRef, useCallback, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import { RunningIndicator } from './RunningIndicator'
import { ContextMenu } from './ContextMenu'
import { WindowPicker } from './WindowPicker'

interface Props {
  id: string
  name: string
  iconPath: string
  baseSize: number
  scale: number
  isRunning: boolean
  isFocused: boolean
  isPinned: boolean
  isLaunching: boolean
  draggable: boolean
  locked?: boolean
  windowIds?: number[]
  windowTitles?: string[]
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onClick: () => void
  onPin: () => void
  onUnpin: () => void
  onQuit: () => void
}

export function DockItem({
  id, name, iconPath, baseSize, scale, isRunning, isFocused, isPinned,
  isLaunching, draggable, locked, windowIds, windowTitles,
  onDragStart, onDragOver, onDragEnd,
  onClick, onPin, onUnpin, onQuit,
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showWindowPicker, setShowWindowPicker] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    }
  }, [])

  const handleMouseEnter = () => {
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setShowTooltip(false)
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseDown = useCallback(() => {
    didLongPress.current = false
    if (isRunning && windowIds && windowIds.length > 1) {
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true
        setShowWindowPicker(true)
      }, 400)
    }
  }, [isRunning, windowIds])

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (didLongPress.current) return
    onClick()
  }, [onClick])

  const getContextMenuItems = () => {
    const items = []
    if (isPinned && !isRunning) {
      items.push({ label: 'Open', action: onClick })
      if (!locked) items.push({ label: 'Unpin from Dock', action: onUnpin, separator: true })
    } else if (isPinned && isRunning) {
      if (!locked) items.push({ label: 'Unpin from Dock', action: onUnpin })
      items.push({ label: 'Quit', action: onQuit, separator: true })
    } else if (isRunning) {
      items.push({ label: 'Pin to Dock', action: onPin })
      items.push({ label: 'Quit', action: onQuit, separator: true })
    }
    return items
  }

  const hasIcon = !!iconPath
  const iconSrc = hasIcon
    ? (iconPath.startsWith('/') ? `dock-icon://${encodeURIComponent(iconPath)}` : iconPath)
    : ''
  const scaledSize = Math.round(baseSize * scale)

  return (
    <div
      className={`dock-item ${isLaunching ? 'bouncing' : ''}`}
      style={{ width: scaledSize }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={draggable && !locked}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragEnd={onDragEnd}
    >
      <Tooltip text={name} visible={showTooltip && !contextMenu && !showWindowPicker} maxWidth={scaledSize} />
      <div
        className="dock-icon-img"
        style={{
          width: scaledSize - 8,
          height: scaledSize - 8,
        }}
      >
        {hasIcon ? (
          <img
            src={iconSrc}
            alt={name}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="dock-icon-placeholder">{name[0]}</div>
        )}
      </div>
      <div className="running-indicator-slot">
        {isRunning && <RunningIndicator isFocused={isFocused} />}
      </div>
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems()}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
      {showWindowPicker && windowIds && windowTitles && (
        <WindowPicker
          windowIds={windowIds}
          windowTitles={windowTitles}
          onSelect={(wid) => {
            window.dockAPI.focusWindow(wid)
            setShowWindowPicker(false)
          }}
          onClose={() => setShowWindowPicker(false)}
        />
      )}
    </div>
  )
}
