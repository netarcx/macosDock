import { useState, useCallback } from 'react'

export function useDragReorder(
  itemIds: string[],
  onReorder: (orderedIds: string[]) => void
) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const onDragStart = useCallback((id: string) => {
    setDraggedId(id)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverId(id)
  }, [])

  const onDragEnd = useCallback(() => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const newOrder = [...itemIds]
      const fromIdx = newOrder.indexOf(draggedId)
      const toIdx = newOrder.indexOf(dragOverId)
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, draggedId)
        onReorder(newOrder)
      }
    }
    setDraggedId(null)
    setDragOverId(null)
  }, [draggedId, dragOverId, itemIds, onReorder])

  return { draggedId, dragOverId, onDragStart, onDragOver, onDragEnd }
}
