import { useState, useRef, useCallback, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import type { DownloadPreviewItem } from '../../shared/types'

interface Props {
  baseSize: number
  scale: number
}

const EXT_COLORS: Record<string, string> = {
  '.pdf': '#e53e3e',
  '.doc': '#2b6cb0', '.docx': '#2b6cb0',
  '.xls': '#38a169', '.xlsx': '#38a169',
  '.ppt': '#d69e2e', '.pptx': '#d69e2e',
  '.zip': '#805ad5', '.tar': '#805ad5', '.gz': '#805ad5', '.7z': '#805ad5', '.rar': '#805ad5',
  '.png': '#ed8936', '.jpg': '#ed8936', '.jpeg': '#ed8936', '.gif': '#ed8936', '.svg': '#ed8936', '.webp': '#ed8936',
  '.mp4': '#e53e3e', '.mkv': '#e53e3e', '.avi': '#e53e3e', '.mov': '#e53e3e',
  '.mp3': '#d53f8c', '.wav': '#d53f8c', '.flac': '#d53f8c',
  '.deb': '#dd6b20', '.AppImage': '#dd6b20', '.snap': '#dd6b20',
}

function getFileColor(ext: string, isDir: boolean): string {
  if (isDir) return '#4299e1'
  return EXT_COLORS[ext] || '#a0aec0'
}

export function DownloadsIcon({ baseSize, scale }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [items, setItems] = useState<DownloadPreviewItem[]>([])
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = () => window.dockAPI.getDownloadsPreview().then(setItems)
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = useCallback(() => {
    window.dockAPI.openDownloads()
  }, [])

  const handleMouseEnter = () => {
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setShowTooltip(false)
  }

  const scaledSize = Math.round(baseSize * scale)
  const iconDim = scaledSize - 8
  const stackCount = Math.min(items.length, 3)

  return (
    <div
      className="dock-item"
      style={{ width: scaledSize }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Tooltip text="Downloads" visible={showTooltip} maxWidth={scaledSize} />
      <div
        className="dock-icon-img"
        style={{ width: iconDim, height: iconDim, position: 'relative' }}
      >
        {stackCount > 0 ? (
          <>
            {items.slice(0, 3).map((item, i) => {
              const offset = (stackCount - 1 - i) * 3
              const rotation = (i - 1) * 4
              const color = getFileColor(item.iconPath, item.isDirectory)
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    bottom: offset,
                    left: '10%',
                    right: '10%',
                    height: '65%',
                    borderRadius: 4,
                    background: color,
                    transform: `rotate(${rotation}deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    overflow: 'hidden',
                  }}
                >
                  {i === stackCount - 1 && (
                    <span style={{
                      color: 'white',
                      fontSize: Math.max(8, iconDim * 0.18),
                      fontWeight: 600,
                      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {item.isDirectory ? 'DIR' : (item.iconPath.replace('.', '') || '?').slice(0, 4)}
                    </span>
                  )}
                </div>
              )
            })}
          </>
        ) : (
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
        )}
      </div>
      <div className="running-indicator-slot" />
    </div>
  )
}
