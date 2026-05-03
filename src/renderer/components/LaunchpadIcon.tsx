import { useState, useRef, useCallback } from 'react'
import { Tooltip } from './Tooltip'

interface Props {
  baseSize: number
  scale: number
}

export function LaunchpadIcon({ baseSize, scale }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    window.dockAPI.openLaunchpad()
  }, [])

  const handleMouseEnter = () => {
    tooltipTimeout.current = setTimeout(() => setShowTooltip(true), 500)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setShowTooltip(false)
  }

  const scaledSize = Math.round(baseSize * scale)

  return (
    <div
      className="dock-item"
      style={{ width: scaledSize }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Tooltip text="Launchpad" visible={showTooltip} />
      <div
        className="dock-icon-img"
        style={{
          width: scaledSize - 8,
          height: scaledSize - 8,
        }}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="launchpad-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b7b8d" />
              <stop offset="100%" stopColor="#4a5568" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#launchpad-bg)" />
          {[0, 1, 2, 3].map(row =>
            [0, 1, 2, 3].map(col => (
              <rect
                key={`${row}-${col}`}
                x={22 + col * 22}
                y={22 + row * 22}
                width={14}
                height={14}
                rx={4}
                fill="rgba(255,255,255,0.9)"
              />
            ))
          )}
        </svg>
      </div>
      <div className="running-indicator-slot" />
    </div>
  )
}
