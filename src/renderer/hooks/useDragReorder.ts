import { useState, useCallback, useRef } from 'react'

export function useDragReorder(
  itemIds: string[],
  onReorder: (orderedIds: string[]) => void
) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedRef = useRef<string | null>(null)
  const dragOverRef = useRef<string | null>(null)
  const itemIdsRef = useRef(itemIds)
  itemIdsRef.current = itemIds

  const onDragStart = useCallback((id: string) => {
    draggedRef.current = id
    setDraggedId(id)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    dragOverRef.current = id
    setDragOverId(id)
  }, [])

  const onDragEnd = useCallback(() => {
    const dragged = draggedRef.current
    const over = dragOverRef.current
    if (dragged && over && dragged !== over) {
      const newOrder = [...itemIdsRef.current]
      const fromIdx = newOrder.indexOf(dragged)
      const toIdx = newOrder.indexOf(over)
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, dragged)
        onReorder(newOrder)
      }
    }
    draggedRef.current = null
    dragOverRef.current = null
    setDraggedId(null)
    setDragOverId(null)
  }, [onReorder])

  return { draggedId, dragOverId, onDragStart, onDragOver, onDragEnd }
}
