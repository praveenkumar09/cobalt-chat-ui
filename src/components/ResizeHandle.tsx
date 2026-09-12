import type { PointerEvent as ReactPointerEvent } from 'react'

interface ResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
}

export function ResizeHandle({ onPointerDown, onPointerMove, onPointerUp }: ResizeHandleProps) {
  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize chat window"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="11.5" cy="2.5" r="1.4" fill="currentColor" />
        <circle cx="11.5" cy="7" r="1.4" fill="currentColor" />
        <circle cx="7" cy="7" r="1.4" fill="currentColor" />
        <circle cx="11.5" cy="11.5" r="1.4" fill="currentColor" />
        <circle cx="7" cy="11.5" r="1.4" fill="currentColor" />
        <circle cx="2.5" cy="11.5" r="1.4" fill="currentColor" />
      </svg>
    </div>
  )
}
