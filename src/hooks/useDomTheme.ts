import { useEffect, useState } from 'react'

type DomTheme = 'light' | 'dark'

function readTheme(): DomTheme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

/**
 * Tracks the app's light/dark theme by observing the data-theme attribute
 * useTheme() sets on <html>, so components outside the ChatWindow prop chain
 * (e.g. deeply nested syntax-highlighted code blocks) can react to it too.
 */
export function useDomTheme(): DomTheme {
  const [theme, setTheme] = useState<DomTheme>(readTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
