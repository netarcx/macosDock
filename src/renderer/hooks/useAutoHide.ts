import { useState, useEffect, useCallback, useRef } from 'react'

export function useAutoHide(enabled: boolean, delay: number) {
  const [visible, setVisible] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (!enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(true)
  }, [enabled])

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return
    timeoutRef.current = setTimeout(() => {
      setVisible(false)
    }, delay)
  }, [enabled, delay])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setVisible(true)
      return
    }
  }, [enabled])

  return { visible, handleMouseEnter, handleMouseLeave }
}
