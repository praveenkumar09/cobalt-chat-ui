import { useCallback, useEffect, useState } from 'react'

export type ViewMode = 'tech' | 'business' | 'impact'

const STORAGE_KEY = 'aia-orbit-view-mode'

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'tech'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'tech' || stored === 'business' || stored === 'impact' ? stored : 'tech'
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
