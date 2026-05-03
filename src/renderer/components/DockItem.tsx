import { useState, useRef, useCallback } from 'react'
import { Tooltip } from './Tooltip'
import { RunningIndicator } from './RunningIndicator'
import { ContextMenu } from './ContextMenu'

interface Props {
  id: string
  name: string
  iconPath: string
  size: number
  isRunning: boolean
  isFocused: boolean
  isPinned: boolean
  isLaunching: boolean
  draggable: boolean
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onClick: () => void
  onPin: () => void
  onUnpin: () => void
  onQuit: () => void
}

export function DockItem({
  id, name, iconPath, size, isRunning, isFocused, isPinned,
  isLaunching, draggable, onDragStart, onDragOver, onDragEnd,
  onClick, onPin, onUnpin, onQuit,
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

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
      items.push({ label: 'Unpin from Dock', action: onUnpin, separator: true })
    } else if (isPinned && isRunning) {
      items.push({ label: 'Unpin from Dock', action: onUnpin })
      items.push({ label: 'Quit', action: onQuit, separator: true })
    } else if (isRunning) {
      items.push({ label: 'Pin to Dock', action: onPin })
      items.push({ label: 'Quit', action: onQuit, separator: true })
    }
    return items
  }

  const iconSrc = iconPath.startsWith('/') ? `file://${iconPath}` : iconPath

  return (
    <div
      ref={itemRef}
      className={`dock-item ${isLaunching ? 'bouncing' : ''} ${isFocused ? 'focused' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={draggable}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragEnd={onDragEnd}
    >
      <Tooltip text={name} visible={showTooltip && !contextMenu} />
      <div className="dock-icon-img" style={{ width: size - 8, height: size - 8 }}>
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
      {isRunning && <RunningIndicator isFocused={isFocused} />}
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
