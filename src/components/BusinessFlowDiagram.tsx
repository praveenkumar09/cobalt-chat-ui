import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import type { BusinessFlow } from '../types'

interface BusinessFlowDiagramProps {
  flow: BusinessFlow
  /** Signals a malformed/unrenderable graph so the caller can fall back to the list view. */
  onRenderError?: () => void
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, '#quot;')
}

function toMermaidDefinition(flow: BusinessFlow): string {
  const idByActivity = new Map<string, string>()
  let counter = 0
  const idFor = (activity: string) => {
    let id = idByActivity.get(activity)
    if (!id) {
      id = `n${counter++}`
      idByActivity.set(activity, id)
    }
    return id
  }

  const lines = ['flowchart LR']
  for (const edge of flow.edges) {
    const fromId = idFor(edge.fromActivity)
    const toId = idFor(edge.toActivity)
    lines.push(`  ${fromId}["${escapeLabel(edge.fromActivity)}"] -->|${escapeLabel(edge.relation)}| ${toId}["${escapeLabel(edge.toActivity)}"]`)
  }
  return lines.join('\n')
}

let renderCounter = 0

// Mermaid is lazy-loaded here (dynamic import) rather than a static import, so
// tech-mode users — and any business-mode message without a business flow —
// never pay for it: it's not in the main bundle at all, only fetched the first
// time a message with a real flow actually renders. Keeps this feature's cost
// isolated to the moment it's actually used, per the "no perf impact on
// existing usage" requirement.
export function BusinessFlowDiagram({ flow, onRenderError }: BusinessFlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    if (flow.edges.length === 0) return
    let cancelled = false

    import('mermaid')
      .then(async (mod) => {
        if (cancelled) return
        const mermaid = mod.default
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'strict',
          flowchart: { curve: 'basis' },
        })
        const id = `business-flow-${renderCounter++}`
        const definition = toMermaidDefinition(flow)
        const { svg } = await mermaid.render(id, definition)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          onRenderError?.()
        }
      })

    return () => {
      cancelled = true
    }
  }, [flow, theme, onRenderError])

  if (flow.edges.length === 0 || failed) return null

  return <div className="business-flow-diagram" ref={containerRef} aria-label="Business flow diagram" />
}
