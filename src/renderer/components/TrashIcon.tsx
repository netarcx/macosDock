import { useState, useEffect, useRef, useCallback } from 'react'
import { Tooltip } from './Tooltip'

interface Props {
  baseSize: number
  scale: number
}

export function TrashIcon({ baseSize, scale }: Props) {
  const [isEmpty, setIsEmpty] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const check = () => window.dockAPI.getTrashStatus().then(setIsEmpty)
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = useCallback(() => {
    window.dockAPI.openTrash()
  }, [])

  const handleMouseEnter = () => {
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setShowTooltip(false)
  }

  const scaledSize = Math.round(baseSize * scale)

  return (
    <div
      className="dock-item trash-icon"
      style={{ width: scaledSize }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Tooltip text="Trash" visible={showTooltip} maxWidth={scaledSize} />
      <div
        className="dock-icon-img trash-svg"
        style={{
          width: scaledSize - 8,
          height: scaledSize - 8,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
          {!isEmpty && (
            <>
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </>
          )}
        </svg>
      </div>
      <div className="running-indicator-slot" />
    </div>
  )
}
