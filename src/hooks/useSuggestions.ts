import { useEffect, useState } from 'react'
import { fetchSuggestions } from '../api/ragClient'

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetchSuggestions(controller.signal)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  return { suggestions, loading }
}
