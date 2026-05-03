import { useEffect, useRef } from 'react'

interface Props {
  windowIds: number[]
  windowTitles: string[]
  onSelect: (windowId: number) => void
  onClose: () => void
}

export function WindowPicker({ windowIds, windowTitles, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} className="window-picker">
      {windowIds.map((wid, i) => (
        <div
          key={wid}
          className="window-picker-item"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(wid)
          }}
        >
          {windowTitles[i] || `Window ${i + 1}`}
        </div>
      ))}
    </div>
  )
}
