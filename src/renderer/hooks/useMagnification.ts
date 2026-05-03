import { useState, useCallback, useRef } from 'react'

interface MagnificationState {
  mouseX: number | null
  isHovering: boolean
}

export function useMagnification(
  baseSize: number,
  maxScale: number,
  enabled: boolean
) {
  const [state, setState] = useState<MagnificationState>({
    mouseX: null,
    isHovering: false,
  })
  const rafRef = useRef<number | null>(null)

  const INFLUENCE_RADIUS = 200

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enabled) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setState({ mouseX: e.clientX, isHovering: true })
    })
  }, [enabled])

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setState({ mouseX: null, isHovering: false })
  }, [])

  const getIconSize = useCallback((iconCenterX: number): number => {
    if (!enabled || state.mouseX === null || !state.isHovering) {
      return baseSize
    }

    const distance = Math.abs(state.mouseX - iconCenterX)
    if (distance >= INFLUENCE_RADIUS) return baseSize

    const ratio = distance / INFLUENCE_RADIUS
    const scale = 1 + (maxScale - 1) * Math.pow(Math.cos(ratio * Math.PI / 2), 2)
    return Math.round(baseSize * scale)
  }, [baseSize, maxScale, enabled, state.mouseX, state.isHovering])

  return { onMouseMove, onMouseLeave, getIconSize, isHovering: state.isHovering }
}
