import { useCallback, useEffect, useState } from 'react'

export type ViewMode = 'tech' | 'business'

const STORAGE_KEY = 'aia-orbit-view-mode'

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'tech'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  // A previously-stored 'impact' (from the old three-view system, now merged
  // into Tech) falls through to the 'tech' default here automatically.
  return stored === 'tech' || stored === 'business' ? stored : 'tech'
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, viewMode)
  }, [viewMode])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
  }, [])

  return { viewMode, setViewMode }
}
