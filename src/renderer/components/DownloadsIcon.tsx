import { useState, useRef, useCallback } from 'react'
import { Tooltip } from './Tooltip'

interface Props {
  baseSize: number
  scale: number
}

export function DownloadsIcon({ baseSize, scale }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    window.dockAPI.openDownloads()
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
      <Tooltip text="Downloads" visible={showTooltip} />
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
            <linearGradient id="downloads-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b9bd5" />
              <stop offset="100%" stopColor="#2b6cb0" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#downloads-bg)" />
          <path
            d="M60 28v40M60 68l-16-16M60 68l16-16"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 80v12a4 4 0 004 4h48a4 4 0 004-4V80"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="running-indicator-slot" />
    </div>
  )
}
