import { useCallback, useRef, useState } from 'react'

export function useMagnification(
  baseSize: number,
  maxScale: number,
  enabled: boolean
) {
  const mouseXRef = useRef<number | null>(null)
  const hoveringRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const [, setTick] = useState(0)

  const INFLUENCE_RADIUS = 200

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enabled) return
    mouseXRef.current = e.clientX
    hoveringRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setTick(t => t + 1)
    })
  }, [enabled])

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mouseXRef.current = null
    hoveringRef.current = false
    setTick(t => t + 1)
  }, [])

  const getScale = useCallback((iconCenterX: number): number => {
    if (!enabled || mouseXRef.current === null || !hoveringRef.current) {
      return 1
    }

    const distance = Math.abs(mouseXRef.current - iconCenterX)
    if (distance >= INFLUENCE_RADIUS) return 1

    const ratio = distance / INFLUENCE_RADIUS
    return 1 + (maxScale - 1) * Math.pow(Math.cos(ratio * Math.PI / 2), 2)
  }, [maxScale, enabled])

  return { onMouseMove, onMouseLeave, getScale, isHovering: hoveringRef.current }
}
