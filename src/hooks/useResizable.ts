import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface Size {
  width: number
  height: number
}

const MIN: Size = { width: 320, height: 420 }
const DEFAULT: Size = { width: 480, height: 760 }
const VIEWPORT_MARGIN = 48

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getMax(): Size {
  return {
    width: Math.max(MIN.width, window.innerWidth - VIEWPORT_MARGIN),
    height: Math.max(MIN.height, window.innerHeight - VIEWPORT_MARGIN),
  }
}

export function useResizable() {
  const [size, setSize] = useState<Size>(() => {
    const max = getMax()
    return { width: clamp(DEFAULT.width, MIN.width, max.width), height: clamp(DEFAULT.height, MIN.height, max.height) }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; width: number; height: number; max: Size } | null>(null)

  useEffect(() => {
    const onResize = () => {
      const max = getMax()
      setSize((current) => ({
        width: clamp(current.width, MIN.width, max.width),
        height: clamp(current.height, MIN.height, max.height),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height, max: getMax() }
      setIsDragging(true)
    },
    [size],
  )

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const rawWidth = drag.width + (e.clientX - drag.x)
    const rawHeight = drag.height + (e.clientY - drag.y)
    setSize({
      width: clamp(rawWidth, MIN.width, drag.max.width),
      height: clamp(rawHeight, MIN.height, drag.max.height),
    })
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setIsDragging(false)
  }, [])

  return {
    size,
    isDragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp },
  }
}
