import type { Stage } from '../types'

const STAGE_LABELS: Record<Stage, string> = {
  thinking: 'Thinking',
  retrieving: 'Retrieving COBOL context',
  generating: 'Generating response',
}

interface StatusShimmerProps {
  stage: Stage
}

export function StatusShimmer({ stage }: StatusShimmerProps) {
  return (
    <span className="status-shimmer">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{STAGE_LABELS[stage]}…</span>
    </span>
  )
}
