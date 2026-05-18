import { useRef, useLayoutEffect, useState } from 'react'

interface Props {
  text: string
  visible: boolean
  maxWidth: number
}

export function Tooltip({ text, visible, maxWidth }: Props) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(12)

  useLayoutEffect(() => {
    if (!visible || !textRef.current) return
    const el = textRef.current
    const padding = 16
    let size = 12
    el.style.fontSize = `${size}px`
    while (el.scrollWidth > maxWidth - padding && size > 7) {
      size -= 0.5
      el.style.fontSize = `${size}px`
    }
    setFontSize(size)
  }, [visible, text, maxWidth])

  if (!visible) return null

  return (
    <div className="tooltip" style={{ maxWidth }}>
      <span ref={textRef} style={{ fontSize }}>
        {text}
      </span>
    </div>
  )
}
