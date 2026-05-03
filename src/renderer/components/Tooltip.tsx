import { useRef, useEffect, useState } from 'react'

interface Props {
  text: string
  visible: boolean
  maxWidth: number
}

export function Tooltip({ text, visible, maxWidth }: Props) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(12)

  useEffect(() => {
    if (!visible || !textRef.current) return
    let size = 12
    textRef.current.style.fontSize = `${size}px`
    const padding = 16
    while (textRef.current.scrollWidth > maxWidth - padding && size > 7) {
      size -= 0.5
      textRef.current.style.fontSize = `${size}px`
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
