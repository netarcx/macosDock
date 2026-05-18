import { useEffect, useRef, useState } from 'react'

interface MenuItem {
  label: string
  action: () => void
  separator?: boolean
}

interface Props {
  items: MenuItem[]
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ items, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [adjustedX, setAdjustedX] = useState(x)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const overflow = rect.right - window.innerWidth
    if (overflow > 0) {
      setAdjustedX(x - overflow - 8)
    }
  }, [x])

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: adjustedX, bottom: window.innerHeight - y + 10 }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.separator && <div className="context-menu-separator" />}
          <div
            className="context-menu-item"
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
