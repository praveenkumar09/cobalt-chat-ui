import { useCallback, useEffect, useState } from 'react'

export type RelationshipView = 'cards' | 'chain' | 'hub'

const STORAGE_KEY = 'aia-orbit-relationship-view'

function getInitialView(): RelationshipView {
  if (typeof window === 'undefined') return 'cards'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'cards' || stored === 'chain' || stored === 'hub' ? stored : 'cards'
}

export function useRelationshipView() {
  const [relationshipView, setRelationshipViewState] = useState<RelationshipView>(getInitialView)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, relationshipView)
  }, [relationshipView])

  const setRelationshipView = useCallback((view: RelationshipView) => {
    setRelationshipViewState(view)
  }, [])

  return { relationshipView, setRelationshipView }
}
