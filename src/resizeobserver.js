import { useState, useRef, useCallback } from 'react'

/**
 * Hook to observe element height changes using the native ResizeObserver API.
 * Returns { height, ref } where ref is a callback ref to attach to the element.
 */
export function useResizeObserver() {
  const [height, setHeight] = useState(undefined)
  const observerRef = useRef(null)

  const ref = useCallback(node => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node) return
    observerRef.current = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height)
    })
    observerRef.current.observe(node)
  }, [])

  return { height, ref }
}
