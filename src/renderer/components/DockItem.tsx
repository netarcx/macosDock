import { useState, useRef, useCallback } from 'react'
import { Tooltip } from './Tooltip'
import { RunningIndicator } from './RunningIndicator'
import { ContextMenu } from './ContextMenu'

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
  isLaunching, draggable, locked, onDragStart, onDragOver, onDragEnd,
  onClick, onPin, onUnpin, onQuit,
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    tooltipTimeout.current = setTimeout(() => setShowTooltip(true), 500)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setShowTooltip(false)
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

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

  const iconSrc = iconPath.startsWith('/') ? `dock-icon://${encodeURIComponent(iconPath)}` : iconPath
  const scaledSize = Math.round(baseSize * scale)

  return (
    <div
      className={`dock-item ${isLaunching ? 'bouncing' : ''}`}
      style={{ width: scaledSize }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={draggable && !locked}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragEnd={onDragEnd}
    >
      <Tooltip text={name} visible={showTooltip && !contextMenu} />
      <div
        className="dock-icon-img"
        style={{
          width: scaledSize - 8,
          height: scaledSize - 8,
        }}
      >
        {iconSrc ? (
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
      {/* Always reserve space for indicator so icons align */}
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
    </div>
  )
}
