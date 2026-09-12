import { useCallback, useEffect, useState } from 'react'

export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

const STORAGE_KEY = 'aia-orbit-font-size'
const CSS_VAR = '--chat-font-scale'

const SCALES: Record<FontSize, number> = {
  sm: 0.88,
  md: 1,
  lg: 1.15,
  xl: 1.3,
}

export const FONT_SIZE_ORDER: FontSize[] = ['sm', 'md', 'lg', 'xl']

function getInitialFontSize(): FontSize {
  if (typeof window === 'undefined') return 'md'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'sm' || stored === 'md' || stored === 'lg' || stored === 'xl') return stored
  return 'md'
}

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSize>(getInitialFontSize)

  useEffect(() => {
    document.documentElement.style.setProperty(CSS_VAR, String(SCALES[fontSize]))
    window.localStorage.setItem(STORAGE_KEY, fontSize)
  }, [fontSize])

  const cycleFontSize = useCallback(() => {
    setFontSize((prev) => {
      const nextIndex = (FONT_SIZE_ORDER.indexOf(prev) + 1) % FONT_SIZE_ORDER.length
      return FONT_SIZE_ORDER[nextIndex]
    })
  }, [])

  return { fontSize, setFontSize, cycleFontSize }
}
