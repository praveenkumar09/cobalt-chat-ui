import type { CSSProperties } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import type { GraphRelationship } from '../types'
import type { RelationshipView } from '../hooks/useRelationshipView'

interface KeyRelationshipsProps {
  relationships: GraphRelationship[]
  view: RelationshipView
}

// These reference the CSS custom properties in index.css (--n-program etc.)
// rather than literal rgb triples, so node/edge colors pick up the dark-theme
// contrast adjustments defined there automatically.
const NODE_COLOR: Record<string, string> = {
  COBOL_PROGRAM: 'var(--n-program)',
  COPYBOOK: 'var(--n-copybook)',
  DATABASE_FILE: 'var(--n-file)',
  JCL_JOB: 'var(--n-job)',
  ENTRY_POINT: 'var(--n-entry)',
}
const DEFAULT_NODE_COLOR = 'var(--tint-rgb)'

const EDGE_GROUP: Record<string, 'control' | 'data' | 'struct'> = {
  CALLS: 'control',
  EXECUTES: 'control',
  EXPOSES: 'control',
  READS: 'data',
  WRITES: 'data',
  UPDATES: 'data',
  DELETES_FROM: 'data',
  USES_DATASET: 'data',
  COPIES: 'struct',
}
const EDGE_COLOR: Record<'control' | 'data' | 'struct', string> = {
  control: 'var(--edge-control)',
  data: 'var(--edge-data)',
  struct: 'var(--edge-struct)',
}

const MAX_HUB_SPOKES = 8

function nodeColor(type: string): string {
  return NODE_COLOR[type] ?? DEFAULT_NODE_COLOR
}

function edgeColor(rel: string): string {
  return EDGE_COLOR[EDGE_GROUP[rel] ?? 'struct']
}

function NodeIcon({ type }: { type: string }) {
  switch (type) {
    case 'COBOL_PROGRAM':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 10l2.2 2-2.2 2M13 14h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'COPYBOOK':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
        </svg>
      )
    case 'DATABASE_FILE':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="6" rx="7" ry="2.6" />
          <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
          <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
        </svg>
      )
    case 'JCL_JOB':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'ENTRY_POINT':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2 4 14h6l-1 8 10-13h-6z" />
        </svg>
      )
    default:
      return null
  }
}

function NodePill({ label, type }: { label: string; type: string }) {
  return (
    <span className="node-pill" style={{ '--nc-rgb': nodeColor(type) } as CSSProperties}>
      <NodeIcon type={type} />
      {label}
    </span>
  )
}

function EdgePill({ rel }: { rel: string }) {
  return (
    <span className="edge-pill" style={{ '--ec-rgb': edgeColor(rel) } as CSSProperties}>
      {rel}
    </span>
  )
}

function ArrowIcon() {
  return (
    <svg className="rel-arrow" width="14" height="10" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 8h18M15 2l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Cards: one row per relationship, always correct regardless of shape ──
function CardsView({ relationships }: { relationships: GraphRelationship[] }) {
  return (
    <>
      {relationships.map((r, i) => (
        <div className="rel-row" key={`${r.fromId}-${r.relType}-${r.toId}-${i}`} style={{ animationDelay: `${i * 55}ms` }}>
          <NodePill label={r.fromId} type={r.fromType} />
          <ArrowIcon />
          <EdgePill rel={r.relType} />
          <ArrowIcon />
          <NodePill label={r.toId} type={r.toType} />
        </div>
      ))}
    </>
  )
}

// ── Chain: walk the relationships, merging consecutive matching endpoints
// into one flowing sequence; starts a new segment when the path breaks. ──
function ChainView({ relationships }: { relationships: GraphRelationship[] }) {
  type Step = { kind: 'node'; label: string; type: string } | { kind: 'edge'; rel: string }
  const steps: Step[] = []

  relationships.forEach((r, i) => {
    const prev = relationships[i - 1]
    const continuesChain = prev && prev.toId === r.fromId
    if (!continuesChain) {
      if (i > 0) steps.push({ kind: 'edge', rel: '···' })
      steps.push({ kind: 'node', label: r.fromId, type: r.fromType })
    }
    steps.push({ kind: 'edge', rel: r.relType })
    steps.push({ kind: 'node', label: r.toId, type: r.toType })
  })

  return (
    <div className="chain">
      {steps.map((step, i) =>
        step.kind === 'node' ? (
          <span
            key={i}
            className="node-pill"
            style={{ '--nc-rgb': nodeColor(step.type), animationDelay: `${i * 90}ms` } as CSSProperties}
          >
            <NodeIcon type={step.type} />
            {step.label}
          </span>
        ) : (
          <div className="connector" key={i} style={{ animationDelay: `${i * 90}ms` }}>
            <ArrowIcon />
            {step.rel === '···' ? <span className="chain__break">···</span> : <EdgePill rel={step.rel} />}
          </div>
        ),
      )}
    </div>
  )
}

// ── Hub: the most-connected node becomes the center; its direct
// relationships radiate out as evenly-spaced spokes. ──
function HubView({ relationships }: { relationships: GraphRelationship[] }) {
  const degree = new Map<string, number>()
  const typeOf = new Map<string, string>()
  relationships.forEach((r) => {
    degree.set(r.fromId, (degree.get(r.fromId) ?? 0) + 1)
    degree.set(r.toId, (degree.get(r.toId) ?? 0) + 1)
    typeOf.set(r.fromId, r.fromType)
    typeOf.set(r.toId, r.toType)
  })

  let centerId = relationships[0]?.fromId ?? ''
  let bestDegree = -1
  degree.forEach((count, id) => {
    if (count > bestDegree) {
      bestDegree = count
      centerId = id
    }
  })

  const spokeEdges = relationships.filter((r) => r.fromId === centerId || r.toId === centerId).slice(0, MAX_HUB_SPOKES)
  const n = spokeEdges.length || 1
  const radius = 38

  const spokes = spokeEdges.map((r, i) => {
    const isOutgoing = r.fromId === centerId
    const otherId = isOutgoing ? r.toId : r.fromId
    const angle = (i * 360) / n - 90
    const rad = (angle * Math.PI) / 180
    const x = 50 + radius * Math.cos(rad)
    const y = 50 + radius * Math.sin(rad)
    return {
      id: otherId,
      label: otherId,
      type: typeOf.get(otherId) ?? '',
      rel: r.relType,
      dir: isOutgoing ? ('out' as const) : ('in' as const),
      x,
      y,
    }
  })

  const centerLabel = centerId
  const centerType = typeOf.get(centerId) ?? ''

  return (
    <div className="hub">
      <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {spokes.map((s, i) => (
            <marker key={i} id={`arrow-${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={`rgb(${edgeColor(s.rel)})`} fillOpacity="0.7" />
            </marker>
          ))}
        </defs>
        {spokes.map((s, i) => {
          const [x1, y1, x2, y2] = s.dir === 'in' ? [s.x, s.y, 50, 50] : [50, 50, s.x, s.y]
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={`rgb(${edgeColor(s.rel)})`}
              strokeWidth="0.6"
              strokeOpacity="0.55"
              markerEnd={`url(#arrow-${i})`}
            />
          )
        })}
      </svg>

      <div className="hub-node is-center" style={{ left: '50%', top: '50%' }}>
        <NodePill label={centerLabel} type={centerType} />
      </div>

      {spokes.map((s, i) => (
        <div
          key={`node-${i}`}
          className="hub-node"
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${140 + i * 70}ms` }}
        >
          <NodePill label={s.label} type={s.type} />
        </div>
      ))}

      {spokes.map((s, i) => (
        <div
          key={`edge-${i}`}
          className="hub-edge-label"
          style={{ left: `${(s.x + 50) / 2}%`, top: `${(s.y + 50) / 2}%`, animationDelay: `${100 + i * 70}ms` }}
        >
          <EdgePill rel={s.rel} />
        </div>
      ))}
    </div>
  )
}

export function KeyRelationships({ relationships, view }: KeyRelationshipsProps) {
  if (relationships.length === 0) return null

  return (
    <CollapsibleSection label="Key relationships" count={relationships.length}>
      <div className="rel-content">
        {view === 'cards' && <CardsView relationships={relationships} />}
        {view === 'chain' && <ChainView relationships={relationships} />}
        {view === 'hub' && <HubView relationships={relationships} />}
      </div>
    </CollapsibleSection>
  )
}
